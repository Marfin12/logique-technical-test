import { createHmac, timingSafeEqual } from "node:crypto";

import type { Role } from "@insurance/contracts";

import { UnauthorizedError } from "./errors.js";

export const SESSION_COOKIE = "insurance_session";
export const SESSION_TTL_SECONDS = 30 * 60;

export interface SessionPrincipal {
  id: string;
  role: Role;
}

interface SessionPayload extends SessionPrincipal {
  issuedAt: number;
  expiresAt: number;
}

function signature(value: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(value).digest();
}

export class SessionCodec {
  constructor(
    private readonly secret: string,
    private readonly now: () => number = () => Date.now(),
  ) {}

  issue(principal: SessionPrincipal): string {
    const issuedAt = Math.floor(this.now() / 1000);
    const payload: SessionPayload = {
      ...principal,
      issuedAt,
      expiresAt: issuedAt + SESSION_TTL_SECONDS,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${encoded}.${signature(encoded, this.secret).toString("base64url")}`;
  }

  verify(token: string): SessionPrincipal {
    const [encoded, providedSignature, extra] = token.split(".");
    if (!encoded || !providedSignature || extra) throw new UnauthorizedError();

    const expected = signature(encoded, this.secret);
    const provided = Buffer.from(providedSignature, "base64url");
    if (
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    ) {
      throw new UnauthorizedError();
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encoded, "base64url").toString("utf8"),
      ) as Partial<SessionPayload>;
      const now = Math.floor(this.now() / 1000);
      if (
        typeof payload.id !== "string" ||
        !["USER", "ADMIN"].includes(payload.role ?? "") ||
        typeof payload.expiresAt !== "number" ||
        payload.expiresAt <= now
      ) {
        throw new UnauthorizedError();
      }
      return { id: payload.id, role: payload.role as Role };
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      throw new UnauthorizedError();
    }
  }
}
