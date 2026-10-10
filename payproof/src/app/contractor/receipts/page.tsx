"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
};

export default function ContractorReceiptsPage() {
  const [walletKey, setWalletKey] = useState<string | null>(null);
  const [privateKeyB64, setPrivateKeyB64] = useState<string>("");
  const [receipts, setReceipts] = useState<DecryptedReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

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
      const { nonce } = await nonceRes.json() as { nonce: string };

      const phantomProvider = (window as unknown as { phantom?: { solana?: { signMessage?: (msg: Uint8Array) => Promise<{ signature: Uint8Array }> } } }).phantom?.solana;
      if (!phantomProvider?.signMessage) throw new Error("Phantom signMessage not available.");

      const message = new TextEncoder().encode(`PayProof sign-in\n${nonce}`);
      const { signature } = await phantomProvider.signMessage(message);
      // Encode signature as base58.
      const { default: bs58 } = await import("bs58");
      const sigB58 = bs58.encode(signature);

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: wallet.publicKey, nonce, signature: sigB58, role: "CONTRACTOR" }),
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
        const data = await res.json() as { error?: { message?: string } };
        throw new Error(data.error?.message ?? "Failed to fetch receipts.");
      }
      const data = await res.json() as { receipts: ApiReceipt[] };
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
          // If decryption fails the private key is wrong — skip silently, listed as undecryptable.
          decrypted.push({ id: r.id, transactionSignature: r.transactionSignature, issuerPublicKey: r.issuerPublicKey, amount: "—", mintAddress: r.mintAddress, period: "—", paidAt: r.createdAt });
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

  useEffect(() => {
    if (authenticated && privateKeyB64.length > 0) {
      loadReceipts(privateKeyB64);
    }
  }, [authenticated, privateKeyB64, loadReceipts]);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between text-sm">
          <Link href="/" className="inline-flex min-h-11 items-center font-medium text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
            ← PayProof
          </Link>
          <Link href="/employer/payments/new" className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline">
            Switch to Employer payment creator →
          </Link>
        </div>
        <header className="space-y-2">
          <p className="text-sm font-semibold tracking-[0.18em] text-[var(--primary)]">CONTRACTOR · VAULT</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your receipt vault</h1>
          <p className="max-w-prose text-[var(--muted)]">
            Receipts are encrypted to your wallet key. The decryption happens here in your browser; no plaintext is sent to the server.
          </p>
        </header>

        {!authenticated && (
          <section className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-xl font-semibold">Connect wallet to authenticate</h2>
            {error && <p role="alert" className="rounded-lg border border-[var(--danger)] bg-[var(--danger-surface)] p-3 text-sm">{error}</p>}
            <button
              type="button"
              onClick={connectAndAuth}
              disabled={loading}
              className="min-h-11 rounded-lg bg-[var(--primary)] px-5 py-2.5 font-semibold text-[var(--primary-foreground)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {loading ? "Connecting…" : "Connect Phantom & Sign In"}
            </button>
          </section>
        )}

        {authenticated && receipts.length === 0 && (
          <section className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-xl font-semibold">Enter your encryption private key</h2>
            <p className="text-sm text-[var(--muted)]">
              Paste your RSA-OAEP base64-encoded private key to decrypt your receipts client-side.
              This key never leaves your browser.
            </p>
            {error && <p role="alert" className="rounded-lg border border-[var(--danger)] bg-[var(--danger-surface)] p-3 text-sm">{error}</p>}
            <textarea
              rows={4}
              placeholder="Base64 RSA-OAEP private key…"
              value={privateKeyB64}
              onChange={(e) => setPrivateKeyB64(e.target.value.trim())}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-xs text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            />
            <button
              type="button"
              onClick={() => loadReceipts(privateKeyB64)}
              disabled={loading || privateKeyB64.length === 0}
              className="min-h-11 rounded-lg bg-[var(--primary)] px-5 py-2.5 font-semibold text-[var(--primary-foreground)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {loading ? "Decrypting…" : "Decrypt & Load Receipts"}
            </button>
          </section>
        )}

        {hasLoaded && receipts.length === 0 && !loading && (
          <div className="text-center py-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 space-y-3">
            <p className="text-sm text-[var(--muted)]">No receipts found for this wallet address.</p>
            <Link
              href="/employer/payments/new"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)]"
            >
              Create a payment proof as employer →
            </Link>
          </div>
        )}

        {walletKey && (
          <p className="text-xs text-[var(--muted)]">
            Wallet: <span className="font-mono">{walletKey}</span>
          </p>
        )}

        {receipts.length > 0 && (
          <section className="space-y-4" aria-label="Receipt list">
            <h2 className="text-xl font-semibold">Receipts ({receipts.length})</h2>
            <ul className="space-y-4">
              {receipts.map((r) => (
                <li key={r.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <Field label="Amount" value={r.amount} />
                    <Field label="Period" value={r.period} />
                    <Field label="Paid at" value={new Date(r.paidAt).toLocaleString()} />
                    <Field label="Mint" value={r.mintAddress} mono />
                    <Field label="Issuer" value={r.issuerPublicKey} mono />
                    <Field label="Tx signature" value={r.transactionSignature} mono />
                    {r.invoiceReference && <Field label="Invoice ref" value={r.invoiceReference} />}
                  </dl>
                  <div className="flex gap-3 flex-wrap">
                    <a
                      href={`https://explorer.solana.com/tx/${r.transactionSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[var(--primary)] underline"
                    >
                      View on explorer ↗
                    </a>
                    <Link
                      href={`/contractor/receipts/${r.id}/share`}
                      className="text-sm text-[var(--primary)] underline"
                    >
                      Share disclosure link →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-[var(--muted)]">{label}</dt>
      <dd className={`mt-1 break-all font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
