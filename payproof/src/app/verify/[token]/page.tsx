import Link from "next/link";
import { type DisclosureField } from "@/lib/disclosure";

const FIELD_LABELS: Record<DisclosureField, string> = {
  amount: "Amount",
  mintAddress: "Token mint",
  issuerPublicKey: "Payer wallet",
  recipientPublicKey: "Contractor wallet",
  period: "Payment period",
  paidAt: "Payment date/time",
  transactionSignature: "Transaction signature",
};

type Params = Promise<{ token: string }>;

type VerifyApiResponse = {
  status?: string;
  fields?: string[];
  values?: Record<string, string>;
  encryptedPayload?: string;
  payloadSignature?: string;
  expiresAt?: string;
  receipt?: {
    transactionSignature: string;
    mintAddress: string;
    issuerPublicKey: string;
    recipientPublicKey: string;
  };
  error?: { code?: string; message?: string };
};

async function fetchVerification(token: string): Promise<VerifyApiResponse> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/verify/${token}`, { cache: "no-store" });
    return await res.json() as VerifyApiResponse;
  } catch {
    return { error: { code: "SERVER_ERROR", message: "Unable to reach the verification endpoint." } };
  }
}

export default async function VerifyPage({ params }: { params: Params }) {
  const { token } = await params;
  const data = await fetchVerification(token);

  const isValid = data.status === "valid";
  const errorCode = data.error?.code ?? data.status;
  const txSig = data.values?.transactionSignature ?? data.receipt?.transactionSignature;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--primary)]">
          ← PayProof
        </Link>

        <header className="space-y-2">
          <p className="text-sm font-semibold tracking-[0.18em] text-[var(--primary)]">VERIFIER · PUBLIC</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Payment disclosure</h1>
          <p className="text-[var(--muted)]">
            This page shows only the fields the contractor authorized. It does not imply a credit decision.
          </p>
        </header>

        {isValid ? (
          <section className="space-y-6 rounded-xl border border-green-700/60 bg-green-900/20 p-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl text-green-400">✓</span>
              <div>
                <p className="text-lg font-semibold text-green-400">Valid income disclosure</p>
                {data.expiresAt && (
                  <p className="text-sm text-[var(--muted)]">Expires: {new Date(data.expiresAt).toLocaleString()}</p>
                )}
              </div>
            </div>

            <p className="text-sm text-[var(--muted)]">
              The following fields were selectively authorized by the contractor. The payload was encrypted and signed by
              the contractor&apos;s wallet and verified against on-chain transaction evidence.
              This disclosure is evidence of payment, not a credit or lending recommendation.
            </p>

            {data.fields && data.fields.length > 0 && (
              <div className="space-y-3">
                <p className="font-semibold text-sm">Disclosed payment fields:</p>
                <dl className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2">
                  {data.fields.map((f) => {
                    const val = data.values?.[f];
                    const label = FIELD_LABELS[f as DisclosureField] ?? f;
                    const isMono = f === "mintAddress" || f === "issuerPublicKey" || f === "recipientPublicKey" || f === "transactionSignature";
                    return (
                      <div key={f} className="space-y-1">
                        <dt className="text-xs text-[var(--muted)]">{label}</dt>
                        <dd className={`break-all font-medium text-sm ${isMono ? "font-mono text-xs" : ""}`}>
                          {val ?? "Authorized"}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            )}

            {txSig && (
              <div className="pt-2">
                <a
                  href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-sm font-medium text-[var(--primary)] underline"
                >
                  View underlying transaction on Solana Explorer ↗
                </a>
              </div>
            )}

            <aside className="rounded-lg border border-[var(--warning)] bg-[var(--warning-surface)] p-4 text-sm leading-6">
              Privacy boundary: this disclosure is not anonymous. Wallet account participation
              remains public on-chain. PayProof is not a lender and makes no credit recommendation.
            </aside>
          </section>
        ) : (
          <section className="space-y-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-surface)] p-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✗</span>
              <p className="text-lg font-semibold text-[var(--danger)]">
                {statusLabel(errorCode)}
              </p>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {statusDescription(errorCode)}
            </p>
            <div className="pt-2">
              <Link href="/" className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--primary)] underline">
                Return to PayProof home →
              </Link>
            </div>
          </section>
        )}

        <footer className="pt-6 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted)]">
          <Link href="/" className="underline hover:text-[var(--foreground)]">PayProof home</Link>
          <Link href="/contractor/receipts" className="underline hover:text-[var(--foreground)]">Contractor receipt vault</Link>
        </footer>
      </div>
    </main>
  );
}

function statusLabel(code: string | undefined): string {
  switch (code) {
    case "expired":
    case "DISCLOSURE_EXPIRED": return "Expired";
    case "revoked":
    case "DISCLOSURE_REVOKED": return "Revoked";
    case "consumed":
    case "DISCLOSURE_CONSUMED": return "Already used";
    case "TRANSACTION_UNVERIFIABLE": return "Unverifiable";
    case "NOT_FOUND": return "Not found";
    default: return "Invalid disclosure";
  }
}

function statusDescription(code: string | undefined): string {
  switch (code) {
    case "expired": return "This disclosure link has expired. Ask the contractor for a new one.";
    case "revoked": return "The contractor has revoked this disclosure link.";
    case "consumed": return "This one-time disclosure link has already been used.";
    case "TRANSACTION_UNVERIFIABLE": return "The underlying transaction could not be independently verified on-chain. Do not accept this disclosure.";
    case "NOT_FOUND": return "This disclosure does not exist or has been deleted.";
    default: return "This disclosure is invalid. Do not accept it.";
  }
}
