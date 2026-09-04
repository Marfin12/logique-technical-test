import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

describe("environment configuration", () => {
  it("provides deterministic local defaults", () => {
    expect(loadConfig({})).toEqual({
      port: 4000,
      mongoUri: "mongodb://localhost:27017/insurance?replicaSet=rs0",
      databaseName: "insurance",
    });
  });

  it("rejects invalid ports and database names", () => {
    expect(() => loadConfig({ API_PORT: "70000" })).toThrow(/API_PORT/);
    expect(() => loadConfig({ MONGODB_DB_NAME: "bad name" })).toThrow(
      /MONGODB_DB_NAME/,
    );
  });
});
