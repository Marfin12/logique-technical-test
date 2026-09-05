import express from "express";
import helmet from "helmet";

import type { ErrorDto, HealthResponse } from "@insurance/contracts";

import {
  asyncHandler,
  errorHandler,
  requestIdMiddleware,
  requestLogMiddleware,
} from "./http/middleware.js";
import { phase2Router, type Phase2Dependencies } from "./http/phase2-routes.js";
import { phase3Router, type Phase3Dependencies } from "./http/phase3-routes.js";
import { phase4Router, type Phase4Dependencies } from "./http/phase4-routes.js";
import { phase6Router, type Phase6Dependencies } from "./http/phase6-routes.js";
import { phase7Router, type Phase7Dependencies } from "./http/phase7-routes.js";
import { operationalMetrics } from "./observability/metrics.js";

export interface AppDependencies {
  readiness(): Promise<void>;
  phase2?: Phase2Dependencies;
  phase3?: Phase3Dependencies;
  phase4?: Phase4Dependencies;
  phase6?: Phase6Dependencies;
  phase7?: Phase7Dependencies;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  app.disable("x-powered-by");
  // The API accepts traffic only from the single Next.js proxy container.
  app.set("trust proxy", 1);
  app.use(helmet({ strictTransportSecurity: false }));
  app.use(requestIdMiddleware);
  app.use(requestLogMiddleware());
  app.use(express.json({ limit: "100kb" }));

  if (dependencies.phase2) {
    app.use("/api/v1", phase2Router(dependencies.phase2));
  }
  if (dependencies.phase3) {
    app.use("/api/v1", phase3Router(dependencies.phase3));
  }
  if (dependencies.phase4)
    app.use("/api/v1", phase4Router(dependencies.phase4));
  if (dependencies.phase6)
    app.use("/api/v1", phase6Router(dependencies.phase6));
  if (dependencies.phase7)
    app.use("/api/v1", phase7Router(dependencies.phase7));

  app.get("/health", (_request, response) => {
    const body: HealthResponse = { status: "ok", service: "api" };
    response.json(body);
  });

  // The web proxy does not expose this endpoint; it is available only on the
  // internal API network for an operational collector.
  app.get("/internal/metrics", (_request, response) => {
    response.json(operationalMetrics.snapshot());
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
