"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaRightFromBracket } from "react-icons/fa6";

import { LoadingIndicator } from "./loading-indicator";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={logout}
        disabled={pending}
        aria-busy={pending}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
      >
        {pending ? (
          <LoadingIndicator label="Signing out…" />
        ) : (
          <>
            <FaRightFromBracket aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </>
        )}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
