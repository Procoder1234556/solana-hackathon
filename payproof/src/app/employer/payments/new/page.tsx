import Link from "next/link";

import { PaymentForm } from "@/features/payments/payment-form";

export default function NewPaymentPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between text-sm">
          <Link href="/" className="inline-flex min-h-11 items-center font-medium text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">← PayProof</Link>
          <Link href="/contractor/receipts" className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline">Switch to Contractor Vault →</Link>
        </div>
        <header className="space-y-3"><p className="text-sm font-semibold tracking-[0.18em] text-[var(--primary)]">EMPLOYER · DEVNET</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pay and issue proof</h1><p className="max-w-prose text-lg leading-8 text-[var(--muted)]">Create one payment-backed receipt. PayProof does not provide payroll, custody, or a credit decision.</p></header>
        <PaymentForm />
      </div>
    </main>
  );
}
