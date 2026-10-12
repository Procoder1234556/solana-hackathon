"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { DjectNav } from "@/components/dject-nav";
import { disclosureFieldSchema, type DisclosureField } from "@/lib/disclosure";
import { fetchWithRetry } from "@/lib/client-fetch";

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

      let res = await fetchWithRetry("/api/disclosures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(disclosureBody),
      });

      if (res.status === 401 && phantomProvider?.publicKey) {
        const pubkeyStr = phantomProvider.publicKey.toString();
        const nonceRes = await fetchWithRetry("/api/auth/nonce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicKey: pubkeyStr, role: "CONTRACTOR" }),
        });
        if (nonceRes.ok) {
          const { nonce } = (await nonceRes.json()) as { nonce: string };
          const signResult = await phantomProvider.signMessage?.(new TextEncoder().encode(`PayProof sign-in\n${nonce}`));
          if (signResult) {
            const { default: bs58 } = await import("bs58");
            const authRes = await fetchWithRetry("/api/auth/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicKey: pubkeyStr, nonce, signature: bs58.encode(signResult.signature), role: "CONTRACTOR" }),
            });
            if (authRes.ok) {
              res = await fetchWithRetry("/api/disclosures", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(disclosureBody),
              });
            }
          }
        }
      }

      const data = (await res.json()) as { id?: string; verifyUrl?: string; expiresAt?: string; token?: string; error?: { message?: string } };
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
      const res = await fetchWithRetry(`/api/disclosures/${result.id}/revoke`, { method: "POST" });
      if (res.ok) setRevoked(true);
      else setError("Revocation failed.");
    } catch {
      setError("Revocation failed.");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans selection:bg-black selection:text-white">
      <DjectNav />

      <main className="flex-1 w-full max-w-[840px] mx-auto px-4 sm:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between text-sm border-b border-black/[0.06] pb-4">
          <Link
            href="/contractor/receipts"
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-black hover:text-[#ff4d00] transition-colors"
          >
            ← Receipt vault
          </Link>
        </div>

        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f5f5f7] border border-black/[0.06] text-[11px] font-bold tracking-wider text-black uppercase">
            <span className="size-1.5 rounded-full bg-[#ff4d00]" />
            CONTRACTOR · SHARE
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black">
            Share a disclosure link
          </h1>
          <p className="text-sm sm:text-base text-neutral-600">
            Select only the fields you want to share. The verifier will see only those fields, nothing else.
          </p>
        </header>

        {!result && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void issueDisclosure();
            }}
            className="space-y-8 rounded-[28px] border border-black/[0.08] bg-[#f5f5f7] p-8 shadow-xs"
          >
            <fieldset className="space-y-4">
              <legend className="text-sm font-bold uppercase tracking-wider text-black mb-2">Fields to disclose</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_FIELDS.map((field) => {
                  const isChecked = selectedFields.has(field);
                  return (
                    <label
                      key={field}
                      className={`flex items-start gap-3 p-3.5 rounded-[18px] border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-white border-black text-black shadow-xs"
                          : "bg-white/60 border-black/[0.06] text-neutral-600 hover:bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleField(field)}
                        className="mt-0.5 size-4 rounded-md border-black/[0.2] accent-black cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-semibold block">{FIELD_LABELS[field]}</span>
                        {decryptedReceipt?.[field] ? (
                          <span className="font-mono text-[11px] text-neutral-500 block truncate max-w-[220px]">
                            {decryptedReceipt[field]}
                          </span>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-900" htmlFor="expiry">
                Link expiry
              </label>
              <select
                id="expiry"
                value={expirySeconds}
                onChange={(e) => setExpirySeconds(Number(e.target.value) as typeof expirySeconds)}
                className="min-h-12 w-full rounded-[16px] border border-black/[0.08] bg-white px-4 text-xs font-semibold text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
              >
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {!decryptedReceipt && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-900" htmlFor="privkey">
                  Your RSA encryption private key (stays in browser)
                </label>
                <textarea
                  id="privkey"
                  rows={3}
                  placeholder="Base64 RSA-OAEP private key…"
                  value={privateKeyB64}
                  onChange={(e) => setPrivateKeyB64(e.target.value.trim())}
                  className="w-full rounded-[16px] border border-black/[0.08] bg-white px-4 py-3 font-mono text-xs text-black placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                />
                <p className="text-[11px] text-neutral-500">
                  Used only to decrypt your receipt values locally in your browser so you can disclose them.
                </p>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
                {error}
              </p>
            )}

            <div className="rounded-[18px] border border-black/[0.06] bg-white p-4 text-xs text-neutral-600 leading-relaxed">
              Preview: sharing {selectedFields.size === 0 ? "no fields" : [...selectedFields].map((f) => FIELD_LABELS[f]).join(", ")}. Expires in{" "}
              {EXPIRY_OPTIONS.find((o) => o.value === expirySeconds)?.label}.
            </div>

            <button
              type="submit"
              disabled={loading || selectedFields.size === 0}
              className="min-h-12 w-full rounded-full bg-black px-6 py-3 font-semibold text-white shadow-xs transition-all hover:bg-[#ff4d00] disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Creating link…" : "Create disclosure link"}
            </button>
          </form>
        )}

        {result && (
          <section className="space-y-6 rounded-[28px] border border-black/[0.08] bg-[#f5f5f7] p-8 shadow-xs">
            <h2 className="text-2xl font-bold text-black">{revoked ? "Link revoked" : "Disclosure link created"}</h2>
            {!revoked && (
              <>
                <div className="space-y-3">
                  <p className="text-xs sm:text-sm text-neutral-600">Share this link with the verifier:</p>
                  <div className="flex items-center gap-2 rounded-[18px] border border-black/[0.08] bg-white p-3.5">
                    <span className="flex-1 break-all font-mono text-xs text-black">{result.verifyUrl}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(result.verifyUrl)}
                      className="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold text-white bg-black hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="flex gap-4 pt-1">
                    <a
                      href={result.verifyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#ff4d00] hover:underline"
                    >
                      Open verification page ↗
                    </a>
                  </div>
                  <p className="text-xs text-neutral-500">Expires: {new Date(result.expiresAt).toLocaleString()}</p>
                </div>
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
                <div className="flex flex-col gap-3 sm:flex-row pt-2">
                  <button
                    type="button"
                    onClick={() => void revokeDisclosure()}
                    disabled={revoking}
                    className="min-h-11 rounded-full border border-red-200 bg-white px-5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {revoking ? "Revoking…" : "Revoke this link"}
                  </button>
                  <Link
                    href="/contractor/receipts"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/[0.1] bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-neutral-50 transition-colors"
                  >
                    ← Back to vault
                  </Link>
                </div>
              </>
            )}
            {revoked && (
              <div className="space-y-4">
                <p className="rounded-[18px] border border-black/[0.06] bg-white p-4 text-xs text-neutral-600">
                  The link has been revoked. It will return an invalid response if used.
                </p>
                <Link
                  href="/contractor/receipts"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-[#ff4d00] transition-colors"
                >
                  ← Back to vault
                </Link>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
