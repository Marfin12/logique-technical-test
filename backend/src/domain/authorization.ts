import type { Role } from "@insurance/contracts";

import { ForbiddenError } from "./errors.js";

export interface Principal {
  id: string;
  role: Role;
}

export function requireRole(principal: Principal, allowed: readonly Role[]) {
  if (!allowed.includes(principal.role)) {
    throw new ForbiddenError();
  }
}

export function requireOwnership(principal: Principal, ownerId: string) {
  requireRole(principal, ["USER"]);
  if (principal.id !== ownerId) {
    throw new ForbiddenError();
  }
}
