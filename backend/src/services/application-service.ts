import { Decimal128, ObjectId } from "mongodb";
import type { ClientSession } from "mongodb";
import type {
  ApplicationDto,
  ApplicationStatus,
  CreateDraftRequestDto,
  DraftUpdateRequestDto,
} from "@insurance/contracts";
import type { ApplicationRepository } from "../database/application-repository.js";
import type { IdempotencyRepository } from "../database/idempotency-repository.js";
import { requireRole, type Principal } from "../domain/authorization.js";
import {
  ConflictError,
  DomainValidationError,
  ForbiddenError,
} from "../domain/errors.js";
import {
  parseIdempotencyKey,
  requestFingerprint,
} from "../domain/idempotency.js";
import {
  validateDraftTrigger,
  validateRequiredSupplemental,
  validateSupplementalPatch,
} from "../domain/supplemental.js";
import type { ProductService } from "./product-service.js";
import { runInTransaction } from "../database/transactions.js";
import type { MongoClient } from "mongodb";
import type { ApplicationDocument } from "../models/persistence.js";

const oid = (value: string) =>
  ObjectId.isValid(value) ? new ObjectId(value) : null;
function normalizeSnapshot(value: unknown): unknown {
  if (value instanceof Decimal128) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeSnapshot);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        normalizeSnapshot(item),
      ]),
    );
  return value;
}

function snapshotDto(value: unknown): Readonly<Record<string, unknown>> {
  return normalizeSnapshot(value) as Readonly<Record<string, unknown>>;
}

function responseApplicationId(value: unknown): ObjectId {
  if (!value || typeof value !== "object") {
    throw new ConflictError("The idempotent response is invalid.");
  }
  const applicationId = (value as Record<string, unknown>).applicationId;
  if (typeof applicationId !== "string" || !ObjectId.isValid(applicationId)) {
    throw new ConflictError("The idempotent response is invalid.");
  }
  return new ObjectId(applicationId);
}

export const applicationDto = (d: ApplicationDocument): ApplicationDto => ({
  id: d._id.toHexString(),
  userId: d.userId.toHexString(),
  productId: d.productId.toHexString(),
  productVersionId: d.productVersionId.toHexString(),
  ...(d.selectedInsuranceType
    ? { selectedInsuranceType: d.selectedInsuranceType }
    : {}),
  status: d.status,
  version: d.version,
  supplementalData: d.supplementalData,
  createdAt: d.createdAt.toISOString(),
  updatedAt: d.updatedAt.toISOString(),
  ...(d.profileSnapshot
    ? { profileSnapshot: snapshotDto(d.profileSnapshot) }
    : {}),
  ...(d.productSnapshot
    ? { productSnapshot: snapshotDto(d.productSnapshot) }
    : {}),
  ...(d.premiumSnapshot
    ? { premiumSnapshot: snapshotDto(d.premiumSnapshot) }
    : {}),
  ...(d.reviewerId ? { reviewerId: d.reviewerId.toHexString() } : {}),
  ...(d.rejectionReason ? { rejectionReason: d.rejectionReason } : {}),
  ...(d.submittedAt ? { submittedAt: d.submittedAt.toISOString() } : {}),
  ...(d.reviewStartedAt
    ? { reviewStartedAt: d.reviewStartedAt.toISOString() }
    : {}),
  ...(d.approvedAt ? { approvedAt: d.approvedAt.toISOString() } : {}),
  ...(d.rejectedAt ? { rejectedAt: d.rejectedAt.toISOString() } : {}),
});

export class ApplicationService {
  constructor(
    private readonly apps: ApplicationRepository,
    private readonly idempotency: IdempotencyRepository,
    private readonly products: ProductService,
    private readonly now: () => Date = () => new Date(),
    private readonly client?: MongoClient,
  ) {}

  async createDraft(
    principal: Principal,
    input: CreateDraftRequestDto,
    keyHeader?: string,
  ) {
    requireRole(principal, ["USER"]);
    const key = parseIdempotencyKey(keyHeader);
    const productId = oid(input.productId);
    if (!productId) throw new DomainValidationError("Invalid product id.");
    const eligible = await this.products.eligibleProduct(
      principal,
      input.productId,
    );
    if (
      input.productVersionId &&
      input.productVersionId !== eligible.version._id.toHexString()
    )
      throw new ConflictError("The product version is no longer current.");
    const trigger = validateDraftTrigger(
      eligible.version.supplementalSchema,
      eligible.version.insuranceTypes,
      input.trigger,
    );
    const fp = requestFingerprint(input);
    const applicationId = new ObjectId();
    const command = async (session?: ClientSession) => {
      const reserved = await this.idempotency.reserve(
        {
          actorId: new ObjectId(principal.id),
          commandScope: "CREATE_APPLICATION_DRAFT",
          key,
          requestFingerprint: fp,
          responseReference: { applicationId: applicationId.toHexString() },
          createdAt: this.now(),
          expiresAt: new Date(this.now().getTime() + 86400000),
        },
        session,
      );
      if (reserved.reused) {
        const existing = await this.apps.findOwnedById(
          new ObjectId(principal.id),
          responseApplicationId(reserved.responseReference),
          session,
        );
        if (!existing)
          throw new ConflictError(
            "The idempotent draft could not be recovered.",
          );
        return { application: applicationDto(existing), reused: true };
      }
      const document = await this.apps.createDraft(
        {
          id: applicationId,
          userId: new ObjectId(principal.id),
          productId,
          productVersionId: eligible.version._id,
          selectedInsuranceType: trigger.selectedInsuranceType,
          supplementalData: trigger.supplementalData,
          now: this.now(),
        },
        session,
      );
      return { application: applicationDto(document), reused: false };
    };
    return this.client ? runInTransaction(this.client, command) : command();
  }

