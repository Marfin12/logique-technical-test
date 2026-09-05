import { loadConfig } from "../config.js";
import { connectDatabase, type DatabaseConnection } from "./client.js";
import { seedTestAccounts, seedTestProducts } from "./fixtures.js";
import { runMigrations } from "../migrations/migrations.js";

let connection: DatabaseConnection | undefined;

try {
  const config = loadConfig();
  connection = await connectDatabase(config);
  await runMigrations(connection.db);
  await seedTestAccounts(connection.db);
  await seedTestProducts(connection.db);
  console.log("Seeded deterministic [TEST ONLY] account and product fixtures.");
} catch (error) {
  console.error(
    "Fixture seeding failed.",
    error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  );
  process.exitCode = 1;
} finally {
  try {
    await connection?.client.close();
  } catch (error) {
    console.error(
      "Database connection cleanup failed after fixture seeding.",
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error),
    );
    process.exitCode = 1;
  }
}
