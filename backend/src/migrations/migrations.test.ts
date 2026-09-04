import { describe, expect, it } from "vitest";

import { MIGRATIONS } from "./migrations.js";
import { COLLECTION_SPECS, INDEX_SPECS } from "./schema.js";

describe("MongoDB migrations", () => {
  it("has unique, ordered identifiers", () => {
    const ids = MIGRATIONS.map((migration) => migration.id);
    expect(ids).toEqual([...ids].sort());
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("000-foundation");
    expect(ids).toContain("001-contracts-and-persistence");
  });

  it("defines every Phase 1 collection and required index", () => {
    expect(COLLECTION_SPECS.map(({ name }) => name)).toEqual([
      "users",
      "masterProfiles",
      "products",
      "productVersions",
      "applications",
      "applicationStatusEvents",
      "idempotencyRecords",
    ]);
    expect(
      Object.values(INDEX_SPECS)
        .flat()
        .map(({ name }) => name),
    ).toEqual([
      "uq_users_normalized_email",
      "uq_master_profiles_user",
      "idx_products_active_name",
      "uq_product_versions_product_version",
      "idx_product_versions_effective",
      "idx_applications_user_recent",
      "idx_applications_user_status_recent",
      "idx_applications_admin_queue",
      "idx_applications_reviewer_queue",
      "idx_status_events_application_time",
      "uq_idempotency_actor_scope_key",
      "ttl_idempotency_expiry",
    ]);
  });
});
