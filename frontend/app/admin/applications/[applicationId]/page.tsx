import Link from "next/link";
import { AuthenticatedShell } from "../../../../components/authenticated-shell";
import { Panel } from "../../../../components/panel";
import { ReviewActions } from "../../../../components/review-actions";
import { adminApplication } from "../../../../lib/server-admin";
import { requireAdmin } from "../../../../lib/server-auth";
export const dynamic = "force-dynamic";
const display = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value, null, 2);
export default async function AdminApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const account = await requireAdmin();
  const { applicationId } = await params;
  const result = await adminApplication(applicationId);
  const app = result.application;
  return (
    <AuthenticatedShell account={account} area="admin">
      <Link
        href="/admin/applications"
        className="text-sm font-semibold text-blue-700 hover:underline"
      >
        ← Application list
      </Link>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Panel className="p-6">
          <h1 className="text-2xl font-bold text-slate-950">
            {result.applicant.displayName}
          </h1>
          <p className="mt-2 font-semibold text-blue-800">
            {app.status.replaceAll("_", " ")}
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Insurance type
              </dt>
              <dd>{app.selectedInsuranceType ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Applied
              </dt>
              <dd>
                {app.submittedAt
                  ? new Date(app.submittedAt).toLocaleString()
                  : "—"}
              </dd>
            </div>
          </dl>
          {[
            ["Profile snapshot", app.profileSnapshot],
            ["Product snapshot", app.productSnapshot],
            ["Premium snapshot", app.premiumSnapshot],
            ["Submitted details", app.supplementalData],
          ].map(([label, value]) => (
            <section key={label as string} className="mt-6">
              <h2 className="font-bold text-slate-950">{label as string}</h2>
              <pre className="mt-2 overflow-auto rounded-lg bg-slate-100 p-3 text-xs">
                {display(value)}
              </pre>
            </section>
          ))}
          {app.rejectionReason ? (
            <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-800">
              <strong>Rejection reason:</strong> {app.rejectionReason}
            </p>
          ) : null}
        </Panel>
        <Panel className="h-fit p-6">
          <h2 className="font-bold text-slate-950">Status history</h2>
          <ol className="mt-4 space-y-4">
            {result.statusHistory.map((event) => (
              <li key={event.id} className="border-l-2 border-blue-200 pl-3">
                <p className="font-semibold">
                  {event.toStatus.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(event.createdAt).toLocaleString()}
                </p>
                {event.reason ? (
                  <p className="text-sm text-slate-600">{event.reason}</p>
                ) : null}
              </li>
            ))}
          </ol>
          {app.status === "UNDER_REVIEW" ? (
            <ReviewActions applicationId={app.id} />
          ) : null}
        </Panel>
      </div>
    </AuthenticatedShell>
  );
}
