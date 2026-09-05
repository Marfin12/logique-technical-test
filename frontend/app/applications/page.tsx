import Link from "next/link";
import { AuthenticatedShell } from "../../components/authenticated-shell";
import { Panel } from "../../components/panel";
import { displayProductName } from "../../lib/product-display";
import { requireUser } from "../../lib/server-auth";
import { applicationList } from "../../lib/server-applications";
export const dynamic = "force-dynamic";
export default async function ApplicationsPage() {
  const account = await requireUser();
  const page = await applicationList();
  return (
    <AuthenticatedShell account={account} area="user">
      <h1 className="text-3xl font-bold text-slate-950">My applications</h1>
      <div className="mt-6 space-y-3">
        {page.items.length ? (
          page.items.map((item) => (
            <Panel key={item.id} className="p-5">
              <Link
                href={`/applications/${item.id}`}
                className="font-semibold text-blue-800 hover:underline"
              >
                {item.productName
                  ? displayProductName(item.productName)
                  : `Product ${item.productId.slice(-6)}`}
              </Link>
              <span className="ml-3 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                {item.status}
              </span>
              <p className="mt-2 text-sm text-slate-500">
                Updated {new Date(item.updatedAt).toLocaleString()}
              </p>
            </Panel>
          ))
        ) : (
          <Panel className="p-6 text-slate-600">
            No applications yet. Choose a product to begin.
          </Panel>
        )}
      </div>
    </AuthenticatedShell>
  );
}
