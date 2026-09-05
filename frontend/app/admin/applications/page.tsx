import Link from "next/link";
import { AuthenticatedShell } from "../../../components/authenticated-shell";
import { Panel } from "../../../components/panel";
import { StartReviewButton } from "../../../components/start-review-button";
import { formatWibDateTime } from "../../../lib/date-time";
import { PAYMENT_FREQUENCY_LABELS } from "../../../lib/payment-labels";
import { displayProductName } from "../../../lib/product-display";
import { adminApplications } from "../../../lib/server-admin";
import { requireAdmin } from "../../../lib/server-auth";
export const dynamic = "force-dynamic";
export default async function AdminApplicationsPage() {
  const account = await requireAdmin();
  const { items } = await adminApplications();
  return (
    <AuthenticatedShell account={account} area="admin">
      <h1 className="text-3xl font-bold text-slate-950">Application list</h1>
      <p className="mt-2 text-slate-600">
        Submitted applications and review decisions. Drafts are never shown.
      </p>
      <Panel className="mt-6 overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">
            Submitted and reviewed insurance applications
          </caption>
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              {[
                "Username",
                "Date Applied",
                "Insurance Type",
                "Payment Frequency",
                "Product",
                "Status",
                "Actions",
              ].map((label) => (
                <th key={label} scope="col" className="px-4 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-200">
                <td className="px-4 py-3">
                  <Link
                    className="font-semibold text-blue-700 hover:underline"
                    href={`/admin/users/${item.userId}/profile`}
                  >
                    {item.applicantUsername}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {item.submittedAt ? formatWibDateTime(item.submittedAt) : "—"}
                </td>
                <td className="px-4 py-3">
                  {item.selectedInsuranceType ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {item.paymentFrequency
                    ? PAYMENT_FREQUENCY_LABELS[item.paymentFrequency]
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {item.productName
                    ? displayProductName(item.productName)
                    : "—"}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {item.status.replaceAll("_", " ")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    {item.status === "SUBMITTED" ? (
                      <StartReviewButton applicationId={item.id} />
                    ) : <Link
                      href={`/admin/applications/${item.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700"
                    >
                      View
                    </Link>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length ? (
          <p className="p-6 text-slate-600">No submitted applications.</p>
        ) : null}
      </Panel>
    </AuthenticatedShell>
  );
}
