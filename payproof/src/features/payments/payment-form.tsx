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

    let attempts = 0;
    const maxAttempts = 15; // 15 attempts * 4s = 60s timeout ceiling

    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        stopPolling();
        setReceiptStep({
          stage: "failed",
          message: "Transaction finalization polling timed out after 60s. The transaction may still be confirming on-chain.",
        });
        return;
      }

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
        const json = (await rpcRes.json()) as { result?: { meta?: { err?: unknown } | null; transaction?: { message?: { accountKeys?: string[] } } } | null };
        if (!json.result) return;
        if (json.result.meta?.err) {
          stopPolling();
          setReceiptStep({ stage: "failed", message: "Transaction failed on-chain according to RPC evidence." });
          return;
        }

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
        // Polling errors are transient — keep retrying until maxAttempts
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

      const data = (await res.json()) as { id?: string; error?: { message?: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to store receipt.");
      setReceiptStep({ stage: "stored", id: data.id!, signature: receiptStep.signature });
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to store receipt.");
    }
  }

  if (review) {
    return (
      <section aria-labelledby="review-heading" className="space-y-6 rounded-[28px] border border-black/[0.08] bg-[#f5f5f7] p-8 shadow-xs">
        <div className="space-y-2">
          <p className="text-xs font-bold tracking-wider text-[#ff4d00] uppercase">STEP 2 OF 2</p>
          <h2 id="review-heading" className="text-3xl font-semibold tracking-tight text-black">Review payment details</h2>
          <p className="text-sm text-neutral-600">Confirm every value in your wallet before you sign. A receipt is created only after final on-chain confirmation.</p>
        </div>

        <dl className="grid gap-4 rounded-[20px] bg-white border border-black/[0.06] p-6 sm:grid-cols-2">
          <ReviewItem label="Contractor wallet" value={review.recipientPublicKey} mono />
          <ReviewItem label="Employer wallet" value={review.issuerPublicKey} mono />
          <ReviewItem label="Amount" value={review.amount} />
          <ReviewItem label="Token-2022 mint" value={review.mintAddress} mono />
          <ReviewItem label="Payment period" value={review.period} />
          {review.invoiceReference ? <ReviewItem label="Invoice reference" value={review.invoiceReference} /> : null}
        </dl>

        <div className="rounded-[20px] border border-amber-300 bg-amber-50 p-5 text-xs sm:text-sm leading-relaxed text-amber-900">
          Amounts may be confidential when the supported transfer capability is proven. Wallet participation remains public. This build currently uses the non-confidential receipt fallback.
        </div>

        {receiptStep.stage === "idle" && (
          <div className="flex flex-col gap-3 sm:flex-row pt-2">
            <button
              type="button"
              onClick={() => setReview(null)}
              className="min-h-12 rounded-full border border-black/[0.1] bg-white px-6 font-semibold text-black transition-all hover:bg-neutral-100 cursor-pointer"
            >
              Edit details
            </button>
            <button
              type="button"
              onClick={() => void submitTransfer()}
              className="min-h-12 rounded-full bg-[#ff4d00] px-6 py-2.5 text-center font-semibold text-white shadow-xs transition-all hover:bg-[#e04400] cursor-pointer"
            >
              Submit non-confidential Token-2022 transfer
            </button>
          </div>
        )}

        {receiptStep.stage === "submitting" && (
          <div role="status" className="rounded-[20px] border border-black/[0.08] bg-white p-6 text-sm space-y-2">
            <p className="font-semibold text-black">Awaiting wallet approval and Devnet submission…</p>
            <p className="text-xs text-neutral-500">Approve the transaction in your Phantom extension.</p>
          </div>
        )}

        {receiptStep.stage === "polling" && (
          <div role="status" className="rounded-[20px] border border-black/[0.08] bg-white p-6 text-sm space-y-2">
            <p className="font-semibold text-black">Submitted. Polling for finalized confirmation every 4 s…</p>
            <a className="inline-block break-all font-mono text-xs text-[#ff4d00] hover:underline" href={`https://explorer.solana.com/tx/${receiptStep.signature}?cluster=devnet`} target="_blank" rel="noreferrer">
              View transaction in Explorer ↗
            </a>
          </div>
        )}

        {receiptStep.stage === "confirmed" && (
          <div className="space-y-5 rounded-[20px] border border-emerald-300 bg-emerald-50/70 p-6">
            <p className="font-bold text-emerald-800 text-base">✓ Transaction finalized — ready to store receipt</p>
            <a className="block break-all font-mono text-xs text-emerald-700 hover:underline" href={`https://explorer.solana.com/tx/${receiptStep.signature}?cluster=devnet`} target="_blank" rel="noreferrer">
              View transaction in Explorer ↗
            </a>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-black" htmlFor="contractor-pubkey">Contractor RSA-OAEP encryption public key (base64, spki)</label>
              <p className="text-xs text-neutral-600">The receipt is encrypted to this key in your browser. The server stores only the encrypted envelope.</p>
              <textarea
                id="contractor-pubkey"
                rows={3}
                placeholder="Base64 RSA-OAEP public key (spki format)…"
                value={contractorPubKeyB64}
                onChange={(e) => setContractorPubKeyB64(e.target.value.trim())}
                className="w-full rounded-[16px] border border-black/[0.08] bg-white px-4 py-3 font-mono text-xs text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              />
            </div>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <button
              type="button"
              onClick={() => void storeReceipt()}
              disabled={!contractorPubKeyB64.trim()}
              className="min-h-12 rounded-full bg-black px-6 py-2.5 font-semibold text-white disabled:opacity-60 hover:bg-[#ff4d00] transition-colors cursor-pointer"
            >
              Encrypt and store receipt
            </button>
          </div>
        )}

        {receiptStep.stage === "stored" && (
          <div className="rounded-[20px] border border-emerald-300 bg-emerald-50/70 p-6 space-y-4">
            <p className="font-bold text-emerald-800 text-base">✓ Receipt stored</p>
            <p className="text-sm text-neutral-700">The encrypted receipt is stored. The contractor can decrypt it from their vault.</p>
            <a className="block text-xs font-mono text-emerald-700 hover:underline break-all" href={`https://explorer.solana.com/tx/${receiptStep.signature}?cluster=devnet`} target="_blank" rel="noreferrer">
              View transaction in Explorer ↗
            </a>
            <div className="flex flex-col gap-3 sm:flex-row pt-2">
              <a
                href="/contractor/receipts"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-6 py-2.5 font-semibold text-white hover:bg-[#ff4d00] transition-colors"
              >
                Go to contractor vault →
              </a>
              <button
                type="button"
                onClick={() => { setReceiptStep({ stage: "idle" }); setReview(null); }}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/[0.1] bg-white px-6 py-2.5 font-semibold text-black hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Issue another payment
              </button>
            </div>
          </div>
        )}

        {receiptStep.stage === "failed" && (
          <div role="alert" className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm space-y-2 text-red-800">
            <p className="font-semibold">{receiptStep.message}</p>
            <button type="button" onClick={() => setReceiptStep({ stage: "idle" })} className="text-red-900 underline text-xs font-semibold cursor-pointer">
              Try again
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Form (7 cols) */}
      <form onSubmit={prepareReview} className="lg:col-span-7 space-y-6 rounded-[28px] border border-black/[0.08] bg-[#f5f5f7] p-8 shadow-xs" noValidate>
        <div className="space-y-1">
          <p className="text-xs font-bold tracking-wider text-[#ff4d00] uppercase">STEP 1 OF 2</p>
          <h2 className="text-2xl font-bold text-black">Payment details</h2>
          <p className="text-xs sm:text-sm text-neutral-600">You will review these values again in your wallet before signing.</p>
        </div>

        {/* Employer Wallet Bar */}
        <div className="flex flex-col gap-3 rounded-[20px] bg-white border border-black/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-neutral-500 uppercase">Employer wallet</p>
            <p className="break-all font-mono text-xs text-black font-semibold">
              {walletPublicKey ?? "Connect Phantom before you review or sign."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void connectWallet()}
            className="min-h-10 shrink-0 rounded-full border border-black/[0.1] bg-[#f5f5f7] px-4 text-xs font-semibold text-black hover:bg-neutral-200 transition-all cursor-pointer"
          >
            {walletPublicKey ? "Reconnect Phantom" : "Connect Phantom"}
          </button>
        </div>

        {error ? (
          <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800">
            {error}
          </p>
        ) : null}

        <div className="space-y-4">
          <PaymentInput
            id="recipientPublicKey"
            label="Contractor wallet address"
            hint="Use the public address only; never enter a secret recovery phrase."
            value={fields.recipientPublicKey}
            placeholder="Contractor Solana public key…"
            onChange={(value) => updateField("recipientPublicKey", value)}
          />
          <PaymentInput
            id="amount"
            label="Amount"
            hint="Up to eight decimal places."
            value={fields.amount}
            placeholder="e.g. 12500.00"
            inputMode="decimal"
            onChange={(value) => updateField("amount", value)}
          />
          <PaymentInput
            id="mintAddress"
            label="Token-2022 mint address"
            value={fields.mintAddress}
            placeholder="SPL Token-2022 mint address…"
            onChange={(value) => updateField("mintAddress", value)}
          />
          <PaymentInput
            id="period"
            label="Payment period"
            hint="For example, September 2026."
            value={fields.period}
            placeholder="e.g. September 2026"
            onChange={(value) => updateField("period", value)}
          />
          <PaymentInput
            id="invoiceReference"
            label="Invoice reference (optional)"
            hint="This remains encrypted in the receipt envelope."
            value={fields.invoiceReference}
            placeholder="e.g. INV-2026-092"
            onChange={(value) => updateField("invoiceReference", value)}
          />
        </div>

        <button
          type="submit"
          className="min-h-12 w-full rounded-full bg-black px-6 py-3 font-semibold text-white shadow-xs transition-all hover:bg-[#ff4d00] cursor-pointer"
        >
          Review payment
        </button>
      </form>

      {/* Right Column: Live Payment Receipt Preview Card (5 cols) in DjectStudio Style */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-[28px] border border-black/[0.08] bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-black/[0.05] pb-4">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Live Receipt Preview</span>
              <h3 className="text-lg font-bold text-black">Payment Receipt</h3>
            </div>
            <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5">
              Draft
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Settled Amount</span>
            <p className="text-3xl font-bold font-mono text-black">
              {fields.amount ? `$${fields.amount} USDC` : "$0.00 USDC"}
            </p>
          </div>

          <div className="rounded-[18px] bg-[#f5f5f7] p-4 text-xs space-y-2.5">
            <div className="flex justify-between">
              <span className="text-neutral-500">Period:</span>
              <span className="font-semibold text-black">{fields.period || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Recipient:</span>
              <span className="font-mono text-neutral-800 truncate max-w-[170px]">
                {fields.recipientPublicKey || "Not entered"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Mint:</span>
              <span className="font-mono text-neutral-800 truncate max-w-[170px]">
                {fields.mintAddress || "Default Token-2022"}
              </span>
            </div>
            {fields.invoiceReference && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Ref:</span>
                <span className="font-mono text-neutral-800">{fields.invoiceReference}</span>
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-[16px] border border-black/[0.06] bg-neutral-50 text-[11px] text-neutral-500 leading-relaxed">
            Upon signing, this transfer settles on Solana Devnet with finality verification. Plaintext values are encrypted with RSA-OAEP for the contractor.
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentInput({
  id,
  label,
  hint,
  value,
  placeholder,
  inputMode,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  inputMode?: "decimal";
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-neutral-900 uppercase tracking-wide">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="min-h-12 w-full rounded-[16px] border border-black/[0.08] bg-white px-4 text-xs font-medium text-black placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black transition-colors"
      />
      {hint ? <p id={`${id}-hint`} className="text-[11px] text-neutral-500">{hint}</p> : null}
    </div>
  );
}

function ReviewItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-neutral-400">{label}</dt>
      <dd className={`break-all font-semibold text-black ${mono ? "font-mono text-xs text-neutral-800" : "text-sm"}`}>{value}</dd>
    </div>
  );
}
