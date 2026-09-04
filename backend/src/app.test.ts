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

  it("maps a database readiness failure without terminating the app", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const app = createApp({
      readiness: vi.fn().mockRejectedValue(new Error("database unavailable")),
    });
    const failed = await request(app).get("/ready");
    const healthy = await request(app).get("/health");
    expect(failed.status).toBe(500);
    expect(failed.body.error.code).toBe("INTERNAL_ERROR");
    expect(healthy.status).toBe(200);
    log.mockRestore();
  });
});
