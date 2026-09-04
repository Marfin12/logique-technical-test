import { Router } from "express";
import type { SessionCodec } from "../domain/session.js";
import type { AdminReviewService } from "../services/admin-review-service.js";
import { authentication, principalFrom, sameOrigin } from "./authentication.js";
import { asyncHandler } from "./middleware.js";

export interface Phase6Dependencies {
  adminReviewService: AdminReviewService;
  sessionCodec: SessionCodec;
}
const parameter = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
export function phase6Router(dependencies: Phase6Dependencies) {
  const router = Router();
  const auth = authentication(dependencies.sessionCodec);
  router.get(
    "/admin/applications",
    auth,
    asyncHandler(async (_req, res) => {
      res.json(
        await dependencies.adminReviewService.list(principalFrom(res.locals)),
      );
    }),
  );
  router.get(
    "/admin/applications/:id",
    auth,
    asyncHandler(async (req, res) => {
      res.json(
        await dependencies.adminReviewService.detail(
          principalFrom(res.locals),
          parameter(req.params.id),
        ),
      );
    }),
  );
  router.get(
    "/admin/users/:userId/profile",
    auth,
    asyncHandler(async (req, res) => {
      res.json(
        await dependencies.adminReviewService.profile(
          principalFrom(res.locals),
          parameter(req.params.userId),
        ),
      );
    }),
  );
  router.post(
    "/admin/applications/:id/start-review",
    auth,
    sameOrigin,
    asyncHandler(async (req, res) => {
      res.json(
        await dependencies.adminReviewService.transition(
          principalFrom(res.locals),
          parameter(req.params.id),
          "START_REVIEW",
        ),
      );
    }),
  );
  router.post(
    "/admin/applications/:id/approve",
    auth,
    sameOrigin,
    asyncHandler(async (req, res) => {
      res.json(
        await dependencies.adminReviewService.transition(
          principalFrom(res.locals),
          parameter(req.params.id),
          "APPROVE",
        ),
      );
    }),
  );
  router.post(
    "/admin/applications/:id/reject",
    auth,
    sameOrigin,
    asyncHandler(async (req, res) => {
      res.json(
        await dependencies.adminReviewService.transition(
          principalFrom(res.locals),
          parameter(req.params.id),
          "REJECT",
          req.body?.reason,
        ),
      );
    }),
  );
  return router;
}
