import Link from "next/link";

import { AuthenticatedShell } from "../../../components/authenticated-shell";
import { Panel } from "../../../components/panel";
import { PAYMENT_FREQUENCY_LABELS } from "../../../lib/payment-labels";
import { formatInsuranceType, formatMoney } from "../../../lib/product-display";
import { requireUser } from "../../../lib/server-auth";
import { productDetail } from "../../../lib/server-products";
import { ProductApplicationForm } from "../../../components/product-application-form";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const account = await requireUser();
  const { productId } = await params;
  const result = await productDetail(productId);

  return (
    <AuthenticatedShell account={account} area="user">
      <Link
        href="/products"
        className="text-sm font-semibold text-blue-700 hover:underline"
      >
        ← Back to products
      </Link>
      {result.state !== "available" ? (
        <Panel className="mt-6 max-w-2xl p-8">
          <h1 className="text-2xl font-bold text-slate-950">
            {result.state === "ineligible"
              ? "Product not compatible"
              : "Product unavailable"}
          </h1>
          <p className="mt-3 text-slate-600">{result.error.error.message}</p>
          {result.error.error.reasonCodes?.length ? (
            <p className="mt-4 text-sm text-slate-500">
              Reason: {result.error.error.reasonCodes.join(", ")}
            </p>
          ) : null}
        </Panel>
      ) : (
        <article className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Panel className="p-6 sm:p-9">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                  Insurance product
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950">
                  {result.product.name}
                </h1>
              </div>
              {result.product.testOnly ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
                  Test only
                </span>
              ) : null}
            </div>
            <p className="mt-5 leading-7 text-slate-600">
              {result.product.description}
            </p>

            <section className="mt-8">
              <h2 className="text-lg font-bold text-slate-950">
                Insurance types
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {result.product.insuranceTypes.map((type) => (
                  <li
                    key={type}
                    className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800"
                  >
                    {formatInsuranceType(type)}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-lg font-bold text-slate-950">Coverage</h2>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {Object.entries(result.product.coverage).map(([key, value]) => (
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
                  {result.product.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-950">
                  Limitations
                </h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-600">
                  {result.product.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="mt-8 border-t border-slate-200 pt-6">
              <h2 className="text-lg font-bold text-slate-950">
                Required application details
              </h2>
              {result.product.supplementalSchema.fields.length ? (
                <ul className="mt-3 space-y-2 text-slate-600">
                  {result.product.supplementalSchema.fields.map((field) => (
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
              <ProductApplicationForm product={result.product} />
            </section>
          </Panel>

          <aside>
            <Panel className="sticky top-6 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Server-calculated premium
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-950">
                {formatMoney(
                  result.product.premium.amount,
                  result.product.premium.currency,
                )}
              </p>
              <p className="mt-1 text-slate-600">
                {
                  PAYMENT_FREQUENCY_LABELS[
                    result.product.premium.paymentFrequency
                  ]
                }
              </p>
              <p className="mt-5 text-sm leading-6 text-slate-500">
                This simulation uses your saved profile and current product
                version. Application actions begin in the next lifecycle phase.
              </p>
            </Panel>
          </aside>
        </article>
      )}
    </AuthenticatedShell>
  );
}
