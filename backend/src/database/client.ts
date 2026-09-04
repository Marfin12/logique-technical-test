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
  });
  await client.connect();
  return { client, db: client.db(config.databaseName) };
}
