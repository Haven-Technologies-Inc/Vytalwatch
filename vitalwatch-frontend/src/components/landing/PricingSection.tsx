"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { staggerContainer, fadeInUp } from "@/lib/animations";

const plans = [
  {
    name: "Starter",
    description: "For small practices getting started with RPM",
    price: "99",
    period: "/patient/mo",
    features: [
      "Up to 50 patients",
      "Core vital sign monitoring",
      "Basic AI alerting",
      "Standard CPT billing tools",
      "Email support",
      "Tenovi device integration",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    description: "For growing practices and multi-provider teams",
    price: "149",
    period: "/patient/mo",
    features: [
      "Up to 200 patients",
      "Advanced AI predictions",
      "Priority support (SLA-backed)",
      "Telehealth video consultations",
      "Custom clinical reports",
      "Population health analytics",
      "Multi-provider dashboards",
      "Revenue optimization tools",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For health systems and large organizations",
    price: "Custom",
    period: "",
    features: [
      "Unlimited patients",
      "Full AI suite with custom models",
      "24/7 dedicated support",
      "White-label option",
      "API access & custom integrations",
      "SSO / SAML authentication",
      "Dedicated account manager",
      "Custom SLA & BAA",
      "On-premise deployment option",
    ],
    cta: "Contact Sales",
    popular: false,
  },
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
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-medium mb-4 sm:mb-6">
            Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-5 tracking-tight">
            Transparent pricing,
            <br className="hidden sm:block" /> no surprises
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            Every plan includes device provisioning, onboarding, and ongoing
            support. Start with a free trial — no credit card required.
          </p>
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
                  ? "bg-gradient-to-b from-blue-600/10 to-blue-600/5 border-blue-500/20 shadow-lg shadow-blue-500/5"
                  : "bg-white/[0.02] border-white/5 hover:border-white/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-semibold shadow-lg shadow-blue-600/30">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-white font-semibold text-lg mb-1">
                  {plan.name}
                </h3>
                <p className="text-slate-500 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-3xl sm:text-4xl font-bold text-white">
                  {plan.price === "Custom" ? "" : "$"}
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-slate-500 text-sm">{plan.period}</span>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-slate-400"
                  >
                    <Check
                      className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                        plan.popular ? "text-blue-400" : "text-slate-600"
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href={plan.name === "Enterprise" ? "#book-demo" : "/auth/register"}>
                <Button
                  className={`w-full transition-all duration-300 ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
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

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center mt-10 sm:mt-12 text-slate-600 text-sm"
        >
          All plans include HIPAA compliance, SOC 2 certification, and device
          shipping. Annual billing available with 15% discount.
        </motion.p>
      </div>
    </section>
  );
}
