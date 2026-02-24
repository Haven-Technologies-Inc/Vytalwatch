"use client";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  { name: "Starter", price: "99", period: "/patient/mo", features: ["Up to 50 patients", "Basic AI alerts", "Email support", "Standard devices"], popular: false },
  { name: "Professional", price: "149", period: "/patient/mo", features: ["Up to 200 patients", "Advanced AI predictions", "Priority support", "Premium devices", "Custom reports"], popular: true },
  { name: "Enterprise", price: "Custom", period: "", features: ["Unlimited patients", "Full AI suite", "24/7 dedicated support", "White-label option", "API access", "Custom integrations"], popular: false },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-slate-900 dark:text-white text-center mb-4">Simple, Transparent Pricing</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center mb-16">Choose the plan that fits your practice</p>
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((p, i) => (
            <div key={i} className={`p-8 rounded-2xl border ${p.popular ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
              {p.popular && <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Most Popular</span>}
              <h3 className={`text-2xl font-bold mt-2 ${p.popular ? "text-white" : "text-slate-900 dark:text-white"}`}>{p.name}</h3>
              <div className="mt-4 mb-6"><span className={`text-4xl font-bold ${p.popular ? "text-white" : "text-slate-900 dark:text-white"}`}>${p.price}</span><span className={p.popular ? "text-blue-100" : "text-slate-500"}>{p.period}</span></div>
              <ul className="space-y-3 mb-8">{p.features.map((f, j) => <li key={j} className={`flex items-center gap-2 ${p.popular ? "text-blue-100" : "text-slate-600 dark:text-slate-400"}`}><Check className="h-5 w-5 text-blue-400" />{f}</li>)}</ul>
              <Link href="/auth/register"><Button className={`w-full ${p.popular ? "bg-blue-600 hover:bg-blue-500" : ""}`} variant={p.popular ? "primary" : "outline"}>Get Started</Button></Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
