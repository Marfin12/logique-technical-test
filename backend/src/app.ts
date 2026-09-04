import express from "express";
import helmet from "helmet";

import type { ErrorDto, HealthResponse } from "@insurance/contracts";

import { errorHandler, requestIdMiddleware } from "./http/middleware.js";

export interface AppDependencies {
  readiness(): Promise<void>;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ strictTransportSecurity: false }));
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_request, response) => {
    const body: HealthResponse = { status: "ok", service: "api" };
    response.json(body);
  });

  app.get("/ready", async (_request, response) => {
    await dependencies.readiness();
    response.json({ status: "ready" });
  });

  app.use((_request, response) => {
    const body: ErrorDto = {
      error: {
        code: "NOT_FOUND",
        message: "Resource not found.",
        requestId: response.locals.requestId as string,
      },
    };
    response.status(404).json(body);
  });
  app.use(errorHandler);
  return app;
}
