import { randomBytes } from "node:crypto";

export interface AppConfig {
  port: number;
  mongoUri: string;
  databaseName: string;
  authSecret: string;
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

  return {
    port: positivePort(env.API_PORT),
    mongoUri:
      env.MONGODB_URI ?? "mongodb://localhost:27017/insurance?replicaSet=rs0",
    databaseName,
    authSecret: configuredSecret || randomBytes(32).toString("base64url"),
  };
}
