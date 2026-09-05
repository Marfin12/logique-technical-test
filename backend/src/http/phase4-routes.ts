import { Router } from "express";
import {
  APPLICATION_STATUSES,
  type ApplicationResponseDto,
  type ApplicationStatus,
} from "@insurance/contracts";
import type { SessionCodec } from "../domain/session.js";
import { DomainValidationError } from "../domain/errors.js";
import { authentication, principalFrom, sameOrigin } from "./authentication.js";
import { asyncHandler } from "./middleware.js";
import type { ApplicationService } from "../services/application-service.js";

export interface Phase4Dependencies {
  applicationService: ApplicationService;
  sessionCodec: SessionCodec;
}

function applicationStatus(value: unknown): ApplicationStatus | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value === "string" &&
    APPLICATION_STATUSES.some((status) => status === value)
  ) {
    return value as ApplicationStatus;
  }
  throw new DomainValidationError("Invalid application status filter.");
}

export function phase4Router(dependencies: Phase4Dependencies) {
  const router = Router();
  const auth = authentication(dependencies.sessionCodec);
  router.get(
    "/me/applications",
    auth,
    asyncHandler(async (req, res) => {
      const status = applicationStatus(req.query.status);
      res.json(
        await dependencies.applicationService.list(
          principalFrom(res.locals),
          status,
        ),
      );
    }),
  );
  router.post(
    "/me/applications/drafts",
    sameOrigin,
    auth,
    asyncHandler(async (req, res) => {
      const result = await dependencies.applicationService.createDraft(
        principalFrom(res.locals),
        req.body,
        req.header("Idempotency-Key") ?? undefined,
      );
      res.status(result.reused ? 200 : 201).json({
        application: result.application,
      } satisfies ApplicationResponseDto);
    }),
  );
  router.post(
    "/me/applications/:id/submit",
    sameOrigin,
    auth,
    asyncHandler(async (req, res) => {
      const id = Array.isArray(req.params.id)
        ? (req.params.id[0] ?? "")
        : (req.params.id ?? "");
      const result = await dependencies.applicationService.submit(
        principalFrom(res.locals),
        id,
        req.header("Idempotency-Key") ?? undefined,
      );
      res.status(result.reused ? 200 : 200).json({
        application: result.application,
      } satisfies ApplicationResponseDto);
    }),
  );
  router.get(
    "/me/applications/:id",
    auth,
    asyncHandler(async (req, res) => {
      const id = Array.isArray(req.params.id)
        ? (req.params.id[0] ?? "")
        : (req.params.id ?? "");
      res.json(
        await dependencies.applicationService.get(
          principalFrom(res.locals),
          id,
        ),
      );
    }),
  );
  router.patch(
    "/me/applications/:id/draft",
    sameOrigin,
    auth,
    asyncHandler(async (req, res) => {
      const id = Array.isArray(req.params.id)
        ? (req.params.id[0] ?? "")
        : (req.params.id ?? "");
      res.json(
        await dependencies.applicationService.update(
          principalFrom(res.locals),
          id,
          req.body,
        ),
      );
    }),
  );
  router.delete(
    "/me/applications/:id/draft",
    sameOrigin,
    auth,
    asyncHandler(async (req, res) => {
      const id = Array.isArray(req.params.id)
        ? (req.params.id[0] ?? "")
        : (req.params.id ?? "");
      await dependencies.applicationService.remove(
        principalFrom(res.locals),
        id,
      );
      res.status(204).send();
    }),
  );
  return router;
}
