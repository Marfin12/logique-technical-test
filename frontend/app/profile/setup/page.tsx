import { redirect } from "next/navigation";

import { AuthenticatedShell } from "../../../components/authenticated-shell";
import { Panel } from "../../../components/panel";
import { ProfileForm } from "../../../components/profile-form";
import { ownProfile, requireUser } from "../../../lib/server-auth";

export const dynamic = "force-dynamic";

export default async function ProfileSetupPage() {
  const account = await requireUser();
  if (account.profileComplete) redirect("/products");
  const { profile } = await ownProfile();
  return (
    <AuthenticatedShell account={account} area="user">
      <Panel className="max-w-3xl p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Master registration
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Complete your profile
        </h1>
        <p className="mt-3 text-slate-600">
          These values are saved once and used for future product matching and
          premium calculations.
        </p>
        <ProfileForm initialProfile={profile} setup />
      </Panel>
    </AuthenticatedShell>
  );
}
