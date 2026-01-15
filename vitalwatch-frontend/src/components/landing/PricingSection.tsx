"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Check, Star, Zap } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    description: "Perfect for small practices getting started with RPM",
    price: 299,
    period: "month",
    features: [
      "Up to 50 patients",
      "3 device types (BP, SpO2, Weight)",
      "Basic AI insights",
      "Email support",
      "Standard reports",
      "Basic analytics",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    description: "Most popular for growing practices and clinics",
    price: 799,
    period: "month",
    features: [
      "Up to 200 patients",
      "All 5 device types",
      "Advanced AI + Predictive analytics",
      "Priority support",
      "Custom alerts & thresholds",
      "API access",
      "EHR integration ready",
      "Advanced billing reports",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations with custom needs",
    price: null,
    period: "custom",
    features: [
      "Unlimited patients",
      "All device types + custom",
      "Custom AI model training",
      "Dedicated success manager",
      "White-label option",
      "Custom integrations",
      "SLA guarantee",
      "HIPAA BAA included",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-slate-50 dark:bg-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Choose the plan that fits your practice. All plans include a 30-day free trial
            with no credit card required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`p-6 relative ${
                plan.popular
                  ? "border-2 border-blue-500 dark:border-blue-400"
                  : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                    <Star className="h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {plan.description}
                </p>
                <div className="mb-4">
                  {plan.price ? (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-slate-900 dark:text-white">
                        ${plan.price}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        /{plan.period}
                      </span>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">
                      Custom Pricing
                    </div>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href={plan.price ? "/auth/register" : "/contact"}>
                <Button
                  variant={plan.popular ? "primary" : "outline"}
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </Link>
            </Card>
          ))}
        </div>

        {/* Money Back Guarantee */}
        <div className="mt-12 text-center">
          <Card className="inline-flex items-center gap-4 px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center">
              <Zap className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-900 dark:text-white">
                30-Day Money-Back Guarantee
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                If you don&apos;t see results, we&apos;ll refund every penny. No questions asked.
              </div>
            </div>
          </Card>
        </div>

        {/* ROI Calculator Preview */}
        <div className="mt-16 bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Calculate Your RPM Revenue
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                See how much additional revenue you could generate with remote patient monitoring.
                Average reimbursement is $125-$175 per patient per month.
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">
                    Patients enrolled:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    100 patients
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">
                    Average reimbursement:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    $125/patient/month
                  </span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="inline-block p-8 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-2xl">
                <div className="text-sm text-blue-100 mb-2">
                  Your Potential Monthly Revenue
                </div>
                <div className="text-5xl font-bold text-white mb-2">$12,500</div>
                <div className="text-sm text-blue-100">
                  That&apos;s $150,000 annually
                </div>
              </div>
              <Link href="/auth/register" className="block mt-6">
                <Button size="lg" className="w-full max-w-xs">
                  Start Generating Revenue
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
