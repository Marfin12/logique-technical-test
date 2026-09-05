import { LoadingIndicator } from "../../components/loading-indicator";

export default function ProductsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10" aria-busy="true">
      <LoadingIndicator
        label="Loading eligible products…"
        className="text-sm font-semibold text-blue-700"
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="h-80 animate-pulse rounded-2xl bg-slate-200"
          />
        ))}
      </div>
    </main>
  );
}
