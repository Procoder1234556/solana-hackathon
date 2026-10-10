"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { disclosureFieldSchema, type DisclosureField } from "@/lib/disclosure";

const ALL_FIELDS = disclosureFieldSchema.options;
const FIELD_LABELS: Record<DisclosureField, string> = {
  amount: "Amount",
  mintAddress: "Token mint address",
  issuerPublicKey: "Payer wallet address",
  recipientPublicKey: "Your wallet address",
  period: "Payment period",
  paidAt: "Payment date/time",
  transactionSignature: "Transaction signature",
};

const EXPIRY_OPTIONS = [
  { label: "24 hours", value: 86400 },
  { label: "72 hours", value: 259200 },
  { label: "7 days", value: 604800 },
] as const;

type Params = Promise<{ id: string }>;

type DecryptedReceiptData = Record<string, string>;

export default function ShareReceiptPage({ params }: { params: Params }) {
  const { id } = use(params);
  const [decryptedReceipt, setDecryptedReceipt] = useState<DecryptedReceiptData | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<DisclosureField>>(new Set(["amount", "period", "paidAt"]));
  const [expirySeconds, setExpirySeconds] = useState<86400 | 259200 | 604800>(86400);
  const [privateKeyB64, setPrivateKeyB64] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; verifyUrl: string; expiresAt: string; token: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revoked, setRevoked] = useState(false);

  // Try to load cached decrypted receipt from vault session on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`decrypted_receipt_${id}`);
      if (cached) {
        setDecryptedReceipt(JSON.parse(cached) as DecryptedReceiptData);
      }
    } catch {
      // ignore
    }
  }, [id]);

  function toggleField(field: DisclosureField) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  async function issueDisclosure() {
    setError(null);
    setLoading(true);
    try {
      if (selectedFields.size === 0) throw new Error("Select at least one field to disclose.");

      // Ensure we have values: either from cached vault receipt or by prompting
      let values = decryptedReceipt;
      if (!values && privateKeyB64.trim()) {
        const res = await fetch("/api/receipts");
        if (res.ok) {
          const { receipts } = (await res.json()) as { receipts: Array<{ id: string; encryptedEnvelope: string; transactionSignature: string; issuerPublicKey: string }> };
          const matched = receipts.find((r) => r.id === id);
          if (matched) {
            const { decryptReceiptEnvelope } = await import("@/lib/receipt-envelope");
            const envelope = JSON.parse(atob(matched.encryptedEnvelope));
            const decrypted = await decryptReceiptEnvelope(envelope, privateKeyB64.trim());
            values = {
              amount: decrypted.amount,
              period: decrypted.period,
              paidAt: decrypted.paidAt,
              mintAddress: decrypted.mintAddress,
              issuerPublicKey: decrypted.issuerPublicKey,
              recipientPublicKey: decrypted.recipientPublicKey,
              transactionSignature: matched.transactionSignature,
            };
            setDecryptedReceipt(values);
          }
        }
      }

      // Generate a cryptographic one-time token for this disclosure
      const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
      const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");

      // Collect only the contractor-selected values
      const selectedValues: Partial<Record<DisclosureField, string>> = {};
      for (const field of selectedFields) {
        if (values?.[field]) {
          selectedValues[field] = values[field];
        }
      }

      const { encryptDisclosurePayload } = await import("@/lib/disclosure");
      const { encryptedPayloadBase64 } = await encryptDisclosurePayload(
        {
          version: 1,
          receiptId: id,
          fields: [...selectedFields],
          values: selectedValues,
          expiresAt: new Date(Date.now() + expirySeconds * 1000).toISOString(),
        },
        token,
      );

      // Sign the encrypted payload with Phantom if available, or compute fallback signature
      let signatureB64 = "";
      const phantomProvider = (window as unknown as { phantom?: { solana?: { publicKey?: { toString(): string }; signMessage?: (msg: Uint8Array) => Promise<{ signature: Uint8Array }> } } }).phantom?.solana;
      if (phantomProvider?.signMessage) {
        try {
          const { signature } = await phantomProvider.signMessage(new TextEncoder().encode(encryptedPayloadBase64));
          signatureB64 = btoa(String.fromCharCode(...signature));
        } catch {
          // Fallback hash signature if user rejects wallet prompt in testing
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(encryptedPayloadBase64));
          signatureB64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
        }
      } else {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(encryptedPayloadBase64));
        signatureB64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
      }

      const disclosureBody = {
        receiptId: id,
        fields: [...selectedFields],
        expirySeconds,
        token,
        encryptedPayload: encryptedPayloadBase64,
        payloadSignature: signatureB64,
      };

      let res = await fetch("/api/disclosures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(disclosureBody),
      });

      if (res.status === 401 && phantomProvider?.publicKey) {
        const pubkeyStr = phantomProvider.publicKey.toString();
        const nonceRes = await fetch("/api/auth/nonce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicKey: pubkeyStr }),
        });
        if (nonceRes.ok) {
          const { nonce } = (await nonceRes.json()) as { nonce: string };
          const signResult = await phantomProvider.signMessage?.(new TextEncoder().encode(`PayProof sign-in\n${nonce}`));
          if (signResult) {
            const { default: bs58 } = await import("bs58");
            const authRes = await fetch("/api/auth/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicKey: pubkeyStr, nonce, signature: bs58.encode(signResult.signature), role: "CONTRACTOR" }),
            });
            if (authRes.ok) {
              res = await fetch("/api/disclosures", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(disclosureBody),
              });
            }
          }
        }
      }

      const data = await res.json() as { id?: string; verifyUrl?: string; expiresAt?: string; token?: string; error?: { message?: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to create disclosure.");
      setResult({ id: data.id!, verifyUrl: data.verifyUrl!, expiresAt: data.expiresAt!, token: data.token! });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to issue disclosure.");
    } finally {
      setLoading(false);
    }
  }

  async function revokeDisclosure() {
    if (!result) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/disclosures/${result.id}/revoke`, { method: "POST" });
      if (res.ok) setRevoked(true);
      else setError("Revocation failed.");
    } catch {
      setError("Revocation failed.");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <Link href="/contractor/receipts" className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--primary)]">
          ← Receipt vault
        </Link>
        <header className="space-y-2">
          <p className="text-sm font-semibold tracking-[0.18em] text-[var(--primary)]">CONTRACTOR · SHARE</p>
          <h1 className="text-3xl font-semibold tracking-tight">Share a disclosure link</h1>
          <p className="text-[var(--muted)]">
            Select only the fields you want to share. The verifier will see only those fields, nothing else.
          </p>
        </header>

        {!result && (
          <form
            onSubmit={(e) => { e.preventDefault(); void issueDisclosure(); }}
            className="space-y-7 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
          >
            <fieldset className="space-y-3">
              <legend className="font-semibold">Fields to disclose</legend>
              {ALL_FIELDS.map((field) => (
                <label key={field} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field)}
                    onChange={() => toggleField(field)}
                    className="size-4 rounded border-[var(--border)] accent-[var(--primary)]"
                  />
                  <span>
                    {FIELD_LABELS[field]}
                    {decryptedReceipt?.[field] ? (
                      <span className="ml-2 font-mono text-xs text-[var(--muted)]">({decryptedReceipt[field]})</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="space-y-2">
              <label className="block font-semibold" htmlFor="expiry">Link expiry</label>
              <select
                id="expiry"
                value={expirySeconds}
                onChange={(e) => setExpirySeconds(Number(e.target.value) as typeof expirySeconds)}
                className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {!decryptedReceipt && (
              <div className="space-y-2">
                <label className="block font-semibold" htmlFor="privkey">Your RSA encryption private key (stays in browser)</label>
                <textarea
                  id="privkey"
                  rows={3}
                  placeholder="Base64 RSA-OAEP private key…"
                  value={privateKeyB64}
                  onChange={(e) => setPrivateKeyB64(e.target.value.trim())}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-xs text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                />
                <p className="text-xs text-[var(--muted)]">Used only to decrypt your receipt values locally in your browser so you can disclose them.</p>
              </div>
            )}

            {error && <p role="alert" className="rounded-lg border border-[var(--danger)] bg-[var(--danger-surface)] p-3 text-sm">{error}</p>}

            <div className="rounded-lg border border-[var(--warning)] bg-[var(--warning-surface)] p-4 text-sm">
              Preview: sharing {selectedFields.size === 0 ? "no" : [...selectedFields].map((f) => FIELD_LABELS[f]).join(", ")}. Expires in{" "}
              {EXPIRY_OPTIONS.find((o) => o.value === expirySeconds)?.label}.
            </div>

            <button
              type="submit"
              disabled={loading || selectedFields.size === 0}
              className="min-h-11 w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 font-semibold text-[var(--primary-foreground)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {loading ? "Creating link…" : "Create disclosure link"}
            </button>
          </form>
        )}

        {result && (
          <section className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-xl font-semibold">{revoked ? "Link revoked" : "Disclosure link created"}</h2>
            {!revoked && (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-[var(--muted)]">Share this link with the verifier:</p>
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <span className="flex-1 break-all font-mono text-sm">{result.verifyUrl}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(result.verifyUrl)}
                      className="shrink-0 rounded px-3 py-1.5 text-sm font-medium text-[var(--primary)] border border-[var(--border)] hover:bg-[var(--surface)]"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="flex gap-4 pt-1">
                    <a
                      href={result.verifyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[var(--primary)] underline font-medium"
                    >
                      Open verification page ↗
                    </a>
                  </div>
                  <p className="text-xs text-[var(--muted)]">Expires: {new Date(result.expiresAt).toLocaleString()}</p>
                </div>
                {error && <p role="alert" className="rounded-lg border border-[var(--danger)] bg-[var(--danger-surface)] p-3 text-sm">{error}</p>}
                <div className="flex flex-col gap-3 sm:flex-row pt-2">
                  <button
                    type="button"
                    onClick={() => void revokeDisclosure()}
                    disabled={revoking}
                    className="min-h-11 rounded-lg border border-[var(--danger)] px-4 py-2.5 text-sm font-semibold text-[var(--danger)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
                  >
                    {revoking ? "Revoking…" : "Revoke this link"}
                  </button>
                  <Link
                    href="/contractor/receipts"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)]"
                  >
                    ← Back to vault
                  </Link>
                </div>
              </>
            )}
            {revoked && (
              <div className="space-y-4">
                <p className="rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--muted)]">
                  The link has been revoked. It will return an invalid response if used.
                </p>
                <Link
                  href="/contractor/receipts"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)]"
                >
                  ← Back to vault
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
