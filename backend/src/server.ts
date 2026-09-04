import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { connectDatabase } from "./database/client.js";

const config = loadConfig();
const connection = await connectDatabase(config);
const app = createApp({
  readiness: () => connection.db.command({ ping: 1 }).then(() => undefined),
});

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`Insurance API listening on port ${config.port}.`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}; shutting down.`);
  server.close(async () => {
    await connection.client.close();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
