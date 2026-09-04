import type {
  PremiumQuoteDto,
  ProductEligibilityReasonCode,
} from "@insurance/contracts";
import type { Decimal128 } from "mongodb";

import type {
  EligibilityConfigDocument,
  MasterProfileDocument,
  RatingConfigDocument,
} from "../models/persistence.js";

interface DecimalParts {
  coefficient: bigint;
  scale: number;
}

function decimalParts(value: Decimal128): DecimalParts {
  const text = value.toString();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match)
    throw new Error("Product configuration contains an invalid decimal.");
  const fraction = match[2] ?? "";
  return {
    coefficient: BigInt(`${match[1]}${fraction}`),
    scale: fraction.length,
  };
}

function powerOfTen(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

function compareDecimal(left: Decimal128, right: Decimal128): number {
  const a = decimalParts(left);
  const b = decimalParts(right);
  const scale = Math.max(a.scale, b.scale);
  const normalizedA = a.coefficient * powerOfTen(scale - a.scale);
  const normalizedB = b.coefficient * powerOfTen(scale - b.scale);
  return normalizedA < normalizedB ? -1 : normalizedA > normalizedB ? 1 : 0;
}

function roundedProduct(
  values: Decimal128[],
  divisor: bigint,
  outputScale: number,
): string {
  if (!Number.isInteger(outputScale) || outputScale < 0 || outputScale > 6) {
    throw new Error(
      "Product configuration contains an invalid rounding scale.",
    );
  }
  const parts = values.map(decimalParts);
  if (parts.some(({ coefficient }) => coefficient <= 0n)) {
    throw new Error("Product rating values must be positive decimals.");
  }
  const numerator =
    parts.reduce((total, value) => total * value.coefficient, 1n) *
    powerOfTen(outputScale);
  const denominator =
    divisor *
    powerOfTen(parts.reduce((total, value) => total + value.scale, 0));
  let result = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder * 2n >= denominator) result += 1n;

  if (outputScale === 0) return result.toString();
  const raw = result.toString().padStart(outputScale + 1, "0");
  return `${raw.slice(0, -outputScale)}.${raw.slice(-outputScale)}`;
}

export function eligibilityReasons(
  profile: MasterProfileDocument,
  config: EligibilityConfigDocument,
): ProductEligibilityReasonCode[] {
  if (
    config.minimumAge > config.maximumAge ||
    compareDecimal(config.minimumSumAssured, config.maximumSumAssured) > 0
  ) {
    throw new Error("Product eligibility configuration is inconsistent.");
  }
  const reasons: ProductEligibilityReasonCode[] = [];
  if (profile.age < config.minimumAge) reasons.push("AGE_BELOW_MINIMUM");
  if (profile.age > config.maximumAge) reasons.push("AGE_ABOVE_MAXIMUM");
  if (compareDecimal(profile.sumAssured, config.minimumSumAssured) < 0) {
    reasons.push("SUM_ASSURED_BELOW_MINIMUM");
  }
  if (compareDecimal(profile.sumAssured, config.maximumSumAssured) > 0) {
    reasons.push("SUM_ASSURED_ABOVE_MAXIMUM");
  }
  if (profile.currency !== config.currency)
    reasons.push("CURRENCY_UNSUPPORTED");
  if (!config.paymentFrequencies.includes(profile.paymentFrequency)) {
    reasons.push("PAYMENT_FREQUENCY_UNSUPPORTED");
  }
  if (!config.paymentMethods.includes(profile.paymentMethod)) {
    reasons.push("PAYMENT_METHOD_UNSUPPORTED");
  }
  return reasons;
}

export function calculatePremium(
  profile: MasterProfileDocument,
  config: RatingConfigDocument,
): PremiumQuoteDto {
  const frequencyFactor = config.frequencyFactors[profile.paymentFrequency];
  const methodFactor = config.paymentMethodFactors[profile.paymentMethod];
  if (!frequencyFactor || !methodFactor) {
    throw new Error("Product rating configuration is incomplete.");
  }
  return {
    amount: roundedProduct(
      [
        profile.sumAssured,
        config.ratePerThousand,
        frequencyFactor,
        methodFactor,
      ],
      1_000n,
      config.roundingScale,
    ),
    currency: profile.currency,
    paymentFrequency: profile.paymentFrequency,
  };
}
