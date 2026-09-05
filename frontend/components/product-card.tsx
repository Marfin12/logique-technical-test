import Link from "next/link";
import Image from "next/image";

import type { ProductCatalogItemDto } from "@insurance/contracts";

import { PAYMENT_FREQUENCY_LABELS } from "../lib/payment-labels";
import { productHero } from "../lib/product-assets";
import {
  displayProductName,
  formatInsuranceType,
  formatMoney,
} from "../lib/product-display";

export function ProductCard({ product }: { product: ProductCatalogItemDto }) {
  const hero = productHero(product.name);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {hero ? (
        <div className="relative aspect-video overflow-hidden bg-slate-100">
          <Image
            src={hero.src}
            alt={hero.alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-950">
            {displayProductName(product.name)}
          </h2>
          {product.testOnly ? (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
              Demo
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm font-medium text-blue-700">
          {product.insuranceTypes.map(formatInsuranceType).join(", ")}
        </p>
        <p className="mt-4 flex-1 leading-7 text-slate-600">
          {product.description}
        </p>
        <div className="mt-6 rounded-xl bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Simulated premium
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-950">
            {formatMoney(product.premium.amount, product.premium.currency)}
          </p>
          <p className="text-sm text-blue-800">
            {PAYMENT_FREQUENCY_LABELS[product.premium.paymentFrequency]}
          </p>
        </div>
        <Link
          href={`/products/${product.id}`}
          className="mt-5 rounded-lg bg-blue-700 px-4 py-3 text-center font-semibold text-white hover:bg-blue-800"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
