import { describe, expect, it } from "vitest";

import {
  ADMIN_APPLICATION_STATUSES,
  APPLICATION_STATUSES,
  PAYMENT_FREQUENCIES,
  PAYMENT_METHODS,
  ROLES,
  type ErrorDto,
  type MoneyDto,
} from "./index.js";

describe("shared contracts", () => {
  it("defines the canonical FSD values", () => {
    expect(ROLES).toEqual(["USER", "ADMIN"]);
    expect(PAYMENT_FREQUENCIES).toEqual([
      "MONTHLY",
      "QUARTERLY",
      "SEMI_ANNUALLY",
      "ANNUALLY",
    ]);
    expect(PAYMENT_METHODS).toEqual(["RECURRING", "ONE_TIME"]);
    expect(APPLICATION_STATUSES).toEqual([
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "APPROVED",
      "REJECTED",
    ]);
    expect(ADMIN_APPLICATION_STATUSES).not.toContain("DRAFT");
  });

  it("uses decimal strings and a stable error envelope", () => {
    const money: MoneyDto = { amount: "1250.50", currency: "IDR" };
    const error: ErrorDto = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        fields: [{ field: "age", message: "Must be positive." }],
      },
    };
    expect(money.amount).toBe("1250.50");
    expect(error.error.fields?.[0]?.field).toBe("age");
  });
});
