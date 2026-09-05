import { Decimal128, ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import type {
  ApplicationDocument,
  ApplicationStatusEventDocument,
} from "../models/persistence.js";
import type { ApplicationRepository } from "../database/application-repository.js";
import type { ProfileRepository } from "../database/profile-repository.js";
import type { ProductRepository } from "../database/product-repository.js";
import type { UserRepository } from "../database/user-repository.js";
import { AdminReviewService } from "./admin-review-service.js";

const USER = new ObjectId("650000000000000000000202");
const ADMIN = new ObjectId("650000000000000000000203");
const PRODUCT = new ObjectId("650000000000000000000001");
function context(status: ApplicationDocument["status"] = "SUBMITTED") {
  const now = new Date("2026-01-01T00:00:00Z");
  const application: ApplicationDocument = {
    _id: new ObjectId(),
    userId: USER,
    productId: PRODUCT,
    productVersionId: new ObjectId(),
    selectedInsuranceType: "TERM_LIFE",
    status,
    supplementalData: {},
    profileSnapshot: { age: 35 },
    productSnapshot: { name: "Life" },
    premiumSnapshot: { paymentFrequency: "MONTHLY" },
    version: 2,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    submittedAt: now,
  };
  const events: ApplicationStatusEventDocument[] = [];
  const applications = {
    listAdminQueue: async () => (status === "DRAFT" ? [] : [application]),
    findAdminVisibleById: async () =>
      application.status === "DRAFT" ? null : application,
    statusHistory: async () => events,
    transition: async (
      input: Parameters<ApplicationRepository["transition"]>[0],
    ) => {
      if (application.status !== input.from) return null;
      application.status = input.to;
      application.version += 1;
      application.updatedAt = input.now;
      Object.assign(application, input.set);
      events.push({
        _id: new ObjectId(),
        applicationId: application._id,
        fromStatus: input.from,
        toStatus: input.to,
        actorId: input.actorId,
        actorRole: "ADMIN",
        ...(input.reason ? { reason: input.reason } : {}),
        createdAt: input.now,
      });
      return application;
    },
  };
  const users = {
    findByIds: async () => [
      {
        _id: USER,
        displayName: "Applicant",
        normalizedEmail: "customer@example.test",
        role: "USER",
      },
    ],
    findById: async () => ({
      _id: USER,
      displayName: "Applicant",
      normalizedEmail: "customer@example.test",
      role: "USER",
    }),
  };
  const profiles = {
    findByUserId: async () => ({
      _id: new ObjectId(),
      userId: USER,
      age: 35,
      sumAssured: Decimal128.fromString("500000000"),
      currency: "IDR",
      paymentFrequency: "MONTHLY",
      paymentMethod: "RECURRING",
      version: 1,
      createdAt: now,
      updatedAt: now,
    }),
  };
  const products = { findByIds: async () => [{ _id: PRODUCT, name: "Life" }] };
  return {
    application,
    events,
    service: new AdminReviewService(
      applications as unknown as ApplicationRepository,
      users as unknown as UserRepository,
      profiles as unknown as ProfileRepository,
      products as unknown as ProductRepository,
      undefined,
      () => new Date("2026-01-02T00:00:00Z"),
    ),
  };
}
const admin = { id: ADMIN.toHexString(), role: "ADMIN" as const };
describe("admin review lifecycle", () => {
  it("excludes drafts and enriches submitted queue rows", async () => {
    expect((await context("DRAFT").service.list(admin)).items).toHaveLength(0);
    const row = (await context().service.list(admin)).items[0];
    expect(row).toMatchObject({
      applicantName: "Applicant",
      applicantUsername: "customer@example.test",
      productName: "Life",
      paymentFrequency: "MONTHLY",
      status: "SUBMITTED",
    });
  });
  it("keeps detail reads passive and performs only valid transitions", async () => {
    const value = context();
    expect(
      (await value.service.detail(admin, value.application._id.toHexString()))
        .application.status,
    ).toBe("SUBMITTED");
    expect(value.application.status).toBe("SUBMITTED");
    await value.service.transition(
      admin,
      value.application._id.toHexString(),
      "START_REVIEW",
    );
    expect(value.application.status).toBe("UNDER_REVIEW");
    await expect(
      value.service.transition(
        admin,
        value.application._id.toHexString(),
        "START_REVIEW",
      ),
    ).rejects.toMatchObject({ status: 409 });
    await value.service.transition(
      admin,
      value.application._id.toHexString(),
      "APPROVE",
    );
    expect(value.application.status).toBe("APPROVED");
    expect(value.events.map((event) => event.toStatus)).toEqual([
      "UNDER_REVIEW",
      "APPROVED",
    ]);
    await expect(
      value.service.transition(
        admin,
        value.application._id.toHexString(),
        "REJECT",
        "late",
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("requires a non-blank rejection reason", async () => {
    const value = context("UNDER_REVIEW");
    await expect(
      value.service.transition(
        admin,
        value.application._id.toHexString(),
        "REJECT",
        "   ",
      ),
    ).rejects.toMatchObject({ status: 422 });
    await value.service.transition(
      admin,
      value.application._id.toHexString(),
      "REJECT",
      "Not eligible after review",
    );
    expect(value.application).toMatchObject({
      status: "REJECTED",
      rejectionReason: "Not eligible after review",
    });
  });
});
