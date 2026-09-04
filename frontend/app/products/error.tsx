"use client";

export default function ProductsError({ reset }: { reset: () => void }) {
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
        onClick={reset}
        className="mt-6 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
      >
        Try again
      </button>
    </main>
  );
}
