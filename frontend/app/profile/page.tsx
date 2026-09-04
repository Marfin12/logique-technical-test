import { redirect } from "next/navigation";

import { AuthenticatedShell } from "../../components/authenticated-shell";
import { Panel } from "../../components/panel";
import { ProfileForm } from "../../components/profile-form";
import { ownProfile, requireUser } from "../../lib/server-auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const account = await requireUser();
  const { profile } = await ownProfile();
  if (!profile) redirect("/profile/setup");
  return (
    <AuthenticatedShell account={account} area="user">
      <Panel className="max-w-3xl p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Master profile
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Your profile</h1>
        <p className="mt-3 text-slate-600">
          Updates apply to future catalog queries and do not rewrite submitted
          applications.
        </p>
        <ProfileForm initialProfile={profile} setup={false} />
      </Panel>
    </AuthenticatedShell>
  );
}
