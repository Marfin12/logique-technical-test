import { randomBytes } from "node:crypto";

export interface AppConfig {
  port: number;
  mongoUri: string;
  databaseName: string;
  authSecret: string;
  chatProvider: "local" | "gemini";
  geminiApiKey?: string;
  geminiModel: string;
  geminiTimeoutMs: number;
}

function positivePort(value: string | undefined): number {
  const port = Number(value ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("API_PORT must be an integer between 1 and 65535");
  }
  return port;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseName = env.MONGODB_DB_NAME?.trim() || "insurance";
  if (!/^[a-zA-Z0-9_-]+$/.test(databaseName)) {
    throw new Error("MONGODB_DB_NAME contains unsupported characters");
  }

  const configuredSecret = env.AUTH_SECRET?.trim();
  if (configuredSecret && configuredSecret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters");
  }
  const chatProvider = env.CHAT_PROVIDER?.trim().toLowerCase() || "local";
  if (chatProvider !== "local" && chatProvider !== "gemini") {
    throw new Error("CHAT_PROVIDER must be local or gemini");
  }
  const geminiApiKey = env.GEMINI_API_KEY?.trim();
  if (chatProvider === "gemini" && !geminiApiKey) {
    throw new Error("GEMINI_API_KEY is required when CHAT_PROVIDER=gemini");
  }
  const geminiModel = env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  if (!/^[a-zA-Z0-9._-]+$/.test(geminiModel)) {
    throw new Error("GEMINI_MODEL contains unsupported characters");
  }
  const geminiTimeoutMs = Number(env.GEMINI_TIMEOUT_MS ?? 8000);
  if (
    !Number.isInteger(geminiTimeoutMs) ||
    geminiTimeoutMs < 1000 ||
    geminiTimeoutMs > 30000
  ) {
    throw new Error("GEMINI_TIMEOUT_MS must be between 1000 and 30000");
  }

  return {
    port: positivePort(env.API_PORT),
    mongoUri:
      env.MONGODB_URI ??
      "mongodb://127.0.0.1:27017/insurance?replicaSet=rs0&directConnection=true",
    databaseName,
    authSecret: configuredSecret || randomBytes(32).toString("base64url"),
    chatProvider: chatProvider as "local" | "gemini",
    ...(geminiApiKey ? { geminiApiKey } : {}),
    geminiModel,
    geminiTimeoutMs,
  };
}
