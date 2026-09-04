import { describe, expect, it } from "vitest";

import { stackSummary } from "./stack-summary";

describe("foundation summary", () => {
  it("names the fixed Phase 0 stack", () => {
    const summary = stackSummary();
    expect(summary).toContain("Next.js");
    expect(summary).toContain("Express");
    expect(summary).toContain("MongoDB");
  });
});
