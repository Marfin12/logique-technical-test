import { redirect } from "next/navigation";

import { AuthenticatedShell } from "../../components/authenticated-shell";
import { Panel } from "../../components/panel";
import { requireUser } from "../../lib/server-auth";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const account = await requireUser();
  if (!account.profileComplete) redirect("/profile/setup");
  return (
    <AuthenticatedShell account={account} area="user">
      <Panel className="p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Product catalog
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Profile ready
        </h1>
        <p className="mt-3 text-slate-600">
          Your authenticated profile is complete. Eligible products and premium
          simulation are introduced in Phase 3.
        </p>
      </Panel>
    </AuthenticatedShell>
  );
}
