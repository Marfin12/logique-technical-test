import { Router } from "express";

import type {
  ProductCatalogResponseDto,
  ProductDetailResponseDto,
} from "@insurance/contracts";

import type { SessionCodec } from "../domain/session.js";
import type { ProductService } from "../services/product-service.js";
import { authentication, principalFrom } from "./authentication.js";
import { asyncHandler } from "./middleware.js";

export interface Phase3Dependencies {
  productService: ProductService;
  sessionCodec: SessionCodec;
}

export function phase3Router(dependencies: Phase3Dependencies) {
  const router = Router();
  const requireAuthentication = authentication(dependencies.sessionCodec);

  router.get(
    "/products",
    requireAuthentication,
    asyncHandler(async (_request, response) => {
      const result = await dependencies.productService.catalog(
        principalFrom(response.locals),
      );
      response.json(result satisfies ProductCatalogResponseDto);
    }),
  );

  router.get(
    "/products/:productId",
    requireAuthentication,
    asyncHandler(async (request, response) => {
      const parameter = request.params.productId;
      const productId = Array.isArray(parameter)
        ? (parameter[0] ?? "")
        : (parameter ?? "");
      const result = await dependencies.productService.getDetail(
        principalFrom(response.locals),
        productId,
      );
      response.json(result satisfies ProductDetailResponseDto);
    }),
  );

  return router;
}
