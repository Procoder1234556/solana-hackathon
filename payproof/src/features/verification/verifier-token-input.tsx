"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface VerifierTokenInputProps {
  variant?: "dark" | "light";
}

export function VerifierTokenInput({ variant = "dark" }: VerifierTokenInputProps) {
  const [tokenOrUrl, setTokenOrUrl] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = tokenOrUrl.trim();
    if (!raw) return;
    const match = raw.match(/\/verify\/([^/?#]+)/);
    const token = match ? match[1] : raw;
    const path = `/verify/${encodeURIComponent(token)}`;
    router.push(path);
    if (typeof window !== "undefined") {
      window.location.assign(path);
    }
  }

  if (variant === "light") {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-2">
        <label htmlFor="verifier-token" className="block text-center text-xs font-medium text-neutral-500">
          Verifier? Enter disclosure token or URL to inspect:
        </label>
        <div className="flex items-center gap-2 p-1.5 rounded-full bg-white border border-neutral-200/90 shadow-[0_10px_24px_rgba(0,0,0,0.05)] focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200 transition-all">
          <input
            id="verifier-token"
            type="text"
            value={tokenOrUrl}
            onChange={(e) => setTokenOrUrl(e.target.value)}
            placeholder="Paste verification token or URL…"
            className="flex-1 min-w-0 bg-transparent px-4 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!tokenOrUrl.trim()}
            className="inline-flex items-center justify-center rounded-full bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400"
          >
            Verify →
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-slate-800">
      <label htmlFor="verifier-token" className="block text-xs font-medium text-slate-400">
        Verifier? Enter disclosure token or URL to inspect:
      </label>
      <div className="flex gap-2">
        <input
          id="verifier-token"
          type="text"
          value={tokenOrUrl}
          onChange={(e) => setTokenOrUrl(e.target.value)}
          placeholder="Paste verification token or URL…"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        />
        <button
          type="submit"
          disabled={!tokenOrUrl.trim()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          Verify →
        </button>
      </div>
    </form>
  );
}
