import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthenticatedShell } from "../../../components/authenticated-shell";
import { Panel } from "../../../components/panel";
import { ProductApplicationForm } from "../../../components/product-application-form";
import { ApplicationProgress } from "../../../components/application-progress";
import { requireUser } from "../../../lib/server-auth";
import { applicationDetail } from "../../../lib/server-applications";
import { productDetail } from "../../../lib/server-products";
export const dynamic = "force-dynamic";
export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const account = await requireUser();
  const { applicationId } = await params;
  const result = await applicationDetail(applicationId);
  if (!result) notFound();
  const app = result.application;
  const product =
    app.status === "DRAFT" ? await productDetail(app.productId) : null;
  return (
    <AuthenticatedShell account={account} area="user">
      <Link
        href="/applications"
        className="text-sm font-semibold text-blue-700 hover:underline"
      >
        ← My applications
      </Link>
      <Panel className="mt-6 p-6">
        <h1 className="text-2xl font-bold">Application {app.id}</h1>
        <p className="mt-2 text-slate-600">Status: {app.status}</p>
        {app.status === "DRAFT" && product?.state === "available" ? (
          <ProductApplicationForm
            product={product.product}
            initialApplication={app}
          />
        ) : (
          <ApplicationProgress application={app} />
        )}
      </Panel>
    </AuthenticatedShell>
  );
}
