import { randomUUID } from "node:crypto";

import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";

import type { HealthResponse } from "@insurance/contracts";

export interface AppDependencies {
  readiness(): Promise<void>;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ strictTransportSecurity: false }));
  app.use(express.json({ limit: "100kb" }));
  app.use((request, response, next) => {
    request.headers["x-request-id"] ??= randomUUID();
    response.setHeader("x-request-id", request.headers["x-request-id"]);
    next();
  });

  app.get("/health", (_request, response) => {
    const body: HealthResponse = { status: "ok", service: "api" };
    response.json(body);
  });

  app.get("/ready", async (_request, response) => {
    await dependencies.readiness();
    response.json({ status: "ready" });
  });

  app.use((_request, response) => {
    response
      .status(404)
      .json({ error: { code: "NOT_FOUND", message: "Resource not found." } });
  });

  const errorHandler: ErrorRequestHandler = (
    error,
    request,
    response,
    _next,
  ) => {
    console.error({ requestId: request.headers["x-request-id"], error });
    response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    });
  };
  app.use(errorHandler);
  return app;
}
