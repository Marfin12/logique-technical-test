import { describe, expect, it } from "vitest";

import { ROLES } from "./index.js";

describe("shared contracts", () => {
  it("defines the two FSD roles", () => {
    expect(ROLES).toEqual(["USER", "ADMIN"]);
  });
});