  async list(principal: Principal, status?: ApplicationStatus) {
    requireRole(principal, ["USER"]);
    return this.apps.listForUser({
      userId: new ObjectId(principal.id),
      status,
    });
  }
  async submit(principal: Principal, id: string, keyHeader?: string) {
    requireRole(principal, ["USER"]);
    const key = parseIdempotencyKey(keyHeader);
    const appId = oid(id);
    if (!appId) throw new DomainValidationError("Invalid application id.");
    const current = await this.apps.findOwnedById(
      new ObjectId(principal.id),
      appId,
    );
    if (!current) throw new DomainValidationError("Application not found.");
    if (current.status !== "DRAFT")
      return { application: applicationDto(current), reused: true };
    const eligible = await this.products.eligibleProduct(
      principal,
      current.productId.toHexString(),
    );
    if (
      !current.selectedInsuranceType ||
      !eligible.version.insuranceTypes.includes(current.selectedInsuranceType)
    )
      throw new DomainValidationError(
        "Choose a valid insurance type before applying.",
      );
    validateRequiredSupplemental(
      eligible.version.supplementalSchema,
      current.supplementalData as Record<string, unknown>,
    );
    const fp = requestFingerprint({
      applicationId: id,
      version: current.version,
    });
    const command = async (session?: ClientSession) => {
      const reserved = await this.idempotency.reserve(
        {
          actorId: new ObjectId(principal.id),
          commandScope: "SUBMIT_APPLICATION",
          key,
          requestFingerprint: fp,
          responseReference: { applicationId: id },
          createdAt: this.now(),
          expiresAt: new Date(this.now().getTime() + 86400000),
        },
        session,
      );
      if (reserved.reused) {
        const existing = await this.apps.findOwnedById(
          new ObjectId(principal.id),
          appId,
          session,
        );
        if (!existing)
          throw new ConflictError(
            "Submitted application could not be recovered.",
          );
        return { application: applicationDto(existing), reused: true };
      }
      const updated = await this.apps.submitDraft(
        {
          userId: new ObjectId(principal.id),
          id: appId,
          version: current.version,
          profileSnapshot: {
            age: eligible.profile.age,
            sumAssured: eligible.profile.sumAssured,
            paymentFrequency: eligible.profile.paymentFrequency,
            paymentMethod: eligible.profile.paymentMethod,
          },
          productSnapshot: {
            id: eligible.product._id.toHexString(),
            name: eligible.product.name,
            version: eligible.version.version,
            insuranceTypes: eligible.version.insuranceTypes,
            description: eligible.version.description,
            coverage: eligible.version.coverage,
            benefits: eligible.version.benefits,
            limitations: eligible.version.limitations,
            supplementalSchemaVersion:
              eligible.version.supplementalSchema.version,
          },
          premiumSnapshot: {
            amount: Decimal128.fromString(eligible.premium.amount),
            currency: eligible.premium.currency,
            paymentFrequency: eligible.premium.paymentFrequency,
            ratingVersion: eligible.version.ratingConfig.version,
            calculatedAt: this.now(),
          },
          now: this.now(),
        },
        session,
      );
      if (!updated)
        throw new ConflictError(
          "Draft changed elsewhere; reload before applying.",
        );
      return { application: applicationDto(updated), reused: false };
    };
    return this.client ? runInTransaction(this.client, command) : command();
  }
  async get(principal: Principal, id: string) {
    requireRole(principal, ["USER"]);
    const appId = oid(id);
    if (!appId) throw new DomainValidationError("Invalid application id.");
    const d = await this.apps.findOwnedById(new ObjectId(principal.id), appId);
    if (!d) throw new DomainValidationError("Application not found.");
    return { application: applicationDto(d) };
  }
  async update(principal: Principal, id: string, input: DraftUpdateRequestDto) {
    requireRole(principal, ["USER"]);
    const appId = oid(id);
    if (!appId || !Number.isInteger(input.version))
      throw new DomainValidationError("Invalid draft update.");
    const current = await this.apps.findOwnedById(
      new ObjectId(principal.id),
      appId,
    );
    if (!current || current.status !== "DRAFT")
      throw new ForbiddenError("Only your draft applications can be edited.");
    const eligible = await this.products.eligibleProduct(
      principal,
      current.productId.toHexString(),
    );
    if (
      input.selectedInsuranceType &&
      !eligible.version.insuranceTypes.includes(input.selectedInsuranceType)
    )
      throw new DomainValidationError(
        "The selected insurance type is not available.",
      );
    const patch = input.supplementalData ?? {};
    validateSupplementalPatch(eligible.version.supplementalSchema, patch);
    const merged = { ...current.supplementalData, ...patch };
    const updated = await this.apps.updateDraft({
      userId: new ObjectId(principal.id),
      id: appId,
      version: input.version,
      set: {
        ...(input.selectedInsuranceType
          ? { selectedInsuranceType: input.selectedInsuranceType }
          : {}),
        supplementalData: merged,
      },
      now: this.now(),
    });
    if (!updated)
      throw new ConflictError("Draft changed elsewhere; reload before saving.");
    return { application: applicationDto(updated) };
  }
  async remove(principal: Principal, id: string) {
    requireRole(principal, ["USER"]);
    const appId = oid(id);
    if (!appId) throw new DomainValidationError("Invalid application id.");
    const deleted = await this.apps.deleteDraft(
      new ObjectId(principal.id),
      appId,
      this.now(),
    );
    if (!deleted)
      throw new ForbiddenError("Only your draft applications can be deleted.");
  }
}
