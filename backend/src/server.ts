import type { Server } from "node:http";

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import {
  connectDatabaseWithRetry,
  type DatabaseConnection,
} from "./database/client.js";
import { ProfileRepository } from "./database/profile-repository.js";
import { ProductRepository } from "./database/product-repository.js";
import { UserRepository } from "./database/user-repository.js";
import { SessionCodec } from "./domain/session.js";
import { AuthService } from "./services/auth-service.js";
import { ProfileService } from "./services/profile-service.js";
import { ProductService } from "./services/product-service.js";
import { ApplicationRepository } from "./database/application-repository.js";
import { IdempotencyRepository } from "./database/idempotency-repository.js";
import { ApplicationService } from "./services/application-service.js";

const config = loadConfig();
let connection: DatabaseConnection | undefined;
let server: Server | undefined;
let shuttingDown = false;

async function start() {
  try {
    connection = await connectDatabaseWithRetry(config, {
      onRetry: (attempt) => {
        console.error(
          `MongoDB connection failed (attempt ${attempt}); retrying in 2 seconds.`,
        );
      },
    });
    if (shuttingDown) return;

    const users = new UserRepository(connection.db);
    const profiles = new ProfileRepository(connection.db);
    const products = new ProductRepository(connection.db);
    const applications = new ApplicationRepository(connection.db);
    const idempotency = new IdempotencyRepository(connection.db);
    const productService = new ProductService(profiles, products);
    const sessionCodec = new SessionCodec(config.authSecret);
    const app = createApp({
      readiness: () =>
        connection!.db.command({ ping: 1 }).then(() => undefined),
      phase2: {
        authService: new AuthService(users, profiles),
        profileService: new ProfileService(profiles),
        sessionCodec,
      },
      phase3: {
        productService,
        sessionCodec,
      },
      phase4: {
        applicationService: new ApplicationService(
          applications,
          idempotency,
          productService,
          () => new Date(),
          connection.client,
        ),
        sessionCodec,
      },
    });

    server = app.listen(config.port, "0.0.0.0", () => {
      console.log(`Insurance API listening on port ${config.port}.`);
    });
    server.on("error", (error) => {
      console.error("The API server encountered an error.", error);
    });
  } catch (error) {
    console.error("The API could not complete startup.", error);
    process.exitCode = 1;
  }
}

void start();

async function shutdown(signal: string) {
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down.`);
  const closeDatabase = async () => {
    try {
      await connection?.client.close();
    } catch (error) {
      console.error("MongoDB cleanup failed during shutdown.", error);
    } finally {
      process.exit(0);
    }
  };
  if (server) server.close(() => void closeDatabase());
  else await closeDatabase();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
