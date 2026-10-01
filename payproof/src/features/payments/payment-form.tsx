"use client";

import { useState, type FormEvent } from "react";

import { createPaymentReview, type PaymentReview } from "@/lib/payment-request";
import { readPublicRuntimeConfig } from "@/lib/runtime-config";
import { submitToken2022Transfer } from "@/lib/token-2022-transfer";
import { connectEmployerWallet, getPhantomSolanaWallet } from "@/lib/wallet-session";

const initialFields = {
  recipientPublicKey: "",
  amount: "",
  mintAddress: "",
  period: "",
  invoiceReference: "",
};

export function PaymentForm() {
  const [fields, setFields] = useState(initialFields);
  const [review, setReview] = useState<PaymentReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletPublicKey, setWalletPublicKey] = useState<string | null>(null);
  const [submission, setSubmission] = useState<{ status: "pending" | "failed"; message?: string; signature?: string } | null>(null);

  async function connectWallet() {
    try {
      const wallet = await connectEmployerWallet(getPhantomSolanaWallet());
      setWalletPublicKey(wallet.publicKey);
      setError(null);
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

  async function submitTransfer() {
    if (!review) return;
    try {
      const wallet = getPhantomSolanaWallet();
      if (!wallet.signAndSendTransaction) throw new Error("The connected wallet cannot submit Solana transactions.");
      setSubmission({ status: "pending", message: "Awaiting wallet approval and Devnet submission." });
      const config = readPublicRuntimeConfig();
      const result = await submitToken2022Transfer({
        rpcUrl: config.NEXT_PUBLIC_SOLANA_RPC_URL,
        issuerPublicKey: review.issuerPublicKey,
        recipientPublicKey: review.recipientPublicKey,
        mintAddress: review.mintAddress,
        amount: review.amount,
        signAndSendTransaction: wallet.signAndSendTransaction,
      });
      setSubmission({ status: "pending", signature: result.signature, message: "Submitted. Waiting for finalized RPC evidence before creating a receipt." });
    } catch (reason) {
      setSubmission({ status: "failed", message: reason instanceof Error ? reason.message : "The transaction could not be submitted." });
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
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => setReview(null)} className="min-h-11 rounded-lg border border-[var(--border)] px-4 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]">Edit details</button>
          <button type="button" onClick={submitTransfer} disabled={submission?.status === "pending"} className="min-h-11 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-center font-semibold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]">Submit non-confidential Token-2022 transfer</button>
        </div>
        {submission ? <div role={submission.status === "failed" ? "alert" : "status"} className="rounded-lg border border-[var(--border)] p-4 text-sm"><p>{submission.message}</p>{submission.signature ? <a className="mt-2 inline-block break-all font-mono text-[var(--primary)] underline" href={`https://explorer.solana.com/tx/${submission.signature}?cluster=devnet`} target="_blank" rel="noreferrer">View submitted transaction in Explorer</a> : null}</div> : null}
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
        <button type="button" onClick={connectWallet} className="min-h-11 shrink-0 rounded-lg border border-[var(--border)] px-4 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]">{walletPublicKey ? "Reconnect Phantom" : "Connect Phantom"}</button>
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
