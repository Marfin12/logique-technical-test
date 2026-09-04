import type {
  ProductCatalogItemDto,
  ProductCatalogResponseDto,
  ProductDetailDto,
  ProductDetailResponseDto,
} from "@insurance/contracts";

import type { ProductStore } from "../database/product-repository.js";
import { requireRole, type Principal } from "../domain/authorization.js";
import {
  ProductIneligibleError,
  ProductUnavailableError,
  ProfileIncompleteError,
} from "../domain/errors.js";
import { calculatePremium, eligibilityReasons } from "../domain/product.js";
import type {
  MasterProfileDocument,
  ProductDocument,
  ProductVersionDocument,
} from "../models/persistence.js";

export interface ProductProfileLookup {
  findByUserId(userId: string): Promise<MasterProfileDocument | null>;
}

function catalogItem(
  product: ProductDocument,
  version: ProductVersionDocument,
  profile: MasterProfileDocument,
): ProductCatalogItemDto {
  return {
    id: product._id.toHexString(),
    versionId: version._id.toHexString(),
    version: version.version,
    name: product.name,
    insuranceTypes: version.insuranceTypes,
    description: version.description,
    premium: calculatePremium(profile, version.ratingConfig),
    testOnly: product.testOnly || version.testOnly,
  };
}

function detail(
  product: ProductDocument,
  version: ProductVersionDocument,
  profile: MasterProfileDocument,
): ProductDetailDto {
  return {
    ...catalogItem(product, version, profile),
    coverage: version.coverage,
    benefits: version.benefits,
    limitations: version.limitations,
    supplementalSchema: version.supplementalSchema,
  };
}

export class ProductService {
  constructor(
    private readonly profiles: ProductProfileLookup,
    private readonly products: ProductStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async catalog(principal: Principal): Promise<ProductCatalogResponseDto> {
    requireRole(principal, ["USER"]);
    const profile = await this.profiles.findByUserId(principal.id);
    if (!profile) throw new ProfileIncompleteError();
    const candidates = await this.products.listActive(this.now());
    return {
      items: candidates.flatMap(({ product, version }) =>
        eligibilityReasons(profile, version.eligibilityConfig).length === 0
          ? [catalogItem(product, version, profile)]
          : [],
      ),
    };
  }

  async getDetail(
    principal: Principal,
    productId: string,
  ): Promise<ProductDetailResponseDto> {
    requireRole(principal, ["USER"]);
    const profile = await this.profiles.findByUserId(principal.id);
    if (!profile) throw new ProfileIncompleteError();
    const candidate = await this.products.findActiveById(productId, this.now());
    if (!candidate) throw new ProductUnavailableError();
    const reasons = eligibilityReasons(
      profile,
      candidate.version.eligibilityConfig,
    );
    if (reasons.length) throw new ProductIneligibleError(reasons);
    return {
      product: detail(candidate.product, candidate.version, profile),
    };
  }
}
