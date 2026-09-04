"use client";

import { useEffect, useState } from "react";
import type { ApplicationDto, ProductDetailDto } from "@insurance/contracts";
import { formatInsuranceType } from "../lib/product-display";

export function ProductApplicationForm({
  product,
  initialApplication,
}: {
  product: ProductDetailDto;
  initialApplication?: ApplicationDto;
}) {
  const [type, setType] = useState(
    initialApplication?.selectedInsuranceType ?? "",
  );
  const [data, setData] = useState<Record<string, unknown>>(
    initialApplication?.supplementalData ?? {},
  );
  const [app, setApp] = useState(initialApplication);
  const [state, setState] = useState("Ready");
  useEffect(() => {
    const fn = (event: BeforeUnloadEvent) => {
      if (state === "Saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [state]);
  async function save(
    trigger: unknown,
    nextType?: string,
    nextData?: Record<string, unknown>,
  ) {
    setState("Saving");
    const body = app
      ? {
          version: app.version,
          ...(nextType ? { selectedInsuranceType: nextType } : {}),
          ...(nextData ? { supplementalData: nextData } : {}),
        }
      : { productId: product.id, productVersionId: product.versionId, trigger };
    const response = await fetch(
      app
        ? `/api/v1/me/applications/${app.id}/draft`
        : "/api/v1/me/applications/drafts",
      {
        method: app ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json",
          ...(app ? {} : { "Idempotency-Key": crypto.randomUUID() }),
        },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      setState("Save failed — retry your change");
      return;
    }
    const result = await response.json();
    setApp(result.application);
    setState("Saved");
  }
  return (
    <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
      <h2 className="text-lg font-bold text-slate-950">
        Start your application
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Selecting a type or changing a product-specific field saves a draft.
      </p>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Insurance type
        <select
          value={type}
          onChange={(e) => {
            const value = e.target.value;
            setType(value);
            if (value)
              void save(
                { kind: "INSURANCE_TYPE_SELECTED", insuranceType: value },
                value,
              );
          }}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"
        >
          {" "}
          <option value="">Choose a type</option>
          {product.insuranceTypes.map((item) => (
            <option key={item} value={item}>
              {formatInsuranceType(item)}
            </option>
          ))}
        </select>
      </label>
      {product.supplementalSchema.fields.map((field) => (
        <label
          key={field.key}
          className="mt-4 block text-sm font-semibold text-slate-700"
        >
          {field.label}
          {field.required ? " *" : ""}
          <input
            type={
              field.type === "boolean"
                ? "checkbox"
                : field.type === "integer" || field.type === "decimal"
                  ? "number"
                  : field.type === "date"
                    ? "date"
                    : "text"
            }
            checked={
              field.type === "boolean" ? Boolean(data[field.key]) : undefined
            }
            value={
              field.type === "boolean"
                ? undefined
                : String(data[field.key] ?? "")
            }
            onChange={(e) => {
              const value =
                field.type === "boolean"
                  ? e.target.checked
                  : field.type === "integer"
                    ? Number(e.target.value)
                    : e.target.value;
              const next = { ...data, [field.key]: value };
              setData(next);
              void save(
                {
                  kind: "SUPPLEMENTAL_FIELD_CHANGED",
                  fieldKey: field.key,
                  value,
                },
                undefined,
                next,
              );
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"
          />
        </label>
      ))}
      <p className="mt-4 text-sm font-semibold text-blue-800" role="status">
        {state}
        {app ? ` · Draft ${app.id.slice(-6)}` : ""}
      </p>
    </div>
  );
}
