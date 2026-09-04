import { loadConfig } from "../config.js";
import {
  connectDatabase,
  type DatabaseConnection,
} from "../database/client.js";
import { runMigrations } from "./migrations.js";

const config = loadConfig();
let connection: DatabaseConnection | undefined;

try {
  connection = await connectDatabase(config);
  const applied = await runMigrations(connection.db);
  console.log(
    applied.length
      ? `Applied migrations: ${applied.join(", ")}`
      : "Database is current.",
  );
} catch {
  console.error(
    "Database migration failed. Verify MongoDB connectivity and logs.",
  );
  process.exitCode = 1;
} finally {
  try {
    await connection?.client.close();
  } catch {
    console.error("Database connection cleanup failed after migration.");
    process.exitCode = 1;
  }
}
