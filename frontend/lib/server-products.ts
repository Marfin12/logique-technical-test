import { redirect } from "next/navigation";

import type {
  ErrorDto,
  ProductCatalogResponseDto,
  ProductDetailDto,
  ProductDetailResponseDto,
} from "@insurance/contracts";

import { authenticatedFetch } from "./server-auth";

export async function productCatalog(): Promise<ProductCatalogResponseDto> {
  const response = await authenticatedFetch("/api/v1/products");
  if (response.status === 401) redirect("/login");
  if (response.status === 403) redirect("/admin/applications");
  if (response.status === 422) redirect("/profile/setup");
  if (!response.ok) throw new Error("Unable to load eligible products.");
  return (await response.json()) as ProductCatalogResponseDto;
}

export type ProductDetailResult =
  | { state: "available"; product: ProductDetailDto }
  | { state: "ineligible"; error: ErrorDto }
  | { state: "unavailable"; error: ErrorDto };

export async function productDetail(
  productId: string,
): Promise<ProductDetailResult> {
  const response = await authenticatedFetch(`/api/v1/products/${productId}`);
  if (response.status === 401) redirect("/login");
  if (response.status === 403) redirect("/admin/applications");
  if (response.status === 422 || response.status === 404) {
    const error = (await response.json()) as ErrorDto;
    if (error.error.code === "PROFILE_INCOMPLETE") redirect("/profile/setup");
    return {
      state: response.status === 404 ? "unavailable" : "ineligible",
      error,
    };
  }
  if (!response.ok) throw new Error("Unable to load this insurance product.");
  const body = (await response.json()) as ProductDetailResponseDto;
  return { state: "available", product: body.product };
}
