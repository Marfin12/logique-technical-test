import { loadConfig } from "../config.js";
import { connectDatabase } from "../database/client.js";
import { runMigrations } from "./migrations.js";

const config = loadConfig();
const connection = await connectDatabase(config);

try {
  const applied = await runMigrations(connection.db);
  console.log(
    applied.length
      ? `Applied migrations: ${applied.join(", ")}`
      : "Database is current.",
  );
} finally {
  await connection.client.close();
}
