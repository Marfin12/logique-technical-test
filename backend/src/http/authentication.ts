import type { RequestHandler } from "express";

import { AppError, UnauthorizedError } from "../domain/errors.js";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  type SessionCodec,
  type SessionPrincipal,
} from "../domain/session.js";

function cookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").flatMap((part) => {
      const separator = part.indexOf("=");
      if (separator < 1) return [];
      return [
        [
          part.slice(0, separator).trim(),
          decodeURIComponent(part.slice(separator + 1).trim()),
        ],
      ];
    }),
  );
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function expiredSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function authentication(codec: SessionCodec): RequestHandler {
  return (request, response, next) => {
    try {
      const token = cookies(request.header("cookie"))[SESSION_COOKIE];
      if (!token) throw new UnauthorizedError();
      response.locals.principal = codec.verify(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function principalFrom(responseLocals: Record<string, unknown>) {
  const principal = responseLocals.principal as SessionPrincipal | undefined;
  if (!principal) throw new UnauthorizedError();
  return principal;
}

export const sameOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.header("origin");
  const host = request.header("x-forwarded-host") ?? request.header("host");
  const fetchSite = request.header("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return next(
      new AppError(403, "INVALID_ORIGIN", "Request origin is not allowed."),
    );
  }
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        throw new AppError(
          403,
          "INVALID_ORIGIN",
          "Request origin is not allowed.",
        );
      }
    } catch (error) {
      return next(
        error instanceof AppError
          ? error
          : new AppError(
              403,
              "INVALID_ORIGIN",
              "Request origin is not allowed.",
            ),
      );
    }
  }
  next();
};

export interface LoginRateLimiter extends RequestHandler {
  recordFailure(request: Parameters<RequestHandler>[0]): boolean;
  reset(request: Parameters<RequestHandler>[0]): void;
}

export function loginRateLimit(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
  message?: string;
}): LoginRateLimiter {
  const attempts = new Map<string, { count: number; resetsAt: number }>();
  const now = options.now ?? (() => Date.now());
  const keyFor = (request: Parameters<RequestHandler>[0]) =>
    request.ip || "unknown";
  const cleanup = (currentTime: number) => {
    if (attempts.size < 10_000) return;
    for (const [attemptKey, attempt] of attempts) {
      if (attempt.resetsAt <= currentTime) attempts.delete(attemptKey);
    }
  };
  const limiter = ((request, _response, next) => {
    const currentTime = now();
    cleanup(currentTime);
    next();
  }) as LoginRateLimiter;
  limiter.recordFailure = (request) => {
    const currentTime = now();
    cleanup(currentTime);
    const key = keyFor(request);
    const current = attempts.get(key);
    const state =
      !current || current.resetsAt <= currentTime
        ? { count: 0, resetsAt: currentTime + options.windowMs }
        : current;
    state.count += 1;
    attempts.set(key, state);
    return state.count > options.limit;
  };
  limiter.reset = (request) => {
    attempts.delete(keyFor(request));
  };
  return limiter;
}
