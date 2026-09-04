import { describe, expect, it } from "vitest";

import {
  APPLICATION_LIST_PROJECTION,
  adminApplicationQuery,
  userApplicationQuery,
} from "../database/application-queries.js";
import { COLLECTION_SPECS, INDEX_SPECS } from "./schema.js";
import { ObjectId } from "mongodb";

describe("Phase 1 MongoDB schema", () => {
  it("preserves growth-critical index key order and options", () => {
    const applications = INDEX_SPECS.applications!;
    expect(applications.map(({ key }) => Object.keys(key))).toEqual([
      ["userId", "updatedAt", "_id"],
      ["userId", "status", "updatedAt", "_id"],
      ["status", "submittedAt", "_id"],
      ["reviewerId", "status", "reviewStartedAt", "_id"],
    ]);
    expect(
      applications.every(
        ({ partialFilterExpression }) => partialFilterExpression,
      ),
    ).toBe(true);
    expect(INDEX_SPECS.users?.[0]?.unique).toBe(true);
    expect(INDEX_SPECS.masterProfiles?.[0]?.unique).toBe(true);
    expect(INDEX_SPECS.productVersions?.[0]?.unique).toBe(true);
    expect(INDEX_SPECS.idempotencyRecords?.[0]?.unique).toBe(true);
    expect(INDEX_SPECS.idempotencyRecords?.[1]?.expireAfterSeconds).toBe(0);
  });

  it("contains canonical enum validators", () => {
    const serialized = JSON.stringify(COLLECTION_SPECS);
    for (const value of [
      "USER",
      "ADMIN",
      "MONTHLY",
      "QUARTERLY",
      "SEMI_ANNUALLY",
      "ANNUALLY",
      "RECURRING",
      "ONE_TIME",
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "APPROVED",
      "REJECTED",
    ]) {
      expect(serialized).toContain(value);
    }
  });

  it("uses indexed filters and narrow list projections", () => {
    const userId = new ObjectId();
    expect(userApplicationQuery(userId).hint).toBe(
      "idx_applications_user_recent",
    );
    expect(userApplicationQuery(userId, "DRAFT").hint).toBe(
      "idx_applications_user_status_recent",
    );
    expect(adminApplicationQuery("SUBMITTED").filter).toMatchObject({
      status: "SUBMITTED",
      isDeleted: false,
    });
    expect(APPLICATION_LIST_PROJECTION).not.toHaveProperty("supplementalData");
    expect(APPLICATION_LIST_PROJECTION).not.toHaveProperty("profileSnapshot");
    expect(APPLICATION_LIST_PROJECTION).not.toHaveProperty("productSnapshot");
    expect(APPLICATION_LIST_PROJECTION).not.toHaveProperty("premiumSnapshot");
  });
});
