import { describe, expect, it } from "vitest";

import { hashPassword, normalizeEmail, verifyPassword } from "./credentials.js";
import { parseProfileInput } from "./profile.js";
import { SessionCodec, SESSION_TTL_SECONDS } from "./session.js";

describe("Phase 2 authentication primitives", () => {
  it("hashes and verifies passwords without storing plaintext", async () => {
    const hash = await hashPassword("CorrectHorse123!", Buffer.alloc(16, 7));
    expect(hash).not.toContain("CorrectHorse123!");
    expect(await verifyPassword("CorrectHorse123!", hash)).toBe(true);
    expect(await verifyPassword("incorrect-password", hash)).toBe(false);
    expect(normalizeEmail("  USER@Example.TEST ")).toBe("user@example.test");
  });

  it("rejects tampered and expired session tokens", () => {
    let now = Date.parse("2026-01-01T00:00:00.000Z");
    const codec = new SessionCodec("x".repeat(32), () => now);
    const token = codec.issue({ id: "user-1", role: "USER" });
    expect(codec.verify(token)).toEqual({ id: "user-1", role: "USER" });
    expect(() => codec.verify(`${token}x`)).toThrow(/Authentication/);

    now += (SESSION_TTL_SECONDS + 1) * 1000;
    expect(() => codec.verify(token)).toThrow(/Authentication/);
  });

  it("accepts only complete canonical profile values", () => {
    const profile = parseProfileInput({
      age: 35,
      sumAssured: { amount: "500000000.00", currency: "IDR" },
      paymentFrequency: "MONTHLY",
      paymentMethod: "RECURRING",
    });
    expect(profile.sumAssured.toString()).toBe("500000000.00");
    expect(() =>
      parseProfileInput({
        age: 0,
        sumAssured: { amount: "0.00", currency: "IDR" },
        paymentFrequency: "WEEKLY",
        paymentMethod: "CASH",
      }),
    ).toThrow(/Profile validation/);
  });

  it("uses a short session lifetime for the HTTP-only profile", () => {
    expect(SESSION_TTL_SECONDS).toBeLessThanOrEqual(30 * 60);
  });
});
