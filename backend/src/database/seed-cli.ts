import { loadConfig } from "../config.js";
import { connectDatabase } from "./client.js";
import { seedTestProducts } from "./fixtures.js";
import { runMigrations } from "../migrations/migrations.js";

const config = loadConfig();
const connection = await connectDatabase(config);

try {
  await runMigrations(connection.db);
  await seedTestProducts(connection.db);
  console.log("Seeded deterministic [TEST ONLY] product fixtures.");
} finally {
  await connection.client.close();
}
