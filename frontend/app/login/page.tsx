import { redirect } from "next/navigation";
import Image from "next/image";

import { LoginForm } from "../../components/login-form";
import { Panel } from "../../components/panel";
import { destinationForAccount } from "../../lib/route-access";
import { currentAccount } from "../../lib/server-auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const account = await currentAccount();
  if (account) redirect(destinationForAccount(account));

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <Panel className="max-w-md p-7 sm:p-10">
        <Image
          src="/images/logo.png"
          alt="Simple Insurance"
          width={104}
          height={104}
          className="mx-auto mb-5 h-24 w-24 rounded-2xl"
          priority
        />
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Simple Insurance
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Sign in
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Users and administrators use the same secure login.
        </p>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Local demo over HTTP. Do not use real personal, health, financial, or
          policy information on an untrusted network.
        </p>
        <LoginForm />
      </Panel>
    </main>
  );
}
