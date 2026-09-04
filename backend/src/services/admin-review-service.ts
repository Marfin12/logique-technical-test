import { ObjectId, type ClientSession, type MongoClient } from "mongodb";
import type {
  AdminApplicationDetailDto,
  AdminApplicationListItemDto,
  AdminProfileResponseDto,
  ApplicationStatusEventDto,
  PaymentFrequency,
} from "@insurance/contracts";
import type { ApplicationRepository } from "../database/application-repository.js";
import type { ProfileRepository } from "../database/profile-repository.js";
import type { ProductRepository } from "../database/product-repository.js";
import { runInTransaction } from "../database/transactions.js";
import type { UserRepository } from "../database/user-repository.js";
import { requireRole, type Principal } from "../domain/authorization.js";
import {
  ConflictError,
  DomainValidationError,
  NotFoundError,
} from "../domain/errors.js";
import { moneyToDto } from "../domain/money.js";
import { applicationDto } from "./application-service.js";

const objectId = (value: string) =>
  ObjectId.isValid(value) ? new ObjectId(value) : null;
export class AdminReviewService {
  constructor(
    private readonly applications: ApplicationRepository,
    private readonly users: UserRepository,
    private readonly profiles: ProfileRepository,
    private readonly products: ProductRepository,
    private readonly client?: MongoClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(
    principal: Principal,
  ): Promise<{ items: AdminApplicationListItemDto[] }> {
    requireRole(principal, ["ADMIN"]);
    const documents = await this.applications.listAdminQueue();
    const users = await this.users.findByIds(
      documents.map((item) => item.userId),
    );
    const products = await this.products.findByIds(
      documents.map((item) => item.productId),
    );
    const userMap = new Map(
      users.map((item) => [item._id.toHexString(), item]),
    );
    const productMap = new Map(
      products.map((item) => [item._id.toHexString(), item.name]),
    );
    return {
      items: documents.map((item) => {
        const base = applicationDto(item);
        const frequency = item.premiumSnapshot?.paymentFrequency as
          | PaymentFrequency
          | undefined;
        return {
          ...base,
          applicantName:
            userMap.get(item.userId.toHexString())?.displayName ??
            "Unknown applicant",
          applicantUsername:
            userMap.get(item.userId.toHexString())?.normalizedEmail ??
            "unknown",
          ...(productMap.get(item.productId.toHexString())
            ? { productName: productMap.get(item.productId.toHexString()) }
            : {}),
          ...(frequency ? { paymentFrequency: frequency } : {}),
        };
      }),
    };
  }

  async detail(
    principal: Principal,
    id: string,
  ): Promise<AdminApplicationDetailDto> {
    requireRole(principal, ["ADMIN"]);
    const parsed = objectId(id);
    if (!parsed) throw new NotFoundError();
    const application = await this.applications.findAdminVisibleById(parsed);
    if (!application) throw new NotFoundError();
    const applicant = await this.users.findById(
      application.userId.toHexString(),
    );
    if (!applicant) throw new NotFoundError();
    const history = await this.applications.statusHistory(parsed);
    return {
      application: applicationDto(application),
      applicant: {
        id: applicant._id.toHexString(),
        displayName: applicant.displayName,
        username: applicant.normalizedEmail,
      },
      statusHistory: history.map(
        (event): ApplicationStatusEventDto => ({
          id: event._id.toHexString(),
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          actorId: event.actorId.toHexString(),
          actorRole: event.actorRole,
          ...(event.reason ? { reason: event.reason } : {}),
          createdAt: event.createdAt.toISOString(),
        }),
      ),
    };
  }

  async profile(
    principal: Principal,
    userId: string,
  ): Promise<AdminProfileResponseDto> {
    requireRole(principal, ["ADMIN"]);
    const applicant = await this.users.findById(userId);
    if (!applicant || applicant.role !== "USER") throw new NotFoundError();
    const profile = await this.profiles.findByUserId(userId);
    return {
      applicant: {
        id: applicant._id.toHexString(),
        displayName: applicant.displayName,
        username: applicant.normalizedEmail,
      },
      profile: profile
        ? {
            age: profile.age,
            sumAssured: moneyToDto({
              amount: profile.sumAssured,
              currency: profile.currency,
            }),
            paymentFrequency: profile.paymentFrequency,
            paymentMethod: profile.paymentMethod,
            version: profile.version,
            updatedAt: profile.updatedAt.toISOString(),
          }
        : null,
    };
  }

  async transition(
    principal: Principal,
    id: string,
    action: "START_REVIEW" | "APPROVE" | "REJECT",
    reason?: unknown,
  ) {
    requireRole(principal, ["ADMIN"]);
    const parsed = objectId(id);
    if (!parsed) throw new NotFoundError();
    const trimmed = typeof reason === "string" ? reason.trim() : "";
    if (action === "REJECT" && !trimmed)
      throw new DomainValidationError("A rejection reason is required.", [
        { field: "reason", message: "Enter a rejection reason." },
      ]);
    const from = action === "START_REVIEW" ? "SUBMITTED" : "UNDER_REVIEW";
    const to =
      action === "START_REVIEW"
        ? "UNDER_REVIEW"
        : action === "APPROVE"
          ? "APPROVED"
          : "REJECTED";
    const timestamp = this.now();
    const set =
      action === "START_REVIEW"
        ? { reviewerId: new ObjectId(principal.id), reviewStartedAt: timestamp }
        : action === "APPROVE"
          ? { approvedAt: timestamp }
          : { rejectedAt: timestamp, rejectionReason: trimmed };
    const command = async (session?: ClientSession) => {
      const updated = await this.applications.transition(
        {
          id: parsed,
          from,
          to,
          actorId: new ObjectId(principal.id),
          actorRole: "ADMIN",
          now: timestamp,
          set,
          ...(trimmed ? { reason: trimmed } : {}),
        },
        session,
      );
      if (!updated)
        throw new ConflictError(
          "The application status changed; refresh and try again.",
        );
      return { application: applicationDto(updated) };
    };
    return this.client ? runInTransaction(this.client, command) : command();
  }
}
