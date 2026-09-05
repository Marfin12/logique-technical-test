import { describe, expect, it } from "vitest";

import { OperationalMetrics } from "./metrics.js";

describe("operational metrics", () => {
  it("counts hardening-critical outcomes without storing request content", () => {
    const metrics = new OperationalMetrics();
    metrics.observeRequest("PATCH", "/api/v1/me/applications/abc/draft", 500);
    metrics.observeRequest("POST", "/api/v1/me/applications/abc/submit", 200);
    metrics.observeRequest(
      "POST",
      "/api/v1/admin/applications/abc/approve",
      409,
    );

    expect(metrics.snapshot()).toMatchObject({
      apiRequests: 3,
      apiErrors: 1,
      draftSaveAttempts: 1,
      draftSaveFailures: 1,
      submissions: 1,
      adminTransitionConflicts: 1,
    });
    expect(JSON.stringify(metrics.snapshot())).not.toContain("abc");
  });
});
