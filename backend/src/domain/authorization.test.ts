import { describe, expect, it } from "vitest";

import { requireOwnership, requireRole } from "./authorization.js";

describe("authorization primitives", () => {
  it("allows an expected role and owned resource", () => {
    expect(() =>
      requireRole({ id: "admin", role: "ADMIN" }, ["ADMIN"]),
    ).not.toThrow();
    expect(() =>
      requireOwnership({ id: "user-1", role: "USER" }, "user-1"),
    ).not.toThrow();
  });

  it("rejects role and ownership violations", () => {
    expect(() => requireRole({ id: "user", role: "USER" }, ["ADMIN"])).toThrow(
      /permitted/,
    );
    expect(() =>
      requireOwnership({ id: "user-1", role: "USER" }, "user-2"),
    ).toThrow(/permitted/);
  });
});
