"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ApplicationDto,
  ErrorDto,
  ProductDetailDto,
} from "@insurance/contracts";
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
  const appRef = useRef(initialApplication);
  const creationKey = useRef<string | undefined>(undefined);
  const submissionKey = useRef<string | undefined>(undefined);
  const readOnly = Boolean(app && app.status !== "DRAFT");
  const busy = state === "Saving";
  const missingRequired = product.supplementalSchema.fields.some((field) => {
    const value = data[field.key];
    return (
      field.required &&
      (value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0))
    );
  });
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
    if (readOnly || busy) return;
    setState("Saving");
    const current = appRef.current;
    const body = current
      ? {
          version: current.version,
          ...(nextType ? { selectedInsuranceType: nextType } : {}),
          ...(nextData ? { supplementalData: nextData } : {}),
        }
      : { productId: product.id, productVersionId: product.versionId, trigger };
    try {
      if (!creationKey.current) creationKey.current = crypto.randomUUID();
      const response = await fetch(
        current
          ? `/api/v1/me/applications/${current.id}/draft`
          : "/api/v1/me/applications/drafts",
        {
          method: current ? "PATCH" : "POST",
          headers: {
            "content-type": "application/json",
            ...(current ? {} : { "Idempotency-Key": creationKey.current }),
          },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        const error = (await response
          .json()
          .catch(() => null)) as ErrorDto | null;
        setState(error?.error.message ?? "Save failed — retry your change");
        return;
      }
      const result = await response.json();
      appRef.current = result.application;
      setApp(result.application);
      setState("Saved");
    } catch {
      setState("Save failed — check your connection and retry");
    }
  }
  async function submit() {
    const current = appRef.current;
    if (!current || current.status !== "DRAFT" || busy) return;
    setState("Saving");
    try {
      if (!submissionKey.current) submissionKey.current = crypto.randomUUID();
      const response = await fetch(
        `/api/v1/me/applications/${current.id}/submit`,
        {
          method: "POST",
          headers: { "Idempotency-Key": submissionKey.current },
        },
      );
      if (!response.ok) {
        const error = (await response
          .json()
          .catch(() => null)) as ErrorDto | null;
        setState(
          error?.error.message ??
            "Apply failed — complete all required details",
        );
        return;
      }
      const result = await response.json();
      appRef.current = result.application;
      setApp(result.application);
      setState("Submitted");
    } catch {
      setState("Apply failed — check your connection and retry");
    }
  }
  function changeField(fieldKey: string, value: unknown) {
    const next = { ...data, [fieldKey]: value };
    setData(next);
    void save(
      { kind: "SUPPLEMENTAL_FIELD_CHANGED", fieldKey, value },
      undefined,
      next,
    );
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
          disabled={readOnly || busy}
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
          {field.type === "boolean" ? (
            <input
              disabled={readOnly || busy}
              type="checkbox"
              checked={Boolean(data[field.key])}
              onChange={(event) => changeField(field.key, event.target.checked)}
              className="ml-3 h-4 w-4 rounded border-slate-300"
            />
          ) : field.type === "multiline" ? (
            <textarea
              disabled={readOnly || busy}
              value={String(data[field.key] ?? "")}
              onChange={(event) => changeField(field.key, event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"
            />
          ) : field.type === "single-select" ? (
            <select
              disabled={readOnly || busy}
              value={String(data[field.key] ?? "")}
              onChange={(event) => changeField(field.key, event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"
            >
              <option value="">Choose an option</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : field.type === "multi-select" ? (
            <select
              multiple
              disabled={readOnly || busy}
              value={
                Array.isArray(data[field.key])
                  ? (data[field.key] as string[])
                  : []
              }
              onChange={(event) =>
                changeField(
                  field.key,
                  Array.from(
                    event.target.selectedOptions,
                    (option) => option.value,
                  ),
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"
            >
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              disabled={readOnly || busy}
              type={
                field.type === "integer" || field.type === "decimal"
                  ? "number"
                  : field.type === "date"
                    ? "date"
                    : "text"
              }
              step={field.type === "decimal" ? "any" : undefined}
              value={String(data[field.key] ?? "")}
              onChange={(event) =>
                changeField(
                  field.key,
                  field.type === "integer"
                    ? Number(event.target.value)
                    : event.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"
            />
          )}
        </label>
      ))}
      {app?.status === "DRAFT" ? (
        <button
          type="button"
          disabled={busy || !type || missingRequired}
          onClick={() => void submit()}
          className="mt-5 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          Apply
        </button>
      ) : null}
      <p className="mt-4 text-sm font-semibold text-blue-800" role="status">
        {state}
        {app
          ? ` · ${app.status === "DRAFT" ? "Draft" : "Application"} ${app.id.slice(-6)}`
          : ""}
      </p>
    </div>
  );
}
