import type { PaymentFrequency, PaymentMethod } from "@insurance/contracts";

export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly (3 Months)",
  SEMI_ANNUALLY: "Semi-Annually (6 Months)",
  ANNUALLY: "Annually",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  RECURRING: "Recurring",
  ONE_TIME: "One-time",
};
