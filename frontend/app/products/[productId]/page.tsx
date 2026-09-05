import { AuthenticatedShell } from "../../../components/authenticated-shell";
import { Panel } from "../../../components/panel";
import { ProductDetailView } from "../../../components/product-detail-view";
import { requireUser } from "../../../lib/server-auth";
import { productDetail } from "../../../lib/server-products";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const account = await requireUser();
  const { productId } = await params;
  const result = await productDetail(productId);

  return (
    <AuthenticatedShell account={account} area="user">
      {result.state !== "available" ? (
        <Panel className="max-w-2xl p-8">
          <h1 className="text-2xl font-bold text-slate-950">
            {result.state === "ineligible"
              ? "Product not compatible"
              : "Product unavailable"}
          </h1>
          <p className="mt-3 text-slate-600">{result.error.error.message}</p>
          {result.error.error.reasonCodes?.length ? (
            <p className="mt-4 text-sm text-slate-500">
              Reason: {result.error.error.reasonCodes.join(", ")}
            </p>
          ) : null}
        </Panel>
      ) : (
        <ProductDetailView
          product={result.product}
          backHref="/products"
          backLabel="Back to products"
        />
      )}
    </AuthenticatedShell>
  );
}
