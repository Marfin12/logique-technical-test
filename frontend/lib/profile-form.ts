import type { FieldErrorDto } from "@insurance/contracts";

export interface ProfileFormValues {
  age: string;
  sumAssured: string;
  paymentFrequency: string;
  paymentMethod: string;
}

export function validateProfileForm(
  values: ProfileFormValues,
): FieldErrorDto[] {
  const fields: FieldErrorDto[] = [];
  const age = Number(values.age);
  if (!Number.isInteger(age) || age <= 0) {
    fields.push({ field: "age", message: "Enter a positive whole number." });
  }
  if (
    !/^(?!0(?:\.0{1,2})?$)(0|[1-9]\d*)(\.\d{1,2})?$/.test(values.sumAssured)
  ) {
    fields.push({
      field: "sumAssured.amount",
      message: "Enter a positive amount with up to two decimal places.",
    });
  }
  if (!values.paymentFrequency) {
    fields.push({ field: "paymentFrequency", message: "Select a frequency." });
  }
  if (!values.paymentMethod) {
    fields.push({ field: "paymentMethod", message: "Select a method." });
  }
  return fields;
}
