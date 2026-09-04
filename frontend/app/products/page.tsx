import { redirect } from "next/navigation";

import { AuthenticatedShell } from "../../components/authenticated-shell";
import { ProductCard } from "../../components/product-card";
import { requireUser } from "../../lib/server-auth";
import { productCatalog } from "../../lib/server-products";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const account = await requireUser();
  if (!account.profileComplete) redirect("/profile/setup");
  const { items } = await productCatalog();
  return (
    <AuthenticatedShell account={account} area="user">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Product catalog
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Insurance matched to your profile
        </h1>
        <p className="mt-3 text-slate-600">
          Premiums are calculated by the server from your saved profile and the
          current test product configuration.
        </p>
        {items.length ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {items.map((product) => (
              <ProductCard key={product.versionId} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              No compatible products
            </h2>
            <p className="mt-2 text-slate-600">
              Your current profile does not match an active product. Review your
              profile or try again when the catalog changes.
            </p>
          </div>
        )}
      </section>
    </AuthenticatedShell>
  );
}
