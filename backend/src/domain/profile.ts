import {
  PAYMENT_FREQUENCIES,
  PAYMENT_METHODS,
  type PaymentFrequency,
  type PaymentMethod,
} from "@insurance/contracts";
import type { Decimal128 } from "mongodb";

import { DomainValidationError } from "./errors.js";
import { moneyFromDto } from "./money.js";

export interface ValidProfileInput {
  age: number;
  sumAssured: Decimal128;
  currency: string;
  paymentFrequency: PaymentFrequency;
  paymentMethod: PaymentMethod;
}

export function parseProfileInput(value: unknown): ValidProfileInput {
  const input = value as Record<string, unknown> | null;
  const money = input?.sumAssured as Record<string, unknown> | null;
  const fields = [];

  if (!Number.isInteger(input?.age) || Number(input?.age) <= 0) {
    fields.push({ field: "age", message: "Age must be a positive integer." });
  }
  if (
    !money ||
    typeof money.amount !== "string" ||
    !/^(?!0(?:\.0{1,2})?$)(0|[1-9]\d*)(\.\d{1,2})?$/.test(money.amount) ||
    typeof money.currency !== "string" ||
    !/^[A-Z]{3}$/.test(money.currency)
  ) {
    fields.push({
      field: "sumAssured.amount",
      message: "Sum assured must be a positive decimal amount.",
    });
  }
  if (!PAYMENT_FREQUENCIES.includes(input?.paymentFrequency as never)) {
    fields.push({
      field: "paymentFrequency",
      message: "Select a supported payment frequency.",
    });
  }
  if (!PAYMENT_METHODS.includes(input?.paymentMethod as never)) {
    fields.push({
      field: "paymentMethod",
      message: "Select a supported payment method.",
    });
  }
  if (fields.length > 0) {
    throw new DomainValidationError("Profile validation failed.", fields);
  }

  const parsedMoney = moneyFromDto(
    money!.amount as string,
    money!.currency as string,
  );
  return {
    age: input!.age as number,
    sumAssured: parsedMoney.amount,
    currency: parsedMoney.currency,
    paymentFrequency: input!.paymentFrequency as PaymentFrequency,
    paymentMethod: input!.paymentMethod as PaymentMethod,
  };
}
