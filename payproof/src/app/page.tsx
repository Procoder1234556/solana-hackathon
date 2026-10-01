export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-50">
      <section className="max-w-2xl space-y-8 rounded-3xl border border-slate-700 bg-slate-900 p-10 shadow-2xl">
        <p className="text-sm font-semibold tracking-[0.22em] text-cyan-300">PAYPROOF · DEVNET POC</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Share income, not wallet history.
        </h1>
        <p className="max-w-xl text-lg leading-8 text-slate-300">
          PayProof is building payment-backed income evidence for crypto contractors. The Phase 1
          foundation is intentionally limited while confidential-transfer capability is verified.
        </p>
        <aside className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
          Privacy boundary: confidential balances can hide amounts and balances, but payments are
          not anonymous—wallet accounts and transaction participation may remain public.
        </aside>
        <a href="/employer/payments/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
          Create a payment proof
        </a>
      </section>
    </main>
  );
}
