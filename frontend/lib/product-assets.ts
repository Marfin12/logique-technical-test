export interface ProductVisual {
  src: string;
  alt: string;
}

interface ProductAssetSet {
  hero: ProductVisual;
  types: Readonly<Record<string, ProductVisual>>;
}

const PRODUCT_ASSETS: Readonly<Record<string, ProductAssetSet>> = {
  "simple life": {
    hero: {
      src: "/images/insurance_product_simple_life.png",
      alt: "Family representing Simple Life insurance",
    },
    types: {
      TERM_LIFE: {
        src: "/images/insurance_product_simple_life_type_term_life.png",
        alt: "Illustration of term life protection for a family",
      },
    },
  },
  "simple health": {
    hero: {
      src: "/images/insurance_product_simple_health.png",
      alt: "Patient speaking with a doctor about Simple Health insurance",
    },
    types: {
      INDIVIDUAL_HEALTH: {
        src: "/images/insurance_product_simple_health_type_individual.png",
        alt: "Illustration of individual health protection",
      },
    },
  },
  "simple travel": {
    hero: {
      src: "/images/insurance_product_simple_travel.png",
      alt: "Travellers at an airport representing Simple Travel insurance",
    },
    types: {
      INDIVIDUAL: {
        src: "/images/insurance_product_simple_travel_type_individual.png",
        alt: "Illustration of individual travel protection",
      },
      FAMILY: {
        src: "/images/insurance_product_simple_travel_type_family.png",
        alt: "Illustration of family travel protection",
      },
    },
  },
};

export function productHero(productName: string): ProductVisual | undefined {
  return PRODUCT_ASSETS[productName.trim().toLowerCase()]?.hero;
}

export function productTypeVisual(
  productName: string,
  insuranceType: string,
): ProductVisual | undefined {
  return PRODUCT_ASSETS[productName.trim().toLowerCase()]?.types[insuranceType];
}
