"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { DjectNav } from "@/components/dject-nav";
import { VerifierTokenInput } from "@/features/verification/verifier-token-input";
import {
  KoboyoUser,
  KoboyoBuilding,
  KoboyoZap,
  KoboyoShield,
  KoboyoLandmark,
  KoboyoHandshake,
  KoboyoSuperteam,
  KoboyoHelium,
  KoboyoJupiter,
  KoboyoMetaplex,
  KoboyoDrift,
  KoboyoPyth,
  KoboyoSolana,
  KoboyoRaydium,
} from "@/components/koboyo-icons";

type UseCase = {
  id: string;
  label: string;
  icon: ReactNode;
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
    icon: <KoboyoBuilding size={14} />,
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
    icon: <KoboyoZap size={14} />,
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
    icon: <KoboyoShield size={14} />,
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
    icon: <KoboyoLandmark size={14} />,
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
    icon: <KoboyoHandshake size={14} />,
    employer: "Drift Protocol",
    role: "Integration Specialist",
    amount: "$6,500 USDC",
    threshold: "Milestone 03 Completion Validated",
    disclosureTarget: "Arbitration DAO / Escrow Partner",
    verifierNote: "Irrefutable proof of issuer fund commitment and contractor receipt",
    txHash: "5n1r...9v4k",
  },
];

const SHOWCASE_ROW_1 = [
  {
    client: "Superteam Earn",
    role: "Solana Core Contributor",
    amount: "$12,800 USDC",
    type: "Token-2022 Confidential",
    tag: "Devnet Finalized",
    date: "Sep 2026",
    id: "st-earn",
    icon: <KoboyoSuperteam size={16} />,
  },
  {
    client: "Helium Foundation",
    role: "Protocol Engineering",
    amount: "$14,500 USDC",
    type: "ElGamal Range Proof",
    tag: "Threshold Verified",
    date: "Aug 2026",
    id: "helium",
    icon: <KoboyoHelium size={16} />,
  },
  {
    client: "Jupiter DAO",
    role: "Security Audit Lead",
    amount: "$18,000 USDC",
    type: "Token-2022 Transfer",
    tag: "Confidential",
    date: "Sep 2026",
    id: "jup-dao",
    icon: <KoboyoJupiter size={16} />,
  },
  {
    client: "Metaplex Studios",
    role: "Digital Asset Architect",
    amount: "$9,200 USDC",
    type: "ZK Verified Receipt",
    tag: "Private Settlement",
    date: "Jul 2026",
    id: "metaplex",
    icon: <KoboyoMetaplex size={16} />,
  },
];

