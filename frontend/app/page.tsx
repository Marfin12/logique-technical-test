import { stackSummary } from "../lib/stack-summary";
import { Panel } from "../components/panel";

export default function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <Panel className="max-w-2xl p-6 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Simple Insurance
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
          Phase 0 foundation is ready
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          {stackSummary()}
        </p>
        <div className="mt-8 rounded-lg bg-slate-100 p-4 text-sm text-slate-700">
          The application features begin in the next implementation phases. The
          API health endpoint is available through{" "}
          <code className="font-mono">/health/api</code>.
        </div>
      </Panel>
    </main>
  );
}
