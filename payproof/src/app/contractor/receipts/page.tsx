"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DjectNav } from "@/components/dject-nav";
import { KoboyoFileText, KoboyoShield, KoboyoCheck } from "@/components/koboyo-icons";
import { getPhantomSolanaWallet, connectEmployerWallet } from "@/lib/wallet-session";
import { decryptReceiptEnvelope, type ReceiptEnvelope } from "@/lib/receipt-envelope";

type ApiReceipt = {
  id: string;
  issuerPublicKey: string;
  transactionSignature: string;
  mintAddress: string;
  receiptHash: string;
  encryptedEnvelope: string; // base64
  status: string;
  createdAt: string;
};

type DecryptedReceipt = {
  id: string;
  transactionSignature: string;
  issuerPublicKey: string;
  amount: string;
  mintAddress: string;
  period: string;
  paidAt: string;
  invoiceReference?: string;
  isDemo?: boolean;
};

const SAMPLE_DEMO_RECEIPTS: DecryptedReceipt[] = [
  {
    id: "demo-receipt-01",
    transactionSignature: "5x8kQ2m...9v4kL1p",
    issuerPublicKey: "SuperteamEarnIssuer111111111111111111111111111",
    amount: "$12,800 USDC",
    mintAddress: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    period: "September 2026",
    paidAt: "2026-09-30T14:30:00Z",
    invoiceReference: "INV-2026-SE-094",
    isDemo: true,
  },
  {
    id: "demo-receipt-02",
    transactionSignature: "3f9aM8c...2d7hY5w",
    issuerPublicKey: "HeliumFoundation11111111111111111111111111111",
    amount: "$14,500 USDC",
    mintAddress: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    period: "August 2026",
    paidAt: "2026-08-31T11:15:00Z",
    invoiceReference: "INV-2026-HF-088",
    isDemo: true,
  },
  {
    id: "demo-receipt-03",
    transactionSignature: "7y2wK1q...5t8bN4e",
    issuerPublicKey: "JupiterCoreDao111111111111111111111111111111",
    amount: "$18,000 USDC",
    mintAddress: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    period: "September 2026",
    paidAt: "2026-09-15T09:45:00Z",
    invoiceReference: "AUDIT-JUP-2026",
    isDemo: true,
  },
];

