"use client";

import { useTransition } from "react";
import { FaRotateRight } from "react-icons/fa6";

import { LoadingIndicator } from "../../components/loading-indicator";

export default function ProductsError({ reset }: { reset: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-950">
        Products could not be loaded
      </h1>
      <p className="mt-3 text-slate-600">
        The catalog service may be temporarily unavailable.
      </p>
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() => startTransition(reset)}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? (
          <LoadingIndicator label="Trying again…" />
        ) : (
          <>
            <FaRotateRight aria-hidden="true" /> Try again
          </>
        )}
      </button>
    </main>
  );
}
