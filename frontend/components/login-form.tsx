"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { ErrorDto, LoginResponseDto } from "@insurance/contracts";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json()) as LoginResponseDto | ErrorDto;
      if (!response.ok) {
        setError("error" in body ? body.error.message : "Unable to sign in.");
        return;
      }
      router.replace((body as LoginResponseDto).nextPath);
      router.refresh();
    } catch {
      setError("The service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-slate-800"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-950"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-slate-800"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-950"
        />
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