const SHOWCASE_ROW_2 = [
  {
    client: "Drift Protocol",
    role: "DEX Integration Lead",
    amount: "$6,500 USDC",
    type: "Milestone Settlement",
    tag: "Cryptographic Seal",
    date: "Aug 2026",
    id: "drift",
    icon: <KoboyoDrift size={16} />,
  },
  {
    client: "Pyth Network",
    role: "Oracle SDK Maintainer",
    amount: "$11,200 USDC",
    type: "Token-2022 Transfer",
    tag: "Devnet Finalized",
    date: "Sep 2026",
    id: "pyth",
    icon: <KoboyoPyth size={16} />,
  },
  {
    client: "Solana Foundation",
    role: "Ecosystem Builder Grant",
    amount: "$20,000 USDC",
    type: "Confidential Grant",
    tag: "Zero-Knowledge",
    date: "Jun 2026",
    id: "sol-foundation",
    icon: <KoboyoSolana size={16} />,
  },
  {
    client: "Raydium Protocol",
    role: "Liquidity Architect",
    amount: "$15,400 USDC",
    type: "Retainer Verified",
    tag: "Threshold > $10k",
    date: "Sep 2026",
    id: "raydium",
    icon: <KoboyoRaydium size={16} />,
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
    <div className="min-h-screen bg-white text-[#0a0a0a] selection:bg-black selection:text-white flex flex-col font-sans">
      {/* 1. DjectStudio-Inspired Sticky Header */}
      <DjectNav />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center overflow-x-hidden">
        {/* 2. DjectStudio Editorial Hero Section */}
        <section className="w-full max-w-[1320px] mx-auto px-4 sm:px-8 pt-16 sm:pt-24 pb-16 text-center">
          {/* Subtle Devnet Category Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f5f5f7] border border-black/[0.06] text-[12px] font-semibold text-neutral-800 mb-8 transition-transform hover:scale-105">
            <span className="size-2 rounded-full bg-[#ff4d00] animate-pulse" />
            <span className="tracking-wide">PAYPROOF · TOKEN-2022 CONFIDENTIAL PROOFS</span>
          </div>

          {/* DjectStudio Display Headline */}
          <div className="flex flex-col items-center justify-center gap-1 mb-6">
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[92px] font-semibold tracking-[-0.04em] text-black leading-[0.98]">
              Share income,
              <br />
              <span className="italic font-serif font-normal">not wallet history.</span>
            </h1>
            <p className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-neutral-400 mt-4">
              Pay <span className="text-[#ff4d00] font-semibold italic font-serif">privately</span>. Prove <span className="text-black font-semibold italic font-serif">instantly</span>.
            </p>
          </div>

          {/* High Readability Lede */}
          <p className="max-w-[720px] mx-auto text-base sm:text-lg leading-relaxed text-neutral-600 mb-10">
            A cryptographic payment verification studio for founders, contractors, and DAOs.
            Issue signed Token-2022 confidential receipts and selectively disclose earnings without exposing your wallet balance or treasury history.
          </p>

          {/* DjectStudio Hero CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/employer/payments/new"
              className="inline-flex h-[56px] items-center justify-center gap-2 rounded-full bg-[#ff4d00] px-8 text-[16px] font-semibold text-white shadow-sm transition-all duration-300 hover:bg-[#e04400] hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Issue payment proof</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/contractor/receipts"
              className="inline-flex h-[56px] items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-[#f5f5f7] px-8 text-[16px] font-semibold text-black transition-all duration-300 hover:bg-neutral-200 hover:border-black/20"
            >
              <span>Contractor: My receipt vault</span>
            </Link>
          </div>

          {/* Privacy Boundary Banner (Deliberately clear & compliant) */}
          <div className="max-w-2xl mx-auto rounded-[24px] border border-black/[0.06] bg-[#f5f5f7] p-5 text-xs sm:text-[13px] leading-relaxed text-neutral-600 shadow-xs">
            <span className="font-semibold text-neutral-900">Privacy boundary:</span>{" "}
            confidential balances can hide amounts and balances, but payments are{" "}
            <strong className="font-semibold text-black">not anonymous</strong>—wallet accounts
            and transaction participation may remain public on Solana.
          </div>
        </section>

        {/* 3. DjectStudio Showcase Marquee: Selected Work / Live Proof Reel */}
        <section className="w-full py-12 overflow-hidden bg-neutral-50/50 border-y border-black/[0.04]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-8 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-[#ff4d00]">Real-World Devnet Proofs</p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-black">Selected verified income flows</h2>
            </div>
            <p className="text-xs text-neutral-500">Live cryptographic commitments settled via Token-2022</p>
          </div>

          {/* Row 1 Marquee */}
          <div className="relative w-full overflow-hidden mb-4">
            <div className="dj-animate-scroll-left flex gap-4">
              {[...SHOWCASE_ROW_1, ...SHOWCASE_ROW_1].map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="flex flex-col justify-between w-[320px] sm:w-[360px] h-[190px] rounded-[24px] bg-white border border-black/[0.07] p-6 shadow-xs hover:border-black/20 hover:shadow-md transition-all shrink-0 cursor-pointer"
                  onClick={() => {
                    const matched = USE_CASES.find((u) => u.employer === item.client);
                    if (matched) setActiveCaseId(matched.id);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-xl bg-[#f5f5f7] border border-black/[0.06] flex items-center justify-center text-[#ff4d00] shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{item.date}</span>
                        <h3 className="text-lg font-bold text-black leading-tight">{item.client}</h3>
                        <p className="text-xs text-neutral-500">{item.role}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-semibold px-2.5 py-0.5">
                      {item.tag}
                    </span>
                  </div>

                  <div className="border-t border-black/[0.04] pt-3 flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-black">{item.amount}</span>
                    <span className="text-[11px] font-medium text-[#ff4d00] flex items-center gap-1">
                      {item.type}
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2 Marquee (Reverse Scroll) */}
          <div className="relative w-full overflow-hidden">
            <div className="dj-animate-scroll-right flex gap-4">
              {[...SHOWCASE_ROW_2, ...SHOWCASE_ROW_2].map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="flex flex-col justify-between w-[320px] sm:w-[360px] h-[190px] rounded-[24px] bg-white border border-black/[0.07] p-6 shadow-xs hover:border-black/20 hover:shadow-md transition-all shrink-0 cursor-pointer"
                  onClick={() => {
                    const matched = USE_CASES.find((u) => u.employer === item.client);
                    if (matched) setActiveCaseId(matched.id);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-xl bg-[#f5f5f7] border border-black/[0.06] flex items-center justify-center text-neutral-800 shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{item.date}</span>
                        <h3 className="text-lg font-bold text-black leading-tight">{item.client}</h3>
                        <p className="text-xs text-neutral-500">{item.role}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 text-[10px] font-semibold px-2.5 py-0.5">
                      {item.tag}
                    </span>
                  </div>

                  <div className="border-t border-black/[0.04] pt-3 flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-black">{item.amount}</span>
                    <span className="text-[11px] font-medium text-black flex items-center gap-1">
                      {item.type}
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. DjectStudio "Privacy + Proof" Manifesto Section */}
        <section className="w-full py-28 bg-[#0a0a0a] text-white">
          <div className="max-w-[1200px] mx-auto px-6 sm:px-10 text-center space-y-6">
            <div className="inline-flex items-center gap-3">
              <span className="text-3xl sm:text-5xl font-semibold tracking-tight">Privacy</span>
              <span className="text-3xl sm:text-5xl font-light text-[#ff4d00]">+</span>
              <span className="text-3xl sm:text-5xl font-serif italic">Proof</span>
            </div>
            <p className="text-xl sm:text-3xl md:text-4xl font-normal leading-snug tracking-tight text-neutral-300 max-w-3xl mx-auto">
              We eliminate financial surveillance, protect contractor sovereignty, and verify earnings without exposing wallet balances.
            </p>
            <div className="pt-4 flex items-center justify-center gap-8 text-xs sm:text-sm text-neutral-400 font-mono">
              <span>// ZERO SERVERSIDE SECRETS</span>
              <span>// TOKEN-2022 CONFIDENTIAL</span>
              <span>// CLIENT-SIDE RSA-OAEP</span>
            </div>
          </div>
        </section>

        {/* 5. DjectStudio Bento Grid: "Why we stand out" */}
        <section id="why" className="w-full max-w-[1320px] mx-auto px-4 sm:px-8 py-28">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-16">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#ff4d00]">Architecture & Principles</p>
              <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-black">Why we stand out</h2>
            </div>
            <p className="text-base text-neutral-600 max-w-md">
              Whether you are proving contractor salary, leasing an apartment, or underwriting a loan—PayProof adapts to your privacy requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Bento Card 1 */}
            <div className="rounded-[28px] bg-[#f5f5f7] border border-black/[0.04] p-8 flex flex-col justify-between gap-10 hover:bg-[#efeff2] transition-colors">
              <div className="size-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-xs">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-black">Client-Side Zero-Knowledge</h3>
                <p className="text-sm leading-relaxed text-neutral-600">
                  Encryption keys never touch our servers. RSA-OAEP decryption and proof generation execute exclusively in your browser.
                </p>
              </div>
            </div>

            {/* Bento Card 2 */}
            <div className="rounded-[28px] bg-[#f5f5f7] border border-black/[0.04] p-8 flex flex-col justify-between gap-10 hover:bg-[#efeff2] transition-colors">
              <div className="size-12 rounded-2xl bg-[#ff4d00] text-white flex items-center justify-center shadow-xs">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-black">Token-2022 Native</h3>
                <p className="text-sm leading-relaxed text-neutral-600">
                  Built natively on Solana SPL Token-2022 confidential transfer extensions with ElGamal encryption and twisted ElGamal balance commitments.
                </p>
              </div>
            </div>

            {/* Bento Card 3 */}
            <div className="rounded-[28px] bg-[#f5f5f7] border border-black/[0.04] p-8 flex flex-col justify-between gap-10 hover:bg-[#efeff2] transition-colors">
              <div className="size-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-xs">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-black">Selective Disclosures</h3>
                <p className="text-sm leading-relaxed text-neutral-600">
                  Share only what you choose: prove your income exceeds $10,000/mo without revealing whether you have $10,001 or $1,000,000.
                </p>
              </div>
            </div>

            {/* Bento Card 4 */}
            <div className="rounded-[28px] bg-[#f5f5f7] border border-black/[0.04] p-8 flex flex-col justify-between gap-10 hover:bg-[#efeff2] transition-colors">
              <div className="size-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-xs">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-black">Cryptographic Finality</h3>
                <p className="text-sm leading-relaxed text-neutral-600">
                  Every receipt is validated against Solana RPC finalized state before becoming shareable. No unconfirmed transactions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Interactive Live Simulator & Device Showcase */}
        <section className="w-full max-w-[1320px] mx-auto px-4 sm:px-8 py-20 bg-[#f5f5f7] rounded-[36px] my-10 flex flex-col items-center">
          <div className="text-center max-w-xl mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ff4d00]">Interactive Simulator</span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black mt-1">Experience selective proof disclosure</h2>
            <p className="text-sm text-neutral-600 mt-2">
              Select a verification use-case below to test how contractors prove income to third parties without exposing their wallets.
            </p>
          </div>

          {/* Category Selector Pill Bar */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-full bg-white border border-black/[0.06] shadow-sm mb-12">
            {USE_CASES.map((uc) => {
              const isActive = uc.id === activeCaseId;
              return (
                <button
                  key={uc.id}
                  onClick={() => setActiveCaseId(uc.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-black text-white shadow-xs scale-[1.02]"
                      : "text-neutral-600 hover:text-black hover:bg-neutral-100"
                  }`}
                >
                  <span className={isActive ? "text-[#ff4d00]" : "text-neutral-500"}>{uc.icon}</span>
                  <span>{uc.label}</span>
                </button>
              );
            })}
          </div>

          {/* Device Mockup Shell */}
          <div className="relative w-full max-w-[400px] rounded-[48px] border border-black/[0.1] bg-white p-4 shadow-2xl overflow-hidden">
            <div className="w-full rounded-[38px] bg-[#f5f5f7] border border-black/[0.06] p-4 space-y-4">
              {/* Dynamic Island / Status Bar */}
              <div className="flex items-center justify-between text-[11px] font-medium text-neutral-400 px-2 pt-1">
                <span>9:41</span>
                <div className="w-20 h-4 rounded-full bg-black mx-auto" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">5G</span>
                  <div className="w-4 h-2 rounded-xs border border-neutral-400 p-0.5 flex items-center">
                    <div className="w-full h-full bg-neutral-600 rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* In-Product App Header */}
              <div className="flex items-center justify-between px-1 pt-1">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-black text-white flex items-center justify-center">
                    <KoboyoUser size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-black">Elena Vance</p>
                    <p className="text-[10px] text-neutral-500">{activeCase.role}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Vault Active
                </span>
              </div>

              {/* Encrypted Signed Receipt Card */}
              <div className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 uppercase tracking-wider font-semibold">Issuer</span>
                  <span className="font-bold text-black">{activeCase.employer}</span>
                </div>

                <div className="border-t border-black/[0.05] pt-2 flex items-baseline justify-between">
                  <span className="text-[11px] text-neutral-500">Verified Income</span>
                  <div className="text-right">
                    <span className="text-xl font-bold tracking-tight text-black font-mono">
                      {isMasked ? activeCase.threshold : activeCase.amount}
                    </span>
                    <p className="text-[10px] text-neutral-400">
                      {isMasked ? "Zero-Knowledge Range Proof" : "Exact Settled Transfer"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-[#f5f5f7] p-2.5 text-[11px] space-y-1 text-neutral-600">
                  <div className="flex justify-between">
                    <span>Program:</span>
                    <span className="font-mono font-medium text-black">SPL Token-2022</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tx Commitment:</span>
                    <span className="font-mono font-medium text-black">{activeCase.txHash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audience:</span>
                    <span className="font-medium text-black">{activeCase.disclosureTarget}</span>
                  </div>
                </div>

                {/* Disclosure Preference Toggle */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-600 font-medium">Mask exact balance:</span>
                  <button
                    onClick={() => setIsMasked(!isMasked)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                      isMasked ? "bg-black" : "bg-neutral-300"
                    }`}
                  >
                    <span
                      className={`inline-block size-3.5 transform rounded-full bg-white transition-transform ${
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
                  className="w-full py-2.5 px-4 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  <span>{copied ? "Link Copied!" : "Share Verification Link"}</span>
                </button>

                <p className="text-[10px] text-center text-neutral-500">{activeCase.verifierNote}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Verifier Disclosure Jump Box */}
        <section id="verify-section" className="w-full max-w-[720px] mx-auto px-4 py-12">
          <div className="p-8 sm:p-10 rounded-[32px] border border-black/[0.08] bg-[#f5f5f7] shadow-xs text-center space-y-4">
            <div className="size-10 rounded-full bg-black text-white flex items-center justify-center mx-auto">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-black">Inspect an issued disclosure</h2>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto">
              Lenders, landlords, and auditors can independently verify cryptographic payment tokens and proof validity.
            </p>
            <div className="pt-2">
              <VerifierTokenInput variant="light" />
            </div>
          </div>
        </section>

        {/* 8. DjectStudio Closing Call-To-Action */}
        <section className="w-full max-w-[960px] mx-auto px-4 sm:px-8 py-24 sm:py-32 text-center space-y-6">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-0.03em] text-black leading-tight">
            Verifiable proof without financial exposure.
          </h2>
          <p className="max-w-xl mx-auto text-base sm:text-lg text-neutral-600">
            Issue cryptographically signed receipts or manage selective proofs in under two minutes on Solana devnet.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/employer/payments/new"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-black px-8 py-4 text-sm font-semibold text-white shadow-xs hover:bg-[#ff4d00] transition-colors"
            >
              Issue payment proof
            </Link>
            <Link
              href="/contractor/receipts"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-black/[0.1] bg-[#f5f5f7] px-8 py-4 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors"
            >
              Contractor: My receipt vault
            </Link>
          </div>
        </section>
      </main>

      {/* 9. DjectStudio Clean Footer */}
      <footer className="w-full border-t border-black/[0.06] bg-white py-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-neutral-500">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-black">PayProof</Link>
            <span>© 2026 PayProof Labs. Built on Solana.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/contractor/receipts" className="hover:text-black transition-colors">Contractor Vault</Link>
            <Link href="/employer/payments/new" className="hover:text-black transition-colors">Employer Payments</Link>
            <a
              href="https://solana.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-black transition-colors flex items-center gap-1"
            >
              Solana Devnet
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
