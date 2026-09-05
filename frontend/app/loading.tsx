import { LoadingIndicator } from "../components/loading-indicator";

export default function AppLoading() {
  return (
    <main
      className="grid min-h-[50vh] place-items-center px-6 py-16"
      aria-busy="true"
    >
      <LoadingIndicator
        label="Loading page…"
        className="rounded-xl bg-white px-5 py-4 font-semibold text-blue-800 shadow-sm ring-1 ring-slate-200"
      />
    </main>
  );
}
