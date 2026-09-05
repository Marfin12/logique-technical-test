import { loadConfig } from "../config.js";
import {
  connectDatabase,
  type DatabaseConnection,
} from "../database/client.js";
import { runMigrations } from "./migrations.js";

let connection: DatabaseConnection | undefined;

try {
  const config = loadConfig();
  connection = await connectDatabase(config);
  const applied = await runMigrations(connection.db);
  console.log(
    applied.length
      ? `Applied migrations: ${applied.join(", ")}`
      : "Database is current.",
  );
} catch (error) {
  console.error(
    "Database migration failed.",
    error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  );
  console.error(
    "If MongoDB runs in Docker, start it with `docker compose up -d mongo` or run the container migration with `docker compose run --rm migrate`.",
  );
  process.exitCode = 1;
} finally {
  try {
    await connection?.client.close();
  } catch (error) {
    console.error(
      "Database connection cleanup failed after migration.",
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error),
    );
    process.exitCode = 1;
  }
}
