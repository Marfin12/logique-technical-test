import { Decimal128 } from "mongodb";

import { ValidationError } from "./errors.js";

const DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export interface MoneyValue {
  amount: Decimal128;
  currency: string;
}

export function moneyFromDto(amount: string, currency: string): MoneyValue {
  if (!DECIMAL_PATTERN.test(amount) || !CURRENCY_PATTERN.test(currency)) {
    throw new ValidationError(
      "Money must use a positive decimal string and ISO currency.",
    );
  }
  return { amount: Decimal128.fromString(amount), currency };
}

export function moneyToDto(value: MoneyValue) {
  return { amount: value.amount.toString(), currency: value.currency };
}

export function toIsoDate(value: Date): string {
  if (Number.isNaN(value.getTime()))
    throw new ValidationError("Invalid UTC timestamp.");
  return value.toISOString();
}
