import { AuthenticatedShell } from "../../../components/authenticated-shell";
import { Panel } from "../../../components/panel";
import { requireAdmin } from "../../../lib/server-auth";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const account = await requireAdmin();
  return (
    <AuthenticatedShell account={account} area="admin">
      <Panel className="p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Administration
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Application list
        </h1>
        <p className="mt-3 text-slate-600">
          Admin authentication and route separation are active. The application
          review queue is introduced in Phase 6.
        </p>
      </Panel>
    </AuthenticatedShell>
  );
}
