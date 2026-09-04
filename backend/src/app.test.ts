import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "./app.js";

describe("Express foundation", () => {
  it("provides liveness and request correlation", async () => {
    const response = await request(createApp({ readiness: vi.fn() })).get(
      "/health",
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "api" });
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("checks database readiness", async () => {
    const readiness = vi.fn().mockResolvedValue(undefined);
    const response = await request(createApp({ readiness })).get("/ready");
    expect(response.status).toBe(200);
    expect(readiness).toHaveBeenCalledOnce();
  });
});
