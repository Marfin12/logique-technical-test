import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type {
  AccountDto,
  CurrentAccountResponseDto,
  MasterProfileResponseDto,
} from "@insurance/contracts";

import {
  canAccessAdminArea,
  canAccessUserArea,
  destinationForAccount,
} from "./route-access";

const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

export async function authenticatedFetch(path: string): Promise<Response> {
  const cookieHeader = (await cookies()).toString();
  return fetch(`${apiInternalUrl}${path}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
}

export async function currentAccount(): Promise<AccountDto | null> {
  const response = await authenticatedFetch("/api/v1/me");
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Unable to load the current account.");
  return ((await response.json()) as CurrentAccountResponseDto).account;
}

export async function requireUser(): Promise<AccountDto> {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!canAccessUserArea(account)) redirect(destinationForAccount(account));
  return account;
}

export async function requireAdmin(): Promise<AccountDto> {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!canAccessAdminArea(account)) redirect(destinationForAccount(account));
  return account;
}

export async function ownProfile(): Promise<MasterProfileResponseDto> {
  const response = await authenticatedFetch("/api/v1/me/profile");
  if (response.status === 401) redirect("/login");
  if (response.status === 403) redirect("/admin/applications");
  if (!response.ok) throw new Error("Unable to load the master profile.");
  return (await response.json()) as MasterProfileResponseDto;
}
