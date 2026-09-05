import { Router } from "express";
import type { ChatMessageResponseDto } from "@insurance/contracts";
import type { SessionCodec } from "../domain/session.js";
import { parseChatMessage } from "../domain/chat.js";
import type { ChatService } from "../services/chat-service.js";
import {
  authentication,
  loginRateLimit,
  principalFrom,
  sameOrigin,
} from "./authentication.js";
import { asyncHandler, validateBody } from "./middleware.js";
export interface Phase7Dependencies {
  chatService: ChatService;
  sessionCodec: SessionCodec;
}
export function phase7Router(dependencies: Phase7Dependencies) {
  const router = Router();
  const auth = authentication(dependencies.sessionCodec);
  router.post(
    "/chat/messages",
    auth,
    sameOrigin,
    loginRateLimit({
      limit: 20,
      windowMs: 60_000,
      message: "Too many chat requests. Please try again later.",
    }),
    validateBody(parseChatMessage),
    asyncHandler(async (_req, res) => {
      const result = await dependencies.chatService.reply(
        principalFrom(res.locals),
        res.locals.validatedBody as string,
      );
      res.json(result satisfies ChatMessageResponseDto);
    }),
  );
  return router;
}
