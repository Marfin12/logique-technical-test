import { Decimal128, ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import type {
  EligibilityConfigDocument,
  MasterProfileDocument,
  RatingConfigDocument,
} from "../models/persistence.js";
import { calculatePremium, eligibilityReasons } from "./product.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function profile(
  overrides: Partial<MasterProfileDocument> = {},
): MasterProfileDocument {
  return {
    _id: new ObjectId(),
    userId: new ObjectId(),
    age: 35,
    sumAssured: Decimal128.fromString("500000000.00"),
    currency: "IDR",
    paymentFrequency: "MONTHLY",
    paymentMethod: "RECURRING",
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const eligibility: EligibilityConfigDocument = {
  minimumAge: 18,
  maximumAge: 60,
  minimumSumAssured: Decimal128.fromString("50000000.00"),
  maximumSumAssured: Decimal128.fromString("500000000.00"),
  currency: "IDR",
  paymentFrequencies: ["MONTHLY", "ANNUALLY"],
  paymentMethods: ["RECURRING"],
};

const rating: RatingConfigDocument = {
  version: 1,
  ratePerThousand: Decimal128.fromString("2.40"),
  frequencyFactors: {
    MONTHLY: Decimal128.fromString("0.09"),
    QUARTERLY: Decimal128.fromString("0.26"),
    SEMI_ANNUALLY: Decimal128.fromString("0.52"),
    ANNUALLY: Decimal128.fromString("0.95"),
  },
  paymentMethodFactors: {
    RECURRING: Decimal128.fromString("1.00"),
    ONE_TIME: Decimal128.fromString("0.98"),
  },
  roundingScale: 2,
};

describe("Phase 3 product eligibility and premium", () => {
  it("treats configured age and sum-assured boundaries as inclusive", () => {
    expect(
      eligibilityReasons(
        profile({
          age: 18,
          sumAssured: Decimal128.fromString("50000000.00"),
        }),
        eligibility,
      ),
    ).toEqual([]);
    expect(
      eligibilityReasons(
        profile({
          age: 60,
          sumAssured: Decimal128.fromString("500000000.00"),
        }),
        eligibility,
      ),
    ).toEqual([]);
  });

  it("returns every applicable safe ineligibility reason", () => {
    expect(
      eligibilityReasons(
        profile({
          age: 61,
          sumAssured: Decimal128.fromString("600000000.00"),
          currency: "USD",
          paymentFrequency: "QUARTERLY",
          paymentMethod: "ONE_TIME",
        }),
        eligibility,
      ),
    ).toEqual([
      "AGE_ABOVE_MAXIMUM",
      "SUM_ASSURED_ABOVE_MAXIMUM",
      "CURRENCY_UNSUPPORTED",
      "PAYMENT_FREQUENCY_UNSUPPORTED",
      "PAYMENT_METHOD_UNSUPPORTED",
    ]);
  });

  it("applies configured frequency and method factors using decimal arithmetic", () => {
    expect(calculatePremium(profile(), rating)).toEqual({
      amount: "108000.00",
      currency: "IDR",
      paymentFrequency: "MONTHLY",
    });
    expect(
      calculatePremium(
        profile({ paymentFrequency: "ANNUALLY", paymentMethod: "ONE_TIME" }),
        rating,
      ).amount,
    ).toBe("1117200.00");
  });

  it("rounds half up at the configured decimal scale", () => {
    expect(
      calculatePremium(profile({ sumAssured: Decimal128.fromString("5.00") }), {
        ...rating,
        ratePerThousand: Decimal128.fromString("1.00"),
        frequencyFactors: {
          ...rating.frequencyFactors,
          MONTHLY: Decimal128.fromString("1.00"),
        },
      }).amount,
    ).toBe("0.01");
  });
});
