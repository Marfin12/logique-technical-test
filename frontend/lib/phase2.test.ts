import { describe, expect, it } from "vitest";

import type { AccountDto } from "@insurance/contracts";

import { PAYMENT_FREQUENCY_LABELS } from "./payment-labels";
import { validateProfileForm } from "./profile-form";
import {
  canAccessAdminArea,
  canAccessUserArea,
  destinationForAccount,
} from "./route-access";

function account(
  role: AccountDto["role"],
  profileComplete: boolean,
): AccountDto {
  return {
    id: "account-id",
    displayName: "Fixture",
    role,
    profileComplete,
  };
}

describe("Phase 2 frontend routing and validation", () => {
  it("routes users by profile completion and admins to their own area", () => {
    expect(destinationForAccount(account("USER", false))).toBe(
      "/profile/setup",
    );
    expect(destinationForAccount(account("USER", true))).toBe("/products");
    expect(destinationForAccount(account("ADMIN", false))).toBe(
      "/admin/applications",
    );
    expect(canAccessUserArea(account("ADMIN", false))).toBe(false);
    expect(canAccessAdminArea(account("USER", true))).toBe(false);
  });

  it("validates all required master profile inputs", () => {
    expect(
      validateProfileForm({
        age: "35",
        sumAssured: "500000000.00",
        paymentFrequency: "MONTHLY",
        paymentMethod: "RECURRING",
      }),
    ).toEqual([]);
    expect(
      validateProfileForm({
        age: "2.5",
        sumAssured: "0",
        paymentFrequency: "",
        paymentMethod: "",
      }),
    ).toHaveLength(4);
  });

  it("shows source month mappings without changing canonical values", () => {
    expect(PAYMENT_FREQUENCY_LABELS.QUARTERLY).toBe("Quarterly (3 Months)");
    expect(PAYMENT_FREQUENCY_LABELS.SEMI_ANNUALLY).toBe(
      "Semi-Annually (6 Months)",
    );
  });
});
