"use client";

import { useState } from "react";
import Link from "next/link";
import { VerifierTokenInput } from "@/features/verification/verifier-token-input";

type UseCase = {
  id: string;
  label: string;
  symbol: string;
  employer: string;
  role: string;
  amount: string;
  threshold: string;
  disclosureTarget: string;
  verifierNote: string;
  txHash: string;
};

const USE_CASES: UseCase[] = [
  {
    id: "mortgage",
    label: "Mortgage & Leases",
    symbol: "🏢",
    employer: "Superteam Earn",
    role: "Contract Solana Developer",
    amount: "$12,800 USDC",
    threshold: "Verified Monthly Income > $10,000",
    disclosureTarget: "Prime Property Management & Landlords",
    verifierNote: "Sufficient to approve luxury lease without exposing wallet assets",
    txHash: "4x8k...7m2p",
  },
  {
    id: "defi",
    label: "DeFi Underwriting",
    symbol: "⚡",
    employer: "Helium Foundation",
    role: "Core Protocol Contributor",
    amount: "$14,500 USDC",
    threshold: "Verified 6-Month Income > $75,000",
    disclosureTarget: "Undercollateralized Lending Vault",
    verifierNote: "Cryptographic proof of regular on-chain contractor settlements",
    txHash: "9b8d...4e1a",
  },
  {
    id: "client",
    label: "Client Verification",
    symbol: "🛡️",
    employer: "Jupiter Core DAO",
    role: "Senior Security Auditor",
    amount: "$18,000 USDC",
    threshold: "Verified Past Retainer > $15,000",
    disclosureTarget: "Prospective Enterprise Client",
    verifierNote: "Validates rate card and delivery track record without doxxing treasury",
    txHash: "3f9a...8c2d",
  },
  {
    id: "tax",
    label: "Tax & Compliance",
    symbol: "🏛️",
    employer: "Metaplex Studios",
    role: "Full-Stack Web3 Consultant",
    amount: "$9,200 USDC",
    threshold: "Cumulative FY26 Invoiced > $110,000",
    disclosureTarget: "Certified Public Accountant / Auditor",
    verifierNote: "Itemized gross receipts reconciled with Token-2022 confidential transfers",
    txHash: "7y2w...1q5t",
  },
  {
    id: "escrow",
    label: "P2P Escrows",
    symbol: "🤝",
    employer: "Drift Protocol",
    role: "Integration Specialist",
    amount: "$6,500 USDC",
    threshold: "Milestone 03 Completion Validated",
    disclosureTarget: "Arbitration DAO / Escrow Partner",
    verifierNote: "Irrefutable proof of issuer fund commitment and contractor receipt",
    txHash: "5n1r...9v4k",
  },
];

