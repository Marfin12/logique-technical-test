import Link from "next/link";
import { AuthenticatedShell } from "../../../../../components/authenticated-shell";
import { Panel } from "../../../../../components/panel";
import { PAYMENT_FREQUENCY_LABELS } from "../../../../../lib/payment-labels";
import { formatMoney } from "../../../../../lib/product-display";
import { adminProfile } from "../../../../../lib/server-admin";
import { requireAdmin } from "../../../../../lib/server-auth";
export const dynamic = "force-dynamic";
export default async function AdminProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const account = await requireAdmin();
  const { userId } = await params;
  const result = await adminProfile(userId);
  return (
    <AuthenticatedShell account={account} area="admin">
      <Link
        href="/admin/applications"
        className="text-sm font-semibold text-blue-700 hover:underline"
      >
        ← Application list
      </Link>
      <Panel className="mt-6 max-w-2xl p-6">
        <h1 className="text-2xl font-bold">{result.applicant.displayName}</h1>
        <p className="mt-1 text-slate-600">{result.applicant.username}</p>
        {result.profile ? (
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt>Age</dt>
              <dd className="font-semibold">{result.profile.age}</dd>
            </div>
            <div>
              <dt>Sum assured</dt>
              <dd className="font-semibold">
                {formatMoney(
                  result.profile.sumAssured.amount,
                  result.profile.sumAssured.currency,
                )}
              </dd>
            </div>
            <div>
              <dt>Payment frequency</dt>
              <dd className="font-semibold">
                {PAYMENT_FREQUENCY_LABELS[result.profile.paymentFrequency]}
              </dd>
            </div>
            <div>
              <dt>Payment method</dt>
              <dd className="font-semibold">
                {result.profile.paymentMethod.replaceAll("_", " ")}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-slate-600">No profile is available.</p>
        )}
      </Panel>
    </AuthenticatedShell>
  );
}
