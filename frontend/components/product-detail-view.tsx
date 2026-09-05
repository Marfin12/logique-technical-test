import Image from "next/image";
import Link from "next/link";

import type { ApplicationDto, ProductDetailDto } from "@insurance/contracts";

import { PAYMENT_FREQUENCY_LABELS } from "../lib/payment-labels";
import { productHero, productTypeVisual } from "../lib/product-assets";
import {
  displayProductName,
  formatInsuranceType,
  formatMoney,
} from "../lib/product-display";
import { Panel } from "./panel";
import { ProductApplicationForm } from "./product-application-form";

export function ProductDetailView({
  product,
  initialApplication,
  backHref,
  backLabel,
}: {
  product: ProductDetailDto;
  initialApplication?: ApplicationDto;
  backHref: string;
  backLabel: string;
}) {
  const hero = productHero(product.name);
  return (
    <>
      <Link
        href={backHref}
        className="text-sm font-semibold text-blue-700 hover:underline"
      >
        ← {backLabel}
      </Link>
      <article className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel className="p-6 sm:p-9">
          {hero ? (
            <div className="relative mb-8 aspect-video overflow-hidden rounded-xl bg-slate-100">
              <Image
                src={hero.src}
                alt={hero.alt}
                fill
                sizes="(min-width: 1024px) 65vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                {initialApplication ? "Draft application" : "Insurance product"}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                {displayProductName(product.name)}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {initialApplication ? (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-900">
                  Draft
                </span>
              ) : null}
              {product.testOnly ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
                  Demo configuration
                </span>
              ) : null}
            </div>
          </div>
          <p className="mt-5 leading-7 text-slate-600">{product.description}</p>

          <section className="mt-8">
            <h2 className="text-lg font-bold text-slate-950">
              Insurance types
            </h2>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2">
              {product.insuranceTypes.map((type) => {
                const visual = productTypeVisual(product.name, type);
                return (
                  <li
                    key={type}
                    className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50"
                  >
                    {visual ? (
                      <div className="relative aspect-video bg-slate-100">
                        <Image
                          src={visual.src}
                          alt={visual.alt}
                          fill
                          sizes="(min-width: 640px) 40vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                    <p className="px-3 py-2 text-sm font-semibold text-blue-800">
                      {formatInsuranceType(type)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-bold text-slate-950">Coverage</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {Object.entries(product.coverage).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-semibold uppercase text-slate-500">
                    {formatInsuranceType(key)}
                  </dt>
                  <dd className="mt-1 text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <section>
              <h2 className="text-lg font-bold text-slate-950">Benefits</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-600">
                {product.benefits.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-950">Limitations</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-600">
                {product.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold text-slate-950">
              Required application details
            </h2>
            {product.supplementalSchema.fields.length ? (
              <ul className="mt-3 space-y-2 text-slate-600">
                {product.supplementalSchema.fields.map((field) => (
                  <li key={field.key}>
                    {field.label}
                    {field.required ? " (required)" : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-slate-600">
                No additional product-specific details.
              </p>
            )}
            <ProductApplicationForm
              product={product}
              initialApplication={initialApplication}
            />
          </section>
        </Panel>

        <aside>
          <Panel className="sticky top-6 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Server-calculated premium
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-950">
              {formatMoney(product.premium.amount, product.premium.currency)}
            </p>
            <p className="mt-1 text-slate-600">
              {PAYMENT_FREQUENCY_LABELS[product.premium.paymentFrequency]}
            </p>
            <p className="mt-5 text-sm leading-6 text-slate-500">
              This simulation uses your saved profile and current product
              version.{" "}
              {initialApplication
                ? "Application changes are saved to this draft."
                : "Choosing a type or changing a product field creates a draft."}
            </p>
          </Panel>
        </aside>
      </article>
    </>
  );
}
