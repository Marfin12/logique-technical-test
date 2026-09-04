import { describe, expect, it } from "vitest";

import { MIGRATIONS } from "./migrations.js";

describe("database migrations", () => {
  it("has unique, ordered identifiers", () => {
    const ids = MIGRATIONS.map((migration) => migration.id);
    expect(ids).toEqual([...ids].sort());
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("000-foundation");
  });
});
