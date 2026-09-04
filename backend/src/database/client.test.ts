import { describe, expect, it, vi } from "vitest";

import type { AppConfig } from "../config.js";
import { connectDatabaseWithRetry, type DatabaseConnection } from "./client.js";

const config: AppConfig = {
  port: 4000,
  mongoUri: "mongodb://localhost:27017/insurance?replicaSet=rs0",
  databaseName: "insurance",
  authSecret: "test-secret-that-is-at-least-32-chars",
};

describe("MongoDB connection recovery", () => {
  it("retries transient connection failures instead of rejecting startup", async () => {
    const expected = { client: {}, db: {} } as DatabaseConnection;
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValue(expected);
    const delay = vi.fn().mockResolvedValue(undefined);
    const onRetry = vi.fn();

    await expect(
      connectDatabaseWithRetry(config, { connect, delay, onRetry }),
    ).resolves.toBe(expected);
    expect(connect).toHaveBeenCalledTimes(3);
    expect(delay).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls.map(([attempt]) => attempt)).toEqual([1, 2]);
  });
});
