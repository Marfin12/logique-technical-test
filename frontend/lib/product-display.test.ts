import { describe, expect, it } from "vitest";

import { formatInsuranceType, formatMoney } from "./product-display";

describe("Phase 3 product display", () => {
  it("formats the exact server amount without recalculating it", () => {
    expect(formatMoney("108000.00", "IDR")).toBe("IDR 108,000.00");
    expect(formatMoney("9007199254740993.75", "IDR")).toBe(
      "IDR 9,007,199,254,740,993.75",
    );
  });

  it("renders stable insurance type values as readable labels", () => {
    expect(formatInsuranceType("INDIVIDUAL_HEALTH")).toBe("Individual Health");
  });
});
