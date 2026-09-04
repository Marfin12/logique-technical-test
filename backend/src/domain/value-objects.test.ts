import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import { parseIdempotencyKey, requestFingerprint } from "./idempotency.js";
import { moneyFromDto, moneyToDto, toIsoDate } from "./money.js";
import { decodeDateCursor, encodeDateCursor, pageLimit } from "./pagination.js";

describe("Phase 1 value objects", () => {
  it("round-trips decimal-safe money and UTC dates", () => {
    expect(moneyToDto(moneyFromDto("1250.50", "IDR"))).toEqual({
      amount: "1250.50",
      currency: "IDR",
    });
    expect(toIsoDate(new Date("2026-01-02T03:04:05.000Z"))).toBe(
      "2026-01-02T03:04:05.000Z",
    );
    expect(() => moneyFromDto("1e3", "IDR")).toThrow(/Money/);
  });

  it("makes fingerprints independent of object key order", () => {
    expect(requestFingerprint({ b: 2, a: 1 })).toBe(
      requestFingerprint({ a: 1, b: 2 }),
    );
    expect(parseIdempotencyKey("apply:123456")).toBe("apply:123456");
    expect(() => parseIdempotencyKey("short")).toThrow(/Idempotency-Key/);
  });

  it("round-trips keyset cursors and validates limits", () => {
    const original = {
      date: new Date("2026-01-01T00:00:00.000Z"),
      id: new ObjectId(),
    };
    const decoded = decodeDateCursor(encodeDateCursor(original));
    expect(decoded.date).toEqual(original.date);
    expect(decoded.id).toEqual(original.id);
    expect(pageLimit(undefined)).toBe(25);
    expect(() => pageLimit(101)).toThrow(/limit/);
  });
});
