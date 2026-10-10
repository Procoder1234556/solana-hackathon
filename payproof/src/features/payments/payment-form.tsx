"use client";

import { useState, useRef, type FormEvent } from "react";

import { createPaymentReview, type PaymentReview } from "@/lib/payment-request";
import { readPublicRuntimeConfig } from "@/lib/runtime-config";
import { submitToken2022Transfer } from "@/lib/token-2022-transfer";
import { connectEmployerWallet, getPhantomSolanaWallet } from "@/lib/wallet-session";
import { createReceiptDraft } from "@/lib/receipt-creation";
import { encryptReceiptEnvelope } from "@/lib/receipt-envelope";

const initialFields = {
  recipientPublicKey: "",
  amount: "",
  mintAddress: "",
  period: "",
  invoiceReference: "",
};

type ReceiptStep =
  | { stage: "idle" }
  | { stage: "submitting" }
  | { stage: "polling"; signature: string }
  | { stage: "confirmed"; signature: string; receiptHash: string; receiptDraftJson: string }
  | { stage: "stored"; id: string; signature: string }
  | { stage: "failed"; message: string };

export function PaymentForm() {
  const [fields, setFields] = useState(() => {
    let defaultMint = "";
    try {
      const config = readPublicRuntimeConfig();
      defaultMint = config.NEXT_PUBLIC_DEVNET_TOKEN_2022_MINT || config.NEXT_PUBLIC_CASH_MINT || "";
    } catch {
      // test fallback
    }
    return { ...initialFields, mintAddress: defaultMint };
  });
  const [review, setReview] = useState<PaymentReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletPublicKey, setWalletPublicKey] = useState<string | null>(null);
  const [contractorPubKeyB64, setContractorPubKeyB64] = useState("");
  const [receiptStep, setReceiptStep] = useState<ReceiptStep>({ stage: "idle" });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function connectWallet() {
    try {
      const wallet = await connectEmployerWallet(getPhantomSolanaWallet());
      setWalletPublicKey(wallet.publicKey);
      setError(null);

      // Opportunistically establish employer session if Phantom signMessage is available
      try {
        const phantom = (window as unknown as { phantom?: { solana?: { signMessage?: (msg: Uint8Array) => Promise<{ signature: Uint8Array }> } } }).phantom?.solana;
        if (phantom?.signMessage) {
          const nonceRes = await fetch("/api/auth/nonce", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicKey: wallet.publicKey }),
          });
          if (nonceRes.ok) {
            const { nonce } = (await nonceRes.json()) as { nonce: string };
            const { signature } = await phantom.signMessage(new TextEncoder().encode(`PayProof sign-in\n${nonce}`));
            const { default: bs58 } = await import("bs58");
            await fetch("/api/auth/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicKey: wallet.publicKey, nonce, signature: bs58.encode(signature), role: "EMPLOYER" }),
            });
          }
        }
      } catch {
        // Non-blocking in tests or if user cancels signMessage
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to connect Phantom wallet.");
    }
  }

  function updateField(name: keyof typeof initialFields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    setError(null);
  }

  function prepareReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!walletPublicKey) {
      setError("Connect the employer Phantom wallet before reviewing this payment.");
      return;
    }
    try {
      setReview(createPaymentReview(fields, walletPublicKey));
    } catch (reason) {
      setReview(null);
      setError(reason instanceof Error ? reason.message : "Check the payment details and try again.");
    }
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  async function pollForFinality(signature: string, issuerPublicKey: string, currentReview: PaymentReview) {
    const config = readPublicRuntimeConfig();
    setReceiptStep({ stage: "polling", signature });

    pollingRef.current = setInterval(async () => {
      try {
        const rpcRes = await fetch(config.NEXT_PUBLIC_SOLANA_RPC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTransaction",
            params: [signature, { encoding: "json", commitment: "finalized", maxSupportedTransactionVersion: 0 }],
          }),
        });
        const json = await rpcRes.json() as { result?: { meta?: { err?: unknown } | null; transaction?: { message?: { accountKeys?: string[] } } } | null };
        if (!json.result || json.result.meta?.err) return;
        const accountKeys = json.result.transaction?.message?.accountKeys ?? [];
        if (!accountKeys.includes(issuerPublicKey)) return;

        stopPolling();

        const evidence = {
          finality: "finalized" as const,
          accountKeys,
          tokenMints: [currentReview.mintAddress],
        };

        const draft = await createReceiptDraft(
          { ...currentReview, issuerPublicKey },
          signature,
          evidence,
        );

        setReceiptStep({
          stage: "confirmed",
          signature,
          receiptHash: draft.receiptHash,
          receiptDraftJson: JSON.stringify(draft.payload),
        });
      } catch {
        // Polling errors are transient — keep retrying.
      }
    }, 4000);
  }

  async function submitTransfer() {
    if (!review) return;
    try {
      const wallet = getPhantomSolanaWallet();
      if (!wallet.signAndSendTransaction) throw new Error("The connected wallet cannot submit Solana transactions.");
      setReceiptStep({ stage: "submitting" });
      const config = readPublicRuntimeConfig();
      const result = await submitToken2022Transfer({
        rpcUrl: config.NEXT_PUBLIC_SOLANA_RPC_URL,
        issuerPublicKey: review.issuerPublicKey,
        recipientPublicKey: review.recipientPublicKey,
        mintAddress: review.mintAddress,
        amount: review.amount,
        signAndSendTransaction: wallet.signAndSendTransaction,
      });
      await pollForFinality(result.signature, review.issuerPublicKey, review);
    } catch (reason) {
      stopPolling();
      setReceiptStep({ stage: "failed", message: reason instanceof Error ? reason.message : "The transaction could not be submitted." });
    }
  }

  async function storeReceipt() {
    if (receiptStep.stage !== "confirmed" || !review) return;
    if (!contractorPubKeyB64.trim()) {
      setError("Enter the contractor's RSA encryption public key to encrypt and store the receipt.");
      return;
    }
    try {
      const payload = JSON.parse(receiptStep.receiptDraftJson) as unknown;
      const envelope = await encryptReceiptEnvelope(payload, contractorPubKeyB64.trim());
      const envelopeB64 = btoa(JSON.stringify(envelope));

      const receiptPayload = {
        issuerPublicKey: review.issuerPublicKey,
        recipientPublicKey: review.recipientPublicKey,
        transactionSignature: receiptStep.signature,
        mintAddress: review.mintAddress,
        receiptHash: receiptStep.receiptHash,
        encryptedEnvelope: envelopeB64,
      };

      let res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receiptPayload),
      });

      if (res.status === 401) {
        // Attempt session sign-in with Phantom
        const phantom = (window as unknown as { phantom?: { solana?: { signMessage?: (msg: Uint8Array) => Promise<{ signature: Uint8Array }> } } }).phantom?.solana;
        if (phantom?.signMessage) {
          const nonceRes = await fetch("/api/auth/nonce", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicKey: review.issuerPublicKey }),
          });
          if (nonceRes.ok) {
            const { nonce } = (await nonceRes.json()) as { nonce: string };
            const { signature } = await phantom.signMessage(new TextEncoder().encode(`PayProof sign-in\n${nonce}`));
            const { default: bs58 } = await import("bs58");
            const authRes = await fetch("/api/auth/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicKey: review.issuerPublicKey, nonce, signature: bs58.encode(signature), role: "EMPLOYER" }),
            });
            if (authRes.ok) {
              res = await fetch("/api/receipts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(receiptPayload),
              });
            }
          }
        }
      }

      const data = await res.json() as { id?: string; error?: { message?: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to store receipt.");
      setReceiptStep({ stage: "stored", id: data.id!, signature: receiptStep.signature });
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to store receipt.");
    }
  }

  if (review) {
    return (
      <section aria-labelledby="review-heading" className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold tracking-[0.18em] text-[var(--primary)]">STEP 2 OF 2</p>
          <h2 id="review-heading" className="text-2xl font-semibold">Review payment details</h2>
          <p className="text-[var(--muted)]">Confirm every value in your wallet before you sign. A receipt is created only after final on-chain confirmation.</p>
        </div>
        <dl className="grid gap-4 rounded-lg border border-[var(--border)] p-4 sm:grid-cols-2">
          <ReviewItem label="Contractor wallet" value={review.recipientPublicKey} mono />
          <ReviewItem label="Employer wallet" value={review.issuerPublicKey} mono />
          <ReviewItem label="Amount" value={review.amount} />
          <ReviewItem label="Token-2022 mint" value={review.mintAddress} mono />
          <ReviewItem label="Payment period" value={review.period} />
          {review.invoiceReference ? <ReviewItem label="Invoice reference" value={review.invoiceReference} /> : null}
        </dl>
        <div className="rounded-lg border border-[var(--warning)] bg-[var(--warning-surface)] p-4 text-sm leading-6 text-[var(--foreground)]">
          Amounts may be confidential when the supported transfer capability is proven. Wallet participation remains public. This build currently uses the non-confidential receipt fallback.
        </div>

        {receiptStep.stage === "idle" && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setReview(null)} className="min-h-11 rounded-lg border border-[var(--border)] px-4 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]">Edit details</button>
            <button type="button" onClick={() => void submitTransfer()} className="min-h-11 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-center font-semibold text-[var(--primary-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]">Submit non-confidential Token-2022 transfer</button>
          </div>
        )}

        {receiptStep.stage === "submitting" && (
          <div role="status" className="rounded-lg border border-[var(--border)] p-4 text-sm">
            <p>Awaiting wallet approval and Devnet submission…</p>
          </div>
        )}

        {receiptStep.stage === "polling" && (
          <div role="status" className="rounded-lg border border-[var(--border)] p-4 text-sm space-y-2">
            <p>Submitted. Polling for finalized confirmation every 4 s…</p>
            <a className="inline-block break-all font-mono text-[var(--primary)] underline" href={`https://explorer.solana.com/tx/${receiptStep.signature}?cluster=devnet`} target="_blank" rel="noreferrer">View transaction in Explorer</a>
          </div>
        )}

        {receiptStep.stage === "confirmed" && (
          <div className="space-y-5 rounded-lg border border-green-700/60 bg-green-900/20 p-5">
            <p className="font-semibold text-green-400">✓ Transaction finalized — ready to store receipt</p>
            <a className="block break-all font-mono text-sm text-[var(--primary)] underline" href={`https://explorer.solana.com/tx/${receiptStep.signature}?cluster=devnet`} target="_blank" rel="noreferrer">View transaction in Explorer</a>
            <div className="space-y-2">
              <label className="block text-sm font-semibold" htmlFor="contractor-pubkey">Contractor RSA-OAEP encryption public key (base64, spki)</label>
              <p className="text-xs text-[var(--muted)]">The receipt is encrypted to this key in your browser. The server stores only the encrypted envelope.</p>
              <textarea
                id="contractor-pubkey"
                rows={3}
                placeholder="Base64 RSA-OAEP public key (spki format)…"
                value={contractorPubKeyB64}
                onChange={(e) => setContractorPubKeyB64(e.target.value.trim())}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-xs text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              />
            </div>
            {error && <p role="alert" className="rounded-lg border border-[var(--danger)] bg-[var(--danger-surface)] p-3 text-sm">{error}</p>}
            <button type="button" onClick={() => void storeReceipt()} disabled={!contractorPubKeyB64.trim()} className="min-h-11 rounded-lg bg-[var(--primary)] px-4 py-2.5 font-semibold text-[var(--primary-foreground)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
              Encrypt and store receipt
            </button>
          </div>
        )}

        {receiptStep.stage === "stored" && (
          <div className="rounded-lg border border-green-700/60 bg-green-900/20 p-5 space-y-4">
            <p className="font-semibold text-green-400">✓ Receipt stored</p>
            <p className="text-sm text-[var(--muted)]">The encrypted receipt is stored. The contractor can decrypt it from their vault.</p>
            <a className="block text-sm font-mono text-[var(--primary)] underline break-all" href={`https://explorer.solana.com/tx/${receiptStep.signature}?cluster=devnet`} target="_blank" rel="noreferrer">View transaction in Explorer ↗</a>
            <div className="flex flex-col gap-3 sm:flex-row pt-2">
              <a
                href="/contractor/receipts"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2.5 font-semibold text-[var(--primary-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Go to contractor vault →
              </a>
              <button
                type="button"
                onClick={() => { setReceiptStep({ stage: "idle" }); setReview(null); }}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] px-4 py-2.5 font-medium hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Issue another payment
              </button>
            </div>
          </div>
        )}

        {receiptStep.stage === "failed" && (
          <div role="alert" className="rounded-lg border border-[var(--danger)] bg-[var(--danger-surface)] p-4 text-sm space-y-2">
            <p>{receiptStep.message}</p>
            <button type="button" onClick={() => setReceiptStep({ stage: "idle" })} className="text-[var(--primary)] underline text-sm">Try again</button>
          </div>
        )}
      </section>
    );
  }

  return (
    <form onSubmit={prepareReview} className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6" noValidate>
      <div className="space-y-2">
        <p className="text-sm font-semibold tracking-[0.18em] text-[var(--primary)]">STEP 1 OF 2</p>
        <h2 className="text-2xl font-semibold">Payment details</h2>
        <p className="text-[var(--muted)]">You will review these values again in your wallet before signing.</p>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Employer wallet</p>
          <p className="break-all text-sm text-[var(--muted)]">{walletPublicKey ?? "Connect Phantom before you review or sign."}</p>
        </div>
        <button type="button" onClick={() => void connectWallet()} className="min-h-11 shrink-0 rounded-lg border border-[var(--border)] px-4 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]">{walletPublicKey ? "Reconnect Phantom" : "Connect Phantom"}</button>
      </div>
      {error ? <p role="alert" className="rounded-lg border border-[var(--danger)] bg-[var(--danger-surface)] p-3 text-sm text-[var(--foreground)]">{error}</p> : null}
      <div className="grid gap-5">
        <PaymentInput id="recipientPublicKey" label="Contractor wallet address" hint="Use the public address only; never enter a secret recovery phrase." value={fields.recipientPublicKey} onChange={(value) => updateField("recipientPublicKey", value)} />
        <PaymentInput id="amount" label="Amount" hint="Up to eight decimal places." value={fields.amount} inputMode="decimal" onChange={(value) => updateField("amount", value)} />
        <PaymentInput id="mintAddress" label="Token-2022 mint address" value={fields.mintAddress} onChange={(value) => updateField("mintAddress", value)} />
        <PaymentInput id="period" label="Payment period" hint="For example, September 2026." value={fields.period} onChange={(value) => updateField("period", value)} />
        <PaymentInput id="invoiceReference" label="Invoice reference (optional)" hint="This remains encrypted in the receipt envelope." value={fields.invoiceReference} onChange={(value) => updateField("invoiceReference", value)} />
      </div>
      <button type="submit" className="min-h-11 w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 font-semibold text-[var(--primary-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]">Review payment</button>
    </form>
  );
}

function PaymentInput({ id, label, hint, value, inputMode, onChange }: { id: string; label: string; hint?: string; value: string; inputMode?: "decimal"; onChange: (value: string) => void }) {
  return <div className="space-y-2"><label htmlFor={id} className="block font-medium">{label}</label><input id={id} name={id} type="text" inputMode={inputMode} autoComplete="off" spellCheck={false} value={value} onChange={(event) => onChange(event.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" />{hint ? <p id={`${id}-hint`} className="text-sm text-[var(--muted)]">{hint}</p> : null}</div>;
}

function ReviewItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><dt className="text-sm text-[var(--muted)]">{label}</dt><dd className={`mt-1 break-all font-medium ${mono ? "font-mono text-sm" : ""}`}>{value}</dd></div>;
}
