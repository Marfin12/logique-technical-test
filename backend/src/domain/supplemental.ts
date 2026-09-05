import type { SupplementalFieldDto } from "@insurance/contracts";
import { DomainValidationError } from "./errors.js";

function valid(field: SupplementalFieldDto, value: unknown): boolean {
  switch (field.type) {
    case "text":
    case "multiline":
      return typeof value === "string";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "decimal":
      return (
        (typeof value === "number" && Number.isFinite(value)) ||
        (typeof value === "string" && /^\d+(\.\d+)?$/.test(value))
      );
    case "date":
      return typeof value === "string" && !Number.isNaN(Date.parse(value));
    case "boolean":
      return typeof value === "boolean";
    case "single-select":
      return typeof value === "string" && !!field.options?.includes(value);
    case "multi-select":
      return (
        Array.isArray(value) &&
        value.every(
          (v) => typeof v === "string" && !!field.options?.includes(v),
        )
      );
  }
}

export function validateDraftTrigger(
  schema: { fields: SupplementalFieldDto[] },
  insuranceTypes: string[],
  trigger: unknown,
) {
  if (!trigger || typeof trigger !== "object")
    throw new DomainValidationError("A draft trigger is required.");
  const value = trigger as Record<string, unknown>;
  if (value.kind === "INSURANCE_TYPE_SELECTED") {
    if (
      typeof value.insuranceType !== "string" ||
      !insuranceTypes.includes(value.insuranceType)
    )
      throw new DomainValidationError(
        "The selected insurance type is not available.",
      );
    return {
      selectedInsuranceType: value.insuranceType,
      supplementalData: {} as Record<string, unknown>,
    };
  }
  if (value.kind === "SUPPLEMENTAL_FIELD_CHANGED") {
    const field = schema.fields.find((item) => item.key === value.fieldKey);
    if (!field || !valid(field, value.value))
      throw new DomainValidationError("The supplemental value is invalid.");
    return {
      supplementalData: { [field.key]: value.value } as Record<string, unknown>,
    };
  }
  throw new DomainValidationError("A valid draft trigger is required.");
}

export function validateSupplementalPatch(
  schema: { fields: SupplementalFieldDto[] },
  data: Record<string, unknown>,
) {
  const allowed = new Map(schema.fields.map((field) => [field.key, field]));
  for (const [key, value] of Object.entries(data)) {
    const field = allowed.get(key);
    if (!field || !valid(field, value))
      throw new DomainValidationError(`Invalid supplemental field: ${key}.`);
  }
}

export function validateRequiredSupplemental(
  schema: { fields: SupplementalFieldDto[] },
  data: Record<string, unknown>,
) {
  validateSupplementalPatch(schema, data);
  const missing = schema.fields.filter((field) => {
    const value = data[field.key];
    return (
      field.required &&
      (value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0))
    );
  });
  if (missing.length)
    throw new DomainValidationError(
      "Complete all required product details before applying.",
      missing.map((field) => ({
        field: field.key,
        message: "This field is required.",
      })),
    );
}
