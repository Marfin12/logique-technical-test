"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FaRightToBracket, FaUserPlus, FaEye, FaEyeSlash } from "react-icons/fa6";

import type { ErrorDto, LoginResponseDto } from "@insurance/contracts";

import { LoadingIndicator } from "./loading-indicator";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("displayName") ?? "").trim();
    const confirmation = String(form.get("passwordConfirmation") ?? "");
    if (!email || !password || (mode === "register" && !displayName)) {
      setError(
        mode === "register"
          ? "Enter your name, email, and password."
          : "Enter your email and password.",
      );
      return;
    }
    if (mode === "register" && password !== confirmation) {
      setError("Password confirmation does not match.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(
        mode === "register" ? "/api/v1/auth/register" : "/api/v1/auth/login",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            mode === "register"
              ? { displayName, email, password }
              : { email, password },
          ),
        },
      );
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
      {mode === "register" ? (
        <div>
          <label
            htmlFor="displayName"
            className="block text-sm font-semibold text-slate-800"
          >
            Full name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-950"
          />
        </div>
      ) : null}
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
        {mode === "register" ? (
          <p className="mt-2 text-xs text-slate-500">
            At least 12 characters with uppercase, lowercase, number, and
            symbol.
          </p>
        ) : null}
      </div>
      {mode === "register" ? (
        <div>
          <label
            htmlFor="passwordConfirmation"
            className="block text-sm font-semibold text-slate-800"
          >
            Confirm password
          </label>
          <input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            required
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-950"
          />
        </div>
      ) : null}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-slate-800"
        >
          Password
        </label>
        <div className="relative mt-2">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"} // Dinamis berdasarkan state
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
              className="w-full rounded-lg border border-slate-300 pl-3 pr-10 py-2.5 text-slate-950"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
            </button>
          </div>
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
        aria-busy={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? (
          <LoadingIndicator
            label={mode === "register" ? "Creating account…" : "Signing in…"}
          />
        ) : mode === "register" ? (
          <>
            <FaUserPlus aria-hidden="true" /> Create user account
          </>
        ) : (
          <>
            <FaRightToBracket aria-hidden="true" /> Sign in
          </>
        )}
      </button>
      <p className="text-center text-sm text-slate-600">
        {mode === "register" ? "Already registered?" : "New customer?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "register" ? "login" : "register");
            setError("");
          }}
          className="font-semibold text-blue-700 hover:underline"
        >
          {mode === "register" ? "Sign in" : "Create an account"}
        </button>
      </p>
    </form>
  );
}
