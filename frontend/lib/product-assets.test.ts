import { describe, expect, it } from "vitest";

import { productHero, productTypeVisual } from "./product-assets";

describe("product assets", () => {
  it("maps each demo product and travel type to its supplied image", () => {
    expect(productHero("Simple Life")?.src).toContain("simple_life.png");
    expect(productHero("Simple Health")?.src).toContain("simple_health.png");
    expect(productHero("Simple Travel")?.src).toContain("simple_travel.png");
    expect(productTypeVisual("Simple Travel", "INDIVIDUAL")?.src).toContain(
      "travel_type_individual.png",
    );
    expect(productTypeVisual("Simple Travel", "FAMILY")?.src).toContain(
      "travel_type_family.png",
    );
  });

  it("returns no image for unknown approved catalog content", () => {
    expect(productHero("Future Product")).toBeUndefined();
    expect(productTypeVisual("Simple Travel", "GROUP")).toBeUndefined();
  });
});
