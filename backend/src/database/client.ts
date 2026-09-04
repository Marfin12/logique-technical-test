import { MongoClient, type Db } from "mongodb";

import type { AppConfig } from "../config.js";

export interface DatabaseConnection {
  client: MongoClient;
  db: Db;
}

export async function connectDatabase(
  config: AppConfig,
): Promise<DatabaseConnection> {
  const client = new MongoClient(config.mongoUri, {
    appName: "simple-insurance-api",
    serverSelectionTimeoutMS: 5_000,
  });
  try {
    await client.connect();
    return { client, db: client.db(config.databaseName) };
  } catch (error) {
    try {
      await client.close();
    } catch {
      // Preserve the original connection error.
    }
    throw error;
  }
}

export async function connectDatabaseWithRetry(
  config: AppConfig,
  options: {
    retryDelayMs?: number;
    connect?: typeof connectDatabase;
    onRetry?: (attempt: number, error: unknown) => void;
    delay?: (milliseconds: number) => Promise<void>;
  } = {},
): Promise<DatabaseConnection> {
  const connect = options.connect ?? connectDatabase;
  const delay =
    options.delay ??
    ((milliseconds: number) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)));
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      return await connect(config);
    } catch (error) {
      options.onRetry?.(attempt, error);
      await delay(options.retryDelayMs ?? 2_000);
    }
  }
}
