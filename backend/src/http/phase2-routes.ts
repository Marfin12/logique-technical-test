import { Router } from "express";

import type {
  CurrentAccountResponseDto,
  LoginResponseDto,
  MasterProfileResponseDto,
} from "@insurance/contracts";

import type { SessionCodec } from "../domain/session.js";
import type { AuthService } from "../services/auth-service.js";
import { parseLoginInput } from "../services/auth-service.js";
import type { ProfileService } from "../services/profile-service.js";
import {
  authentication,
  expiredSessionCookie,
  loginRateLimit,
  principalFrom,
  sameOrigin,
  sessionCookie,
} from "./authentication.js";
import { asyncHandler } from "./middleware.js";

export interface Phase2Dependencies {
  authService: AuthService;
  profileService: ProfileService;
  sessionCodec: SessionCodec;
}

export function phase2Router(dependencies: Phase2Dependencies) {
  const router = Router();
  const requireAuthentication = authentication(dependencies.sessionCodec);

  router.post(
    "/auth/login",
    sameOrigin,
    loginRateLimit({ limit: 10, windowMs: 15 * 60 * 1000 }),
    asyncHandler(async (request, response) => {
      const result = await dependencies.authService.login(
        parseLoginInput(request.body),
      );
      const token = dependencies.sessionCodec.issue({
        id: result.account.id,
        role: result.account.role,
      });
      response.setHeader("set-cookie", sessionCookie(token));
      response.json(result satisfies LoginResponseDto);
    }),
  );

  router.post("/auth/logout", sameOrigin, (_request, response) => {
    response.setHeader("set-cookie", expiredSessionCookie());
    response.status(204).end();
  });

  router.get(
    "/me",
    requireAuthentication,
    asyncHandler(async (_request, response) => {
      const account = await dependencies.authService.currentAccount(
        principalFrom(response.locals).id,
      );
      response.json({ account } satisfies CurrentAccountResponseDto);
    }),
  );

  router.get(
    "/me/profile",
    requireAuthentication,
    asyncHandler(async (_request, response) => {
      const result = await dependencies.profileService.getOwn(
        principalFrom(response.locals),
      );
      response.json(result satisfies MasterProfileResponseDto);
    }),
  );

  router.put(
    "/me/profile",
    sameOrigin,
    requireAuthentication,
    asyncHandler(async (request, response) => {
      const result = await dependencies.profileService.saveOwn(
        principalFrom(response.locals),
        request.body,
      );
      response.json(result satisfies MasterProfileResponseDto);
    }),
  );

  return router;
}
