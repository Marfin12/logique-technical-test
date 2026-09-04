import type { AccountDto } from "@insurance/contracts";

export type AuthenticatedDestination =
  | "/profile/setup"
  | "/products"
  | "/admin/applications";

export function destinationForAccount(
  account: AccountDto,
): AuthenticatedDestination {
  if (account.role === "ADMIN") return "/admin/applications";
  return account.profileComplete ? "/products" : "/profile/setup";
}

export function canAccessUserArea(account: AccountDto): boolean {
  return account.role === "USER";
}

export function canAccessAdminArea(account: AccountDto): boolean {
  return account.role === "ADMIN";
}
