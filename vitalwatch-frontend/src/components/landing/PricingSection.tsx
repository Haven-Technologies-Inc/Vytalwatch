"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Check, ArrowRight, Sparkles, DollarSign, TrendingUp, Building2 } from "lucide-react";
import Link from "next/link";
import { staggerContainer, fadeInUp } from "@/lib/animations";

const plans = [
  {
    name: "Small Practice",
    description: "Perfect for independent practices and small clinics",
    highlight: "Generate New Revenue",
    icon: DollarSign,
    features: [
      "Up to 50 enrolled patients",
      "FDA-cleared device provisioning",
      "Core vital sign monitoring",
      "AI-powered clinical alerts",
      "Automated CPT code capture",
      "Medicare/Medicaid billing support",
      "Dedicated onboarding specialist",
      "Email & chat support",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Growing Practice",
    description: "For multi-provider practices scaling their RPM program",
    highlight: "Maximize Revenue",
    icon: TrendingUp,
    features: [
      "Up to 500 enrolled patients",
      "Advanced AI risk predictions",
      "Multi-provider dashboards",
      "Telehealth video integration",
      "Population health analytics",
      "Revenue optimization insights",
      "Custom clinical workflows",
      "Priority support (SLA-backed)",
      "Quarterly business reviews",
    ],
    cta: "Get Started Free",
    popular: true,
  },
  {
    name: "Health System",
    description: "For hospitals and large healthcare organizations",
    highlight: "Enterprise Scale",
    icon: Building2,
    features: [
      "Unlimited patient capacity",
      "Full AI suite with custom models",
      "White-label branding option",
      "API access & EHR integrations",
      "SSO / SAML authentication",
      "Dedicated account manager",
      "Custom SLA & BAA",
      "24/7 priority support",
      "On-premise deployment option",
    ],
    cta: "Talk to Sales",
    popular: false,
  },
];

const revenueHighlights = [
  { label: "Recurring monthly revenue per patient", value: "✓" },
  { label: "Setup cost for your practice", value: "$0" },
  { label: "Device cost to patients", value: "$0" },
];

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-20 sm:py-28 bg-slate-900 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(59,130,246,0.04)_0%,_transparent_60%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 sm:mb-16"
          suppressHydrationWarning
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-4 sm:mb-6" suppressHydrationWarning>
            <DollarSign className="h-3 w-3" />
            Revenue Opportunity
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-5 tracking-tight">
            Generate Revenue,
            <br className="hidden sm:block" /> Not Expenses
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            VytalWatch enables your practice to bill for RPM services (CPT 99453, 99454, 99457, 99458) 
            with zero upfront investment. We provide the platform, devices, and support — you focus on patient care.
          </p>
        </motion.div>

        {/* Revenue Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-12 sm:mb-16"
        >
          {revenueHighlights.map((item) => (
            <div key={item.label} className="text-center p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mb-1">{item.value}</div>
              <div className="text-xs sm:text-sm text-slate-500">{item.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 max-w-5xl mx-auto"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeInUp}
              className={`relative p-6 sm:p-8 rounded-2xl border transition-all duration-500 ${
                plan.popular
                  ? "bg-gradient-to-b from-emerald-600/10 to-emerald-600/5 border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                  : "bg-white/[0.02] border-white/5 hover:border-white/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold shadow-lg shadow-emerald-600/30">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                  plan.popular ? "bg-emerald-500/20" : "bg-white/5"
                }`}>
                  <plan.icon className={`h-5 w-5 ${plan.popular ? "text-emerald-400" : "text-slate-400"}`} />
                </div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  {plan.name}
                </h3>
                <p className="text-slate-500 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className={`text-xl sm:text-2xl font-bold ${plan.popular ? "text-emerald-400" : "text-blue-400"}`}>
                  {plan.highlight}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-slate-400"
                  >
                    <Check
                      className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                        plan.popular ? "text-emerald-400" : "text-slate-600"
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href={plan.name === "Health System" ? "#book-demo" : "/auth/register"}>
                <Button
                  className={`w-full transition-all duration-300 ${
                    plan.popular
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30"
                      : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  }`}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center mt-10 sm:mt-12"
        >
          <p className="text-slate-500 text-sm mb-2">
            No setup fees • No device costs • No long-term contracts
          </p>
          <p className="text-slate-600 text-xs">
            All plans include HIPAA compliance, SOC 2 certification, device provisioning, and dedicated onboarding support.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