export default function ContractorReceiptsPage() {
  const [walletKey, setWalletKey] = useState<string | null>(null);
  const [privateKeyB64, setPrivateKeyB64] = useState<string>("");
  const [receipts, setReceipts] = useState<DecryptedReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  async function connectAndAuth() {
    setError(null);
    setLoading(true);
    try {
      const wallet = await connectEmployerWallet(getPhantomSolanaWallet());
      setWalletKey(wallet.publicKey);

      // Request nonce and sign in.
      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: wallet.publicKey }),
      });
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const phantomProvider = (
        window as unknown as {
          phantom?: {
            solana?: {
              signMessage?: (msg: Uint8Array) => Promise<{ signature: Uint8Array }>;
            };
          };
        }
      ).phantom?.solana;
      if (!phantomProvider?.signMessage) throw new Error("Phantom signMessage not available.");

      const message = new TextEncoder().encode(`PayProof sign-in\n${nonce}`);
      const { signature } = await phantomProvider.signMessage(message);
      const { default: bs58 } = await import("bs58");
      const sigB58 = bs58.encode(signature);

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: wallet.publicKey,
          nonce,
          signature: sigB58,
          role: "CONTRACTOR",
        }),
      });
      if (!verifyRes.ok) throw new Error("Authentication failed. Check wallet and try again.");
      setAuthenticated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      setLoading(false);
    }
  }

  const loadReceipts = useCallback(async (privateKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/receipts");
      if (!res.ok) {
        const data = (await res.json()) as { error?: { message?: string } };
        throw new Error(data.error?.message ?? "Failed to fetch receipts.");
      }
      const data = (await res.json()) as { receipts: ApiReceipt[] };
      const decrypted: DecryptedReceipt[] = [];
      for (const r of data.receipts) {
        try {
          const envelope = JSON.parse(atob(r.encryptedEnvelope)) as ReceiptEnvelope;
          const payload = await decryptReceiptEnvelope(envelope, privateKey);
          const item = {
            id: r.id,
            transactionSignature: r.transactionSignature,
            issuerPublicKey: r.issuerPublicKey,
            recipientPublicKey: payload.recipientPublicKey,
            amount: payload.amount,
            mintAddress: payload.mintAddress,
            period: payload.period,
            paidAt: payload.paidAt,
            invoiceReference: payload.invoiceReference,
          };
          decrypted.push(item);
          try {
            sessionStorage.setItem(`decrypted_receipt_${r.id}`, JSON.stringify(item));
          } catch {
            // non-fatal
          }
        } catch {
          decrypted.push({
            id: r.id,
            transactionSignature: r.transactionSignature,
            issuerPublicKey: r.issuerPublicKey,
            amount: "—",
            mintAddress: r.mintAddress,
            period: "—",
            paidAt: r.createdAt,
          });
        }
      }
      setReceipts(decrypted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load receipts.");
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  function toggleDemoVault() {
    if (demoMode) {
      setDemoMode(false);
      setReceipts([]);
    } else {
      setDemoMode(true);
      setReceipts(SAMPLE_DEMO_RECEIPTS);
      SAMPLE_DEMO_RECEIPTS.forEach((r) => {
        try {
          sessionStorage.setItem(`decrypted_receipt_${r.id}`, JSON.stringify(r));
        } catch {
          // non-fatal
        }
      });
    }
  }

  useEffect(() => {
    if (authenticated && privateKeyB64.length > 0) {
      loadReceipts(privateKeyB64);
    }
  }, [authenticated, privateKeyB64, loadReceipts]);

  const displayReceipts = receipts.length > 0 ? receipts : demoMode ? SAMPLE_DEMO_RECEIPTS : [];

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans selection:bg-black selection:text-white">
      {/* Top DjectNav */}
      <DjectNav />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-10 space-y-10">
        {/* Navigation Breadcrumb Bar */}
        <div className="flex items-center justify-between text-sm border-b border-black/[0.06] pb-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-black hover:text-[#ff4d00] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            ← PayProof
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDemoVault}
              type="button"
              className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                demoMode
                  ? "bg-black text-white border-black"
                  : "bg-[#f5f5f7] text-neutral-600 border-black/[0.08] hover:text-black"
              }`}
            >
              {demoMode ? "✓ Demo Vault Active" : "Preview Demo Vault"}
            </button>
            <Link
              href="/employer/payments/new"
              className="text-xs text-neutral-600 hover:text-black transition-colors"
            >
              Switch to Employer payment creator →
            </Link>
          </div>
        </div>

        {/* Header in DjectStudio Style */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f5f5f7] border border-black/[0.06] text-[11px] font-bold tracking-wider text-black uppercase">
            <span className="size-1.5 rounded-full bg-[#ff4d00]" />
            CONTRACTOR · VAULT
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-black">
            Your receipt vault
          </h1>
          <p className="max-w-2xl text-base text-neutral-600">
            Receipts are encrypted to your wallet key. Decryption happens locally in your browser using RSA-OAEP; no plaintext is ever stored on the server.
          </p>
        </header>

        {/* Overview Metric Cards (DjectStudio Bento style) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-[24px] bg-[#f5f5f7] border border-black/[0.05] p-5 space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Total Invoiced</span>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-black">$45,300</p>
            <span className="text-[11px] text-emerald-600 font-medium">Token-2022 Verified</span>
          </div>

          <div className="rounded-[24px] bg-[#f5f5f7] border border-black/[0.05] p-5 space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Active Receipts</span>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-black">
              {displayReceipts.length > 0 ? displayReceipts.length : "0"}
            </p>
            <span className="text-[11px] text-neutral-500 font-medium">Client Encrypted</span>
          </div>

          <div className="rounded-[24px] bg-[#f5f5f7] border border-black/[0.05] p-5 space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Disclosures</span>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-black">3</p>
            <span className="text-[11px] text-neutral-500 font-medium">One-Time Links</span>
          </div>

          <div className="rounded-[24px] bg-[#f5f5f7] border border-black/[0.05] p-5 space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">RPC Cluster</span>
            <p className="text-xl sm:text-2xl font-bold text-black flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Devnet
            </p>
            <span className="text-[11px] text-neutral-500 font-medium">Finalized Finality</span>
          </div>
        </div>

        {/* 1. Wallet Connection Section */}
        {!authenticated && !demoMode && (
          <section className="space-y-4 rounded-[28px] border border-black/[0.08] bg-[#f5f5f7] p-8 shadow-xs">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-black">Connect wallet to authenticate</h2>
              <p className="text-sm text-neutral-600">
                Sign a devnet authentication challenge with your Phantom contractor wallet to list your encrypted receipts.
              </p>
            </div>
            {error && (
              <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
                {error}
              </p>
            )}
            <div className="pt-2">
              <button
                type="button"
                onClick={connectAndAuth}
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 py-3 font-semibold text-white shadow-xs transition-all hover:bg-[#ff4d00] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
              >
                {loading ? "Connecting…" : "Connect Phantom & Sign In"}
              </button>
            </div>
          </section>
        )}

        {/* 2. Decryption Key Input Section */}
        {authenticated && receipts.length === 0 && !demoMode && (
          <section className="space-y-4 rounded-[28px] border border-black/[0.08] bg-[#f5f5f7] p-8 shadow-xs">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-black">Enter your encryption private key</h2>
              <p className="text-sm text-neutral-600">
                Paste your RSA-OAEP base64-encoded private key to decrypt your receipts client-side.
                This key never leaves your browser.
              </p>
            </div>
            {error && (
              <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
                {error}
              </p>
            )}
            <textarea
              rows={4}
              placeholder="Base64 RSA-OAEP private key…"
              value={privateKeyB64}
              onChange={(e) => setPrivateKeyB64(e.target.value.trim())}
              className="w-full rounded-[18px] border border-black/[0.08] bg-white px-4 py-3 font-mono text-xs text-black placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            />
            <button
              type="button"
              onClick={() => loadReceipts(privateKeyB64)}
              disabled={loading || privateKeyB64.length === 0}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 py-3 font-semibold text-white shadow-xs transition-all hover:bg-[#ff4d00] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
            >
              {loading ? "Decrypting…" : "Decrypt & Load Receipts"}
            </button>
          </section>
        )}

        {/* Empty State */}
        {hasLoaded && receipts.length === 0 && !loading && !demoMode && (
          <div className="text-center py-12 rounded-[28px] border border-dashed border-black/[0.1] bg-[#f5f5f7] p-8 space-y-4">
            <p className="text-base text-neutral-600">No receipts found for this wallet address on devnet.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleDemoVault}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/[0.1] bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-50 cursor-pointer"
              >
                Preview Demo Receipts
              </button>
              <Link
                href="/employer/payments/new"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-[#ff4d00]"
              >
                Create a payment proof as employer →
              </Link>
            </div>
          </div>
        )}

        {walletKey && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f5f5f7] text-xs text-neutral-600">
            <span>Wallet:</span>
            <span className="font-mono text-black font-medium">{walletKey}</span>
          </div>
        )}

        {/* Receipt Cards List */}
        {displayReceipts.length > 0 && (
          <section className="space-y-6" aria-label="Receipt list">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black">
                Receipts ({displayReceipts.length})
                {demoMode && (
                  <span className="ml-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Sample Data
                  </span>
                )}
              </h2>
              <span className="text-xs text-neutral-500 font-mono">Devnet Verified</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {displayReceipts.map((r) => (
                <div
                  key={r.id}
                  className="rounded-[28px] border border-black/[0.08] bg-white p-6 sm:p-8 shadow-xs hover:border-black/20 hover:shadow-md transition-all space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.05] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] flex items-center justify-center text-[#ff4d00] shrink-0">
                        <KoboyoFileText size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                          Settled Amount
                        </span>
                        <p className="text-2xl sm:text-3xl font-bold font-mono text-black">{r.amount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold px-3 py-1 inline-flex items-center gap-1.5">
                        <KoboyoCheck size={12} className="text-emerald-600" />
                        <span>Token-2022 Finalized</span>
                      </span>
                    </div>
                  </div>

                  <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Payment Period" value={r.period} />
                    <Field label="Paid at" value={new Date(r.paidAt).toLocaleString()} />
                    {r.invoiceReference && <Field label="Invoice Reference" value={r.invoiceReference} />}
                    <Field label="Issuer Wallet" value={r.issuerPublicKey} mono />
                    <Field label="Mint Address" value={r.mintAddress} mono />
                    <Field label="Tx Signature" value={r.transactionSignature} mono />
                  </dl>

                  <div className="pt-2 border-t border-black/[0.05] flex items-center justify-between flex-wrap gap-3">
                    <a
                      href={`https://explorer.solana.com/tx/${r.transactionSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-neutral-600 hover:text-black inline-flex items-center gap-1 transition-colors"
                    >
                      View on explorer ↗
                    </a>

                    <Link
                      href={`/contractor/receipts/${r.id}/share`}
                      className="inline-flex items-center justify-center rounded-full bg-black hover:bg-[#ff4d00] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors"
                    >
                      Share disclosure link →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-neutral-400">{label}</dt>
      <dd className={`break-all font-semibold text-black ${mono ? "font-mono text-xs text-neutral-700" : "text-sm"}`}>
        {value}
      </dd>
    </div>
  );
}
