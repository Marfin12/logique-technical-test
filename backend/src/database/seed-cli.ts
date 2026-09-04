import { loadConfig } from "../config.js";
import { connectDatabase, type DatabaseConnection } from "./client.js";
import { seedTestAccounts, seedTestProducts } from "./fixtures.js";
import { runMigrations } from "../migrations/migrations.js";

const config = loadConfig();
let connection: DatabaseConnection | undefined;

try {
  connection = await connectDatabase(config);
  await runMigrations(connection.db);
  await seedTestAccounts(connection.db);
  await seedTestProducts(connection.db);
  console.log("Seeded deterministic [TEST ONLY] account and product fixtures.");
} catch {
  console.error(
    "Fixture seeding failed. Verify MongoDB connectivity and logs.",
  );
  process.exitCode = 1;
} finally {
  try {
    await connection?.client.close();
  } catch {
    console.error("Database connection cleanup failed after fixture seeding.");
    process.exitCode = 1;
  }
}
