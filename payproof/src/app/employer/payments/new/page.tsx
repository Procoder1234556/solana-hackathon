import Link from "next/link";
import { DjectNav } from "@/components/dject-nav";
import { PaymentForm } from "@/features/payments/payment-form";

export default function NewPaymentPage() {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans selection:bg-black selection:text-white">
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
          <Link
            href="/contractor/receipts"
            className="text-xs text-neutral-600 hover:text-black transition-colors"
          >
            Switch to Contractor Vault →
          </Link>
        </div>

        {/* Header in DjectStudio Style */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f5f5f7] border border-black/[0.06] text-[11px] font-bold tracking-wider text-black uppercase">
            <span className="size-1.5 rounded-full bg-[#ff4d00]" />
            EMPLOYER · DEVNET
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-black">
            Pay and issue proof
          </h1>
          <p className="max-w-2xl text-base text-neutral-600">
            Create one payment-backed receipt. PayProof does not provide payroll, custody, or a credit decision.
          </p>
        </header>

        {/* Payment Form Feature Component */}
        <PaymentForm />
      </main>
    </div>
  );
}