export default function Home() {
  const [activeCaseId, setActiveCaseId] = useState<string>("defi");
  const [isMasked, setIsMasked] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const activeCase = USE_CASES.find((c) => c.id === activeCaseId) || USE_CASES[1];

  function handleCopy() {
    navigator.clipboard?.writeText(
      `https://payproof.app/verify/tok_demo_${activeCase.id}_${activeCase.txHash.replace("...", "")}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#171717] selection:bg-neutral-200 flex flex-col font-sans">
      {/* 1. Minimal Top Navigation */}
      <header className="w-full border-b border-neutral-200/50">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
          {/* Gray Brand Mark */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-neutral-800 hover:text-neutral-950 transition-colors group"
          >
            <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center text-white text-xs font-semibold tracking-tighter shadow-xs">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-neutral-900">
              PayProof
            </span>
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-neutral-200/60 text-neutral-600">
              Solana Devnet
            </span>
          </Link>

          {/* Understated Nav & Rounded Primary CTA */}
          <nav className="flex items-center gap-4 sm:gap-6" aria-label="Primary actions">
            <Link
              href="/contractor/receipts"
              className="text-xs sm:text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Contractor Vault
            </Link>

            <Link
              href="/employer/payments/new"
              className="inline-flex items-center justify-center rounded-full border border-neutral-300/80 bg-white px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-neutral-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              Employer: Create payment proof
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center">
        {/* 2. Editorial Hero Headline */}
        <section className="w-full max-w-4xl mx-auto px-6 sm:px-10 pt-16 sm:pt-24 pb-8 text-center">
          {/* Subtle Devnet Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03)] text-[11px] font-medium text-neutral-600 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>PAYPROOF · TOKEN-2022 CONFIDENTIAL PROOFS</span>
          </div>

          {/* High-Contrast Serif Headline */}
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[78px] font-normal tracking-[-0.035em] text-[#171717] leading-[1.04] mb-8">
            Share income,
            <br />
            not wallet history.
          </h1>

          {/* Supporting Copy */}
          <p className="max-w-xl mx-auto text-base sm:text-lg leading-relaxed text-[#6F6F6F] mb-8 font-sans">
            PayProof gives crypto contractors signed, cryptographic payment receipts they
            can selectively disclose to a lender, landlord, or service provider without
            revealing their private balances or entire on-chain ledger.
          </p>

          {/* Privacy Boundary Banner (Deliberately soft & quiet) */}
          <div className="max-w-2xl mx-auto rounded-2xl border border-neutral-200/90 bg-white/90 p-4 sm:p-5 text-xs sm:text-[13px] leading-relaxed text-neutral-600 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
            <span className="font-medium text-neutral-800">Privacy boundary:</span>{" "}
            confidential balances can hide amounts and balances, but payments are{" "}
            <strong className="font-semibold text-neutral-900">not anonymous</strong>—wallet
            accounts and transaction participation may remain public on Solana.
          </div>
        </section>

        {/* 3. Use-Case / Category Selector */}
        <section className="w-full max-w-4xl mx-auto px-6 pt-10 pb-12 flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-full bg-neutral-200/40 border border-neutral-200/60 shadow-inner">
            {USE_CASES.map((uc) => {
              const isActive = uc.id === activeCaseId;
              return (
                <button
                  key={uc.id}
                  onClick={() => setActiveCaseId(uc.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs transition-all duration-200 ${
                    isActive
                      ? "bg-white text-neutral-950 font-medium border border-neutral-200/90 shadow-[0_10px_24px_rgba(0,0,0,0.08)] scale-[1.02]"
                      : "text-neutral-500 hover:text-neutral-800 opacity-60 hover:opacity-100"
                  }`}
                >
                  <span className="text-sm">{uc.symbol}</span>
                  <span>{uc.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Product Demonstration (Mobile Mockup with Soft Blur & Bottom White Fade) */}
        <section className="w-full max-w-4xl mx-auto px-6 pb-20 relative flex flex-col items-center">
          {/* Subtle Glow Behind Device */}
          <div className="absolute top-10 w-96 h-96 bg-neutral-200/50 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Device Mockup Shell */}
          <div className="relative w-full max-w-[390px] rounded-[48px] border border-neutral-300/80 bg-white p-3.5 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.1),0_0_1px_1px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* Soft Ambient Bottom Fade into Page */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-20" />

            {/* Inner Phone Screen */}
            <div className="w-full rounded-[38px] bg-neutral-50/70 border border-neutral-200/60 p-4 space-y-4">
              {/* Dynamic Island / Status Bar */}
              <div className="flex items-center justify-between text-[11px] font-medium text-neutral-400 px-2 pt-1">
                <span>9:41</span>
                <div className="w-20 h-4 rounded-full bg-neutral-900 mx-auto" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">5G</span>
                  <div className="w-4 h-2 rounded-xs border border-neutral-400 p-0.5 flex items-center">
                    <div className="w-full h-full bg-neutral-500 rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* In-Product App Header */}
              <div className="flex items-center justify-between px-1 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-700">
                    EV
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">
                      Elena Vance
                    </p>
                    <p className="text-[10px] text-neutral-500">{activeCase.role}</p>
                  </div>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200/60">
                  Vault Active
                </span>
              </div>

              {/* Encrypted Signed Receipt Card */}
              <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)] space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 uppercase tracking-wider font-semibold">
                    Issuer
                  </span>
                  <span className="font-medium text-neutral-800">
                    {activeCase.employer}
                  </span>
                </div>

                <div className="border-t border-neutral-100 pt-2 flex items-baseline justify-between">
                  <span className="text-[11px] text-neutral-400">Verified Income</span>
                  <div className="text-right">
                    <span className="text-xl font-semibold tracking-tight text-neutral-900 font-mono">
                      {isMasked ? activeCase.threshold : activeCase.amount}
                    </span>
                    <p className="text-[10px] text-neutral-400">
                      {isMasked
                        ? "Zero-Knowledge Range Proof"
                        : "Exact Settled Transfer"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-neutral-50 p-2.5 text-[11px] space-y-1 text-neutral-500">
                  <div className="flex justify-between">
                    <span>Program:</span>
                    <span className="font-mono text-neutral-700">SPL Token-2022</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tx Commitment:</span>
                    <span className="font-mono text-neutral-700">{activeCase.txHash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audience:</span>
                    <span className="text-neutral-700 font-medium">
                      {activeCase.disclosureTarget}
                    </span>
                  </div>
                </div>

                {/* Disclosure Preference Toggle */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-600 font-medium">
                    Mask exact balance:
                  </span>
                  <button
                    onClick={() => setIsMasked(!isMasked)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      isMasked ? "bg-neutral-900" : "bg-neutral-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        isMasked ? "translate-x-4.5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Actionable Disclosure Pill inside Device */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleCopy}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all flex items-center justify-center gap-1.5"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  <span>{copied ? "Link Copied!" : "Share Verification Link"}</span>
                </button>

                <p className="text-[10px] text-center text-neutral-400">
                  {activeCase.verifierNote}
                </p>
              </div>

              {/* Faded bottom placeholder items to demonstrate depth */}
              <div className="rounded-xl border border-neutral-200/50 bg-white/70 p-3 opacity-60">
                <div className="h-3 w-1/3 bg-neutral-200 rounded-sm mb-2" />
                <div className="h-2 w-2/3 bg-neutral-100 rounded-sm" />
              </div>
            </div>
          </div>
        </section>

        {/* Verifier Disclosure Jump Box */}
        <section className="w-full max-w-xl mx-auto px-6 py-8">
          <div className="p-6 sm:p-8 rounded-3xl border border-neutral-200/90 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
            <h2 className="text-center font-serif text-2xl font-normal text-neutral-900 mb-2">
              Inspect an issued disclosure
            </h2>
            <p className="text-center text-xs text-neutral-500 mb-6">
              Lenders, landlords, and service providers can independently verify
              confidential cryptographic proofs.
            </p>
            <VerifierTokenInput variant="light" />
          </div>
        </section>

        {/* 5. Conversion Section (Sparse, Editorial, Concluding) */}
        <section className="w-full max-w-3xl mx-auto px-6 py-28 sm:py-36 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-[-0.03em] text-[#171717] leading-tight mb-4">
            Verifiable proof without financial exposure.
          </h2>
          <p className="max-w-lg mx-auto text-sm sm:text-base text-[#6F6F6F] mb-10 leading-relaxed font-sans">
            Issue cryptographically signed receipts or manage selective proofs in under two
            minutes on Solana.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/employer/payments/new"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-[#171717] px-7 py-3.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] hover:bg-neutral-800 hover:shadow-[0_14px_28px_rgba(0,0,0,0.16)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              Issue payment proof
            </Link>
            <Link
              href="/contractor/receipts"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-7 py-3.5 text-sm font-medium text-neutral-800 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:border-neutral-400 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              Contractor: My receipt vault
            </Link>
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <footer className="w-full border-t border-neutral-200/80 bg-white py-10">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-neutral-500">
          {/* Left: Legal and Privacy Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/verify/disclosure-policy"
              className="hover:text-neutral-900 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/verify/disclosure-policy"
              className="hover:text-neutral-900 transition-colors"
            >
              Terms of Protocol
            </Link>
            <span className="text-neutral-400 hidden md:inline">·</span>
            <span className="text-neutral-400">
              © 2026 PayProof Labs. Built on Solana.
            </span>
          </div>

          {/* Right: Understated External / Social Links */}
          <div className="flex items-center gap-5">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-neutral-900 transition-colors"
              aria-label="GitHub Repository"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a
              href="https://solana.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-neutral-900 transition-colors"
              aria-label="Solana Ecosystem"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.7 18.2l2.8-2.8c.4-.4 1-.6 1.5-.6h12.3c.7 0 1.2.8.8 1.4l-2.8 2.8c-.4.4-1 .6-1.5.6H4.5c-.7 0-1.2-.8-.8-1.4zm0-9.6L6.5 5.8c.4-.4 1-.6 1.5-.6h12.3c.7 0 1.2.8.8 1.4l-2.8 2.8c-.4.4-1 .6-1.5.6H4.5c-.7 0-1.2-.8-.8-1.4zm16.6 4.8l-2.8 2.8c-.4.4-1 .6-1.5.6H3.7c-.7 0-1.2-.8-.8-1.4l2.8-2.8c.4-.4 1-.6 1.5-.6h12.3c.7 0 1.2.8.8 1.4z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
