import { Router } from "express";
import type { ApplicationResponseDto } from "@insurance/contracts";
import type { SessionCodec } from "../domain/session.js";
import { authentication, principalFrom } from "./authentication.js";
import { asyncHandler } from "./middleware.js";
import type { ApplicationService } from "../services/application-service.js";

export interface Phase4Dependencies {
  applicationService: ApplicationService;
  sessionCodec: SessionCodec;
}
export function phase4Router(dependencies: Phase4Dependencies) {
  const router = Router();
  const auth = authentication(dependencies.sessionCodec);
  router.get(
    "/me/applications",
    auth,
    asyncHandler(async (req, res) => {
      const status =
        typeof req.query.status === "string"
          ? (req.query.status as any)
          : undefined;
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
    auth,
    asyncHandler(async (req, res) => {
      const result = await dependencies.applicationService.createDraft(
        principalFrom(res.locals),
        req.body,
        req.header("Idempotency-Key") ?? undefined,
      );
      res
        .status(result.reused ? 200 : 201)
        .json({
          application: result.application,
        } satisfies ApplicationResponseDto);
    }),
  );
  router.get("/me/applications/:id", auth, asyncHandler(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id ?? "";
    res.json(await dependencies.applicationService.get(principalFrom(res.locals), id));
  }));
  router.patch(
    "/me/applications/:id/draft",
    auth,
    asyncHandler(async (req, res) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id ?? "";
      res.json(await dependencies.applicationService.update(principalFrom(res.locals), id, req.body));
    }),
  );
  router.delete(
    "/me/applications/:id/draft",
    auth,
    asyncHandler(async (req, res) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id ?? "";
      await dependencies.applicationService.remove(principalFrom(res.locals), id);
      res.status(204).send();
    }),
  );
  return router;
}
