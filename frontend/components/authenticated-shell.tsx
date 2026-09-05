import Link from "next/link";
import type { ReactNode } from "react";

import type { AccountDto } from "@insurance/contracts";

import { LogoutButton } from "./logout-button";
import { ChatWidget } from "./chat-widget";

interface ShellProps {
  account: AccountDto;
  area: "user" | "admin";
  children: ReactNode;
}

export function AuthenticatedShell({ account, area, children }: ShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link
              href={area === "admin" ? "/admin/applications" : "/products"}
              className="text-lg font-bold text-blue-800"
            >
              Simple Insurance
            </Link>
            <p className="text-xs text-slate-500">
              {area === "admin" ? "Administration" : "Customer portal"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {account.displayName}
            </span>
            {area === "user" ? (
              <div className="flex items-center gap-1">
                <Link
                  href="/applications"
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Applications
                </Link>
                <Link
                  href="/profile"
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Profile
                </Link>
              </div>
            ) : null}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="mx-auto max-w-6xl px-6 pb-8 text-xs text-slate-500">
        Demo configuration over local HTTP. Do not enter real personal,
        financial, health, or policy data on an untrusted network.
      </footer>
      {area === "user" ? <ChatWidget /> : null}
    </div>
  );
}
