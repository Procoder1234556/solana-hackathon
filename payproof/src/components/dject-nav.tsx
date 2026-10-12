"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DjectNav() {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isContractor = pathname.startsWith("/contractor");
  const isEmployer = pathname.startsWith("/employer");
  const isVerify = pathname.startsWith("/verify");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/[0.05] bg-white/80 py-2.5 backdrop-blur-xl">
      <div className="mx-auto flex h-12 w-full max-w-[1400px] items-center justify-between px-4 sm:px-8">
        {/* Left: Brand Icon & Name */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            {/* Geometric Shield / Quatrefoil Icon */}
            <div className="relative flex size-8 items-center justify-center rounded-xl bg-black text-white shadow-xs transition-transform duration-200 group-hover:scale-105">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold tracking-tight text-black">
                PayProof
              </span>
            </div>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-black/[0.07] bg-neutral-100/70 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Devnet
          </span>
        </div>

        {/* Center: DjectStudio Pill Capsule Navigation */}
        <nav
          aria-label="Primary"
          className="flex items-center"
        >
          <div className="flex items-center gap-1 rounded-full border border-black/[0.06] bg-[#f5f5f7] p-1 shadow-inner">
            <Link
              href="/"
              className={`relative flex h-9 items-center rounded-full px-4 text-[13px] font-medium transition-all ${
                isHome
                  ? "bg-black text-white shadow-xs"
                  : "text-neutral-600 hover:text-black hover:bg-black/[0.04]"
              }`}
            >
              Overview
            </Link>

            <Link
              href="/contractor/receipts"
              className={`relative flex h-9 items-center rounded-full px-4 text-[13px] font-medium transition-all ${
                isContractor
                  ? "bg-black text-white shadow-xs"
                  : "text-neutral-600 hover:text-black hover:bg-black/[0.04]"
              }`}
            >
              Contractor Vault
            </Link>

            <Link
              href="/employer/payments/new"
              className={`relative flex h-9 items-center rounded-full px-4 text-[13px] font-medium transition-all ${
                isEmployer
                  ? "bg-black text-white shadow-xs"
                  : "text-neutral-600 hover:text-black hover:bg-black/[0.04]"
              }`}
            >
              Employer Payments
            </Link>
          </div>
        </nav>

        {/* Right: Quick Action Pill */}
        <div className="flex items-center gap-2">
          {isHome ? (
            <Link
              href="/employer/payments/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#ff4d00] px-4 text-[13px] font-semibold text-white shadow-xs transition-all duration-200 hover:bg-[#e04400] hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Employer: Create payment proof</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          ) : isContractor ? (
            <Link
              href="/employer/payments/new"
              className="inline-flex h-9 items-center gap-1 rounded-full border border-black/[0.08] bg-white px-3.5 text-[12px] font-medium text-neutral-800 transition-colors hover:bg-neutral-50"
            >
              New Payment →
            </Link>
          ) : (
            <Link
              href="/contractor/receipts"
              className="inline-flex h-9 items-center gap-1 rounded-full border border-black/[0.08] bg-white px-3.5 text-[12px] font-medium text-neutral-800 transition-colors hover:bg-neutral-50"
            >
              My Vault →
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
