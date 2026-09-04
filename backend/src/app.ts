import express from "express";
import helmet from "helmet";

import type { ErrorDto, HealthResponse } from "@insurance/contracts";

import {
  asyncHandler,
  errorHandler,
  requestIdMiddleware,
} from "./http/middleware.js";
import { phase2Router, type Phase2Dependencies } from "./http/phase2-routes.js";
import { phase3Router, type Phase3Dependencies } from "./http/phase3-routes.js";
import { phase4Router, type Phase4Dependencies } from "./http/phase4-routes.js";

export interface AppDependencies {
  readiness(): Promise<void>;
  phase2?: Phase2Dependencies;
  phase3?: Phase3Dependencies;
  phase4?: Phase4Dependencies;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ strictTransportSecurity: false }));
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "100kb" }));

  if (dependencies.phase2) {
    app.use("/api/v1", phase2Router(dependencies.phase2));
  }
  if (dependencies.phase3) {
    app.use("/api/v1", phase3Router(dependencies.phase3));
  }
  if (dependencies.phase4)
    app.use("/api/v1", phase4Router(dependencies.phase4));

  app.get("/health", (_request, response) => {
    const body: HealthResponse = { status: "ok", service: "api" };
    response.json(body);
  });

  app.get(
    "/ready",
    asyncHandler(async (_request, response) => {
      await dependencies.readiness();
      response.json({ status: "ready" });
    }),
  );

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
