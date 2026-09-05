import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationProgress } from "../../../components/application-progress";
import { AuthenticatedShell } from "../../../components/authenticated-shell";
import { Panel } from "../../../components/panel";
import { ProductDetailView } from "../../../components/product-detail-view";
import { applicationDetail } from "../../../lib/server-applications";
import { requireUser } from "../../../lib/server-auth";
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
  const application = result.application;

  if (application.status === "DRAFT") {
    const product = await productDetail(application.productId);
    if (product.state === "available") {
      return (
        <AuthenticatedShell account={account} area="user">
          <ProductDetailView
            product={product.product}
            initialApplication={application}
            backHref="/applications"
            backLabel="My applications"
          />
        </AuthenticatedShell>
      );
    }
  }

  return (
    <AuthenticatedShell account={account} area="user">
      <Link
        href="/applications"
        className="text-sm font-semibold text-blue-700 hover:underline"
      >
        ← My applications
      </Link>
      <Panel className="mt-6 p-6">
        <h1 className="text-2xl font-bold">Application {application.id}</h1>
        <p className="mt-2 text-slate-600">
          Status: {application.status.replaceAll("_", " ")}
        </p>
        <ApplicationProgress application={application} />
      </Panel>
    </AuthenticatedShell>
  );
}
