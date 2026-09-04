import { describe, expect, it } from "vitest";
import { validateDraftTrigger, validateSupplementalPatch } from "./supplemental.js";

const schema = { fields: [{ key: "hasCondition", label: "Condition", type: "boolean" as const, required: true }] };
describe("draft supplemental schema", () => {
  it("accepts a configured trigger and rejects unknown fields", () => {
    expect(validateDraftTrigger(schema, ["TERM_LIFE"], { kind: "INSURANCE_TYPE_SELECTED", insuranceType: "TERM_LIFE" }).selectedInsuranceType).toBe("TERM_LIFE");
    expect(() => validateSupplementalPatch(schema, { unknown: true })).toThrow();
  });
  it("validates product-specific values", () => {
    expect(validateDraftTrigger(schema, ["HEALTH"], { kind: "SUPPLEMENTAL_FIELD_CHANGED", fieldKey: "hasCondition", value: true }).supplementalData).toEqual({ hasCondition: true });
    expect(() => validateDraftTrigger(schema, ["HEALTH"], { kind: "SUPPLEMENTAL_FIELD_CHANGED", fieldKey: "hasCondition", value: "yes" })).toThrow();
  });
});
