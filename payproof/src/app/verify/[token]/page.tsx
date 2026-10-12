import Link from "next/link";
import { DjectNav } from "@/components/dject-nav";
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
    return (await res.json()) as VerifyApiResponse;
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
    <div className="min-h-screen bg-white text-black flex flex-col font-sans selection:bg-black selection:text-white">
      <DjectNav />

      <main className="flex-1 w-full max-w-[840px] mx-auto px-4 sm:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between text-sm border-b border-black/[0.06] pb-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-black hover:text-[#ff4d00] transition-colors"
          >
            ← PayProof
          </Link>
        </div>

        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f5f5f7] border border-black/[0.06] text-[11px] font-bold tracking-wider text-black uppercase">
            <span className="size-1.5 rounded-full bg-[#ff4d00]" />
            VERIFIER · PUBLIC
          </div>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-black">
            Payment disclosure
          </h1>
          <p className="text-sm sm:text-base text-neutral-600">
            This page shows only the fields the contractor authorized. It does not imply a credit decision.
          </p>
        </header>

        {isValid ? (
          <section className="space-y-6 rounded-[28px] border border-emerald-300 bg-[#f5f5f7] p-8 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                ✓
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-800">Valid income disclosure</p>
                {data.expiresAt && (
                  <p className="text-xs text-neutral-500 font-mono">Expires: {new Date(data.expiresAt).toLocaleString()}</p>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              The following fields were selectively authorized by the contractor. The payload was encrypted and signed by
              the contractor&apos;s wallet and verified against on-chain transaction evidence.
              This disclosure is evidence of payment, not a credit or lending recommendation.
            </p>

            {data.fields && data.fields.length > 0 && (
              <div className="space-y-3">
                <p className="font-bold text-sm text-black uppercase tracking-wider">Disclosed payment fields:</p>
                <dl className="grid gap-4 rounded-[20px] border border-black/[0.06] bg-white p-6 sm:grid-cols-2">
                  {data.fields.map((f) => {
                    const val = data.values?.[f];
                    const label = FIELD_LABELS[f as DisclosureField] ?? f;
                    const isMono =
                      f === "mintAddress" ||
                      f === "issuerPublicKey" ||
                      f === "recipientPublicKey" ||
                      f === "transactionSignature";
                    return (
                      <div key={f} className="space-y-1">
                        <dt className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{label}</dt>
                        <dd className={`break-all font-bold text-black ${isMono ? "font-mono text-xs text-neutral-800" : "text-base"}`}>
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
                  className="inline-flex items-center text-xs font-semibold text-[#ff4d00] hover:underline"
                >
                  View underlying transaction on Solana Explorer ↗
                </a>
              </div>
            )}

            <aside className="rounded-[18px] border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
              Privacy boundary: this disclosure is not anonymous. Wallet account participation
              remains public on-chain. PayProof is not a lender and makes no credit recommendation.
            </aside>
          </section>
        ) : (
          <section className="space-y-5 rounded-[28px] border border-black/[0.08] bg-[#f5f5f7] p-8 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg">
                ✗
              </div>
              <p className="text-2xl font-bold text-black">
                {statusLabel(errorCode)}
              </p>
            </div>
            <p className="text-sm text-neutral-600">
              {statusDescription(errorCode)}
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#ff4d00] transition-colors"
              >
                Return to PayProof home →
              </Link>
            </div>
          </section>
        )}

        <footer className="pt-6 border-t border-black/[0.06] flex items-center justify-between text-xs text-neutral-500">
          <Link href="/" className="hover:text-black transition-colors">PayProof home</Link>
          <Link href="/contractor/receipts" className="hover:text-black transition-colors">Contractor receipt vault</Link>
        </footer>
      </main>
    </div>
  );
}

function statusLabel(code: string | undefined): string {
  switch (code) {
    case "expired":
    case "DISCLOSURE_EXPIRED":
      return "Expired";
    case "revoked":
    case "DISCLOSURE_REVOKED":
      return "Revoked";
    case "consumed":
    case "DISCLOSURE_CONSUMED":
      return "Already used";
    case "TRANSACTION_UNVERIFIABLE":
      return "Unverifiable";
    case "NOT_FOUND":
      return "Not found";
    default:
      return "Invalid disclosure";
  }
}

function statusDescription(code: string | undefined): string {
  switch (code) {
    case "expired":
      return "This disclosure link has expired. Ask the contractor for a new one.";
    case "revoked":
      return "The contractor has revoked this disclosure link.";
    case "consumed":
      return "This one-time disclosure link has already been used.";
    case "TRANSACTION_UNVERIFIABLE":
      return "The underlying transaction could not be independently verified on-chain. Do not accept this disclosure.";
    case "NOT_FOUND":
      return "This disclosure does not exist or has been deleted.";
    default:
      return "This disclosure is invalid. Do not accept it.";
  }
}
