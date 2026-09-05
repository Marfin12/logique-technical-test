import type { ApplicationDto } from "@insurance/contracts";
import { formatWibDateTime } from "../lib/date-time";
import { PAYMENT_FREQUENCY_LABELS } from "../lib/payment-labels";
import {
  displayProductName,
  formatInsuranceType,
  formatMoney,
} from "../lib/product-display";

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const strings = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
export function ApplicationProgress({
  application,
}: {
  application: ApplicationDto;
}) {
  const product = record(application.productSnapshot);
  const premium = record(application.premiumSnapshot);
  const coverage = record(product.coverage);
  const details = record(application.supplementalData);
  const currency =
    typeof premium.currency === "string" ? premium.currency : "IDR";
  const amount = typeof premium.amount === "string" ? premium.amount : "0";
  const frequency =
    typeof premium.paymentFrequency === "string"
      ? premium.paymentFrequency
      : "";
  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-xl bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Product
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">
          {typeof product.name === "string"
            ? displayProductName(product.name)
            : `Product ${application.productId.slice(-6)}`}
        </h2>
        <p className="mt-2 text-slate-600">
          {typeof product.description === "string"
            ? product.description
            : "Submitted insurance product"}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">Insurance type</dt>
            <dd className="font-semibold">
              {application.selectedInsuranceType
                ? formatInsuranceType(application.selectedInsuranceType)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">
              Product version
            </dt>
            <dd className="font-semibold">
              {typeof product.version === "number" ? product.version : "—"}
            </dd>
          </div>
        </dl>
        {Object.keys(coverage).length ? (
          <div className="mt-4">
            <h3 className="font-semibold">Coverage</h3>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              {Object.entries(coverage).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs text-slate-500">
                    {formatInsuranceType(key)}
                  </dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
        {strings(product.benefits).length ? (
          <div className="mt-4">
            <h3 className="font-semibold">Benefits</h3>
            <ul className="mt-2 list-disc pl-5 text-slate-600">
              {strings(product.benefits).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {strings(product.limitations).length ? (
          <div className="mt-4">
            <h3 className="font-semibold">Limitations</h3>
            <ul className="mt-2 list-disc pl-5 text-slate-600">
              {strings(product.limitations).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-950">Submitted premium</h2>
        <p className="mt-2 text-2xl font-bold text-blue-950">
          {formatMoney(amount, currency)}
        </p>
        <p className="text-sm text-slate-600">
          {frequency in PAYMENT_FREQUENCY_LABELS
            ? PAYMENT_FREQUENCY_LABELS[
                frequency as keyof typeof PAYMENT_FREQUENCY_LABELS
              ]
            : frequency}
        </p>
      </section>
      <section>
        <h2 className="font-bold text-slate-950">Submitted product details</h2>
        {Object.keys(details).length ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.entries(details).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-slate-50 p-3">
                <dt className="text-xs uppercase text-slate-500">
                  {formatInsuranceType(key)}
                </dt>
                <dd className="mt-1 font-medium">
                  {Array.isArray(value)
                    ? value.join(", ")
                    : typeof value === "boolean"
                      ? value
                        ? "Yes"
                        : "No"
                      : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-slate-600">
            No additional product-specific details were required.
          </p>
        )}
      </section>
      <section>
        <h2 className="font-bold text-slate-950">Application progress</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">Current status</dt>
            <dd className="font-bold text-blue-800">
              {application.status.replaceAll("_", " ")}
            </dd>
          </div>
          {application.submittedAt ? (
            <div>
              <dt className="text-xs uppercase text-slate-500">Submitted</dt>
              <dd>{formatWibDateTime(application.submittedAt)}</dd>
            </div>
          ) : null}
          {application.reviewStartedAt ? (
            <div>
              <dt className="text-xs uppercase text-slate-500">
                Review started
              </dt>
              <dd>{formatWibDateTime(application.reviewStartedAt)}</dd>
            </div>
          ) : null}
          {application.approvedAt ? (
            <div>
              <dt className="text-xs uppercase text-slate-500">Approved</dt>
              <dd>{formatWibDateTime(application.approvedAt)}</dd>
            </div>
          ) : null}
          {application.rejectedAt ? (
            <div>
              <dt className="text-xs uppercase text-slate-500">Rejected</dt>
              <dd>{formatWibDateTime(application.rejectedAt)}</dd>
            </div>
          ) : null}
        </dl>
        {application.status === "REJECTED" ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="font-bold text-red-900">Rejection note</h3>
            <p className="mt-1 text-red-800">
              {application.rejectionReason ?? "No rejection note was provided."}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
