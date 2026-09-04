import { createHash } from "node:crypto";

import { ValidationError } from "./errors.js";

const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const SCOPE_PATTERN = /^[a-z][a-z0-9.-]{2,63}$/;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

export function parseIdempotencyKey(value: unknown): string {
  if (typeof value !== "string" || !KEY_PATTERN.test(value)) {
    throw new ValidationError(
      "Idempotency-Key must be 8-128 safe ASCII characters.",
    );
  }
  return value;
}

export function parseCommandScope(value: string): string {
  if (!SCOPE_PATTERN.test(value)) {
    throw new ValidationError("Invalid idempotency command scope.");
  }
  return value;
}

export function requestFingerprint(payload: unknown): string {
  return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}
