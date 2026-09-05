import { redirect } from "next/navigation";

import { currentAccount } from "../lib/server-auth";
import { destinationForAccount } from "../lib/route-access";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  console.log("initiating")
  const account = await currentAccount();
  redirect(account ? destinationForAccount(account) : "/login");
}
