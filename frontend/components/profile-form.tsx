"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  PAYMENT_FREQUENCIES,
  PAYMENT_METHODS,
  type ErrorDto,
  type MasterProfileDto,
  type MasterProfileResponseDto,
} from "@insurance/contracts";

import {
  PAYMENT_FREQUENCY_LABELS,
  PAYMENT_METHOD_LABELS,
} from "../lib/payment-labels";
import {
  validateProfileForm,
  type ProfileFormValues,
} from "../lib/profile-form";

interface ProfileFormProps {
  initialProfile: MasterProfileDto | null;
  setup: boolean;
}

export function ProfileForm({ initialProfile, setup }: ProfileFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    const form = new FormData(event.currentTarget);
    const values: ProfileFormValues = {
      age: String(form.get("age") ?? ""),
      sumAssured: String(form.get("sumAssured") ?? ""),
      paymentFrequency: String(form.get("paymentFrequency") ?? ""),
      paymentMethod: String(form.get("paymentMethod") ?? ""),
    };
    const clientErrors = validateProfileForm(values);
    if (clientErrors.length) {
      setErrors(
        Object.fromEntries(
          clientErrors.map((item) => [item.field, item.message]),
        ),
      );
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/v1/me/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          age: Number(values.age),
          sumAssured: { amount: values.sumAssured, currency: "IDR" },
          paymentFrequency: values.paymentFrequency,
          paymentMethod: values.paymentMethod,
        }),
      });
      const body = (await response.json()) as
        | MasterProfileResponseDto
        | ErrorDto;
      if (!response.ok) {
        if ("error" in body) {
          setErrors(
            Object.fromEntries(
              (body.error.fields ?? []).map((item) => [
                item.field,
                item.message,
              ]),
            ),
          );
          setMessage(body.error.message);
        }
        return;
      }
      router.refresh();
      if (setup) router.replace("/products");
      else
        setMessage(
          "Profile saved. Future catalog results will use these values.",
        );
    } catch {
      setMessage("The service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const fieldError = (field: string) =>
    errors[field] ? (
      <p className="mt-1 text-sm text-red-700">{errors[field]}</p>
    ) : null;

  return (
    <form
      onSubmit={submit}
      className="mt-8 grid gap-6 sm:grid-cols-2"
      noValidate
    >
      <div>
        <label
          htmlFor="age"
          className="block text-sm font-semibold text-slate-800"
        >
          Age
        </label>
        <input
          id="age"
          name="age"
          type="number"
          min="1"
          step="1"
          required
          defaultValue={initialProfile?.age}
          aria-invalid={Boolean(errors.age)}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
        {fieldError("age")}
      </div>
      <div>
        <label
          htmlFor="sumAssured"
          className="block text-sm font-semibold text-slate-800"
        >
          Sum assured (IDR)
        </label>
        <input
          id="sumAssured"
          name="sumAssured"
          type="text"
          inputMode="decimal"
          required
          defaultValue={initialProfile?.sumAssured.amount}
          aria-invalid={Boolean(errors["sumAssured.amount"])}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
        {fieldError("sumAssured.amount")}
      </div>
      <div>
        <label
          htmlFor="paymentFrequency"
          className="block text-sm font-semibold text-slate-800"
        >
          Payment frequency
        </label>
        <select
          id="paymentFrequency"
          name="paymentFrequency"
          required
          defaultValue={initialProfile?.paymentFrequency ?? ""}
          aria-invalid={Boolean(errors.paymentFrequency)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
        >
          <option value="" disabled>
            Select a frequency
          </option>
          {PAYMENT_FREQUENCIES.map((frequency) => (
            <option key={frequency} value={frequency}>
              {PAYMENT_FREQUENCY_LABELS[frequency]}
            </option>
          ))}
        </select>
        {fieldError("paymentFrequency")}
      </div>
      <div>
        <label
          htmlFor="paymentMethod"
          className="block text-sm font-semibold text-slate-800"
        >
          Payment method
        </label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          required
          defaultValue={initialProfile?.paymentMethod ?? ""}
          aria-invalid={Boolean(errors.paymentMethod)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
        >
          <option value="" disabled>
            Select a method
          </option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
        {fieldError("paymentMethod")}
      </div>
      <div className="sm:col-span-2">
        {message ? (
          <p
            role="status"
            className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800"
          >
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {pending
            ? "Saving…"
            : setup
              ? "Save and view products"
              : "Save profile"}
        </button>
      </div>
    </form>
  );
}
