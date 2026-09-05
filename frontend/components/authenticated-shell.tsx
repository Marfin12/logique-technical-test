import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { FaFileLines, FaHouse, FaUser } from "react-icons/fa6";

import type { AccountDto } from "@insurance/contracts";

import { LogoutButton } from "./logout-button";
import { ChatWidget } from "./chat-widget";

interface ShellProps {
  account: AccountDto;
  area: "user" | "admin";
  children: ReactNode;
}

export function AuthenticatedShell({ account, area, children }: ShellProps) {
  const homeHref = area === "admin" ? "/admin/applications" : "/products";
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-xl"
              priority
            />
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
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 lg:inline">
              {account.displayName}
            </span>
            <nav
              aria-label="Primary navigation"
              className="flex items-center gap-1"
            >
              <Link
                href={homeHref}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                <FaHouse aria-hidden="true" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              {area === "user" ? (
                <>
                  <Link
                    href="/applications"
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <FaFileLines aria-hidden="true" />
                    <span className="hidden sm:inline">Applications</span>
                  </Link>
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <FaUser aria-hidden="true" />
                    <span className="hidden sm:inline">Profile</span>
                  </Link>
                </>
              ) : null}
            </nav>
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
