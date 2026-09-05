import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

describe("environment configuration", () => {
  it("provides deterministic local defaults", () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      port: 4000,
      mongoUri:
        "mongodb://127.0.0.1:27017/insurance?replicaSet=rs0&directConnection=true",
      databaseName: "insurance",
      chatProvider: "local",
      geminiModel: "gemini-2.5-flash",
      geminiTimeoutMs: 8000,
    });
    expect(config.authSecret.length).toBeGreaterThanOrEqual(32);
  });

  it("rejects invalid ports and database names", () => {
    expect(() => loadConfig({ API_PORT: "70000" })).toThrow(/API_PORT/);
    expect(() => loadConfig({ MONGODB_DB_NAME: "bad name" })).toThrow(
      /MONGODB_DB_NAME/,
    );
    expect(() => loadConfig({ AUTH_SECRET: "too-short" })).toThrow(
      /AUTH_SECRET/,
    );
    expect(() => loadConfig({ CHAT_PROVIDER: "other" })).toThrow(
      /CHAT_PROVIDER/,
    );
    expect(() => loadConfig({ CHAT_PROVIDER: "gemini" })).toThrow(
      /GEMINI_API_KEY/,
    );
    expect(() => loadConfig({ GEMINI_MODEL: "models/unsafe" })).toThrow(
      /GEMINI_MODEL/,
    );
    expect(() => loadConfig({ GEMINI_TIMEOUT_MS: "500" })).toThrow(
      /GEMINI_TIMEOUT_MS/,
    );
  });

  it("loads server-side Gemini settings", () => {
    expect(
      loadConfig({
        CHAT_PROVIDER: "gemini",
        GEMINI_API_KEY: "test-api-key",
        GEMINI_MODEL: "gemini-2.5-flash",
        GEMINI_TIMEOUT_MS: "5000",
      }),
    ).toMatchObject({
      chatProvider: "gemini",
      geminiApiKey: "test-api-key",
      geminiModel: "gemini-2.5-flash",
      geminiTimeoutMs: 5000,
    });
  });
});
