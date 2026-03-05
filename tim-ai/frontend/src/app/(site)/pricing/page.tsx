import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
};

export default async function PricingPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-500">TIM-AI Pricing</p>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">Deployment tiers coming soon.</h1>
      <p className="mt-4 text-slate-600">
        The SaaS template pricing grid has been removed. Once the TIM-AI pilot programs finalize the Hetzner hosting
        requirements, this page will outline the interpreter, enterprise, and government plans.
      </p>
      <p className="mt-2 text-slate-500">Need access already? Reach us at founders@tim-ai.eu.</p>
    </main>
  );
}
