"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const faqs = [
  {
    q: "How does the AI prediction engine work?",
    a: "Our machine learning models analyze longitudinal vital sign patterns across multiple parameters — heart rate, blood pressure, SpO2, weight, and glucose — to detect subtle anomalies that often precede clinical deterioration by 3–5 days. The AI is trained on de-identified clinical data and continuously improves as more data flows through the platform.",
  },
  {
    q: "Is VytalWatch HIPAA compliant?",
    a: "Yes. VytalWatch maintains full HIPAA compliance with signed Business Associate Agreements (BAAs), SOC 2 Type II certification, AES-256 encryption for data at rest and in transit, role-based access controls, and immutable audit logging with 6-year retention. We undergo independent third-party security audits annually.",
  },
  {
    q: "What devices are supported?",
    a: "We use FDA-cleared Tenovi cellular-connected devices that work out of the box — no WiFi setup or patient tech support required. Supported devices include blood pressure monitors, pulse oximeters, weight scales, blood glucose meters, and thermometers. Devices ship directly to patients and begin transmitting data immediately.",
  },
  {
    q: "How quickly can we get started?",
    a: "Most practices are fully operational within 48 hours. Our onboarding team handles device provisioning, platform configuration, workflow setup, and staff training. We also provide patient enrollment materials and ongoing support to ensure a smooth launch.",
  },
  {
    q: "How does RPM billing work?",
    a: "VytalWatch automatically tracks qualifying patient monitoring time and generates documentation for CPT codes 99453 (device setup), 99454 (device supply/data transmission), 99457 (first 20 minutes of clinical staff time), and 99458 (each additional 20 minutes). This typically generates $120–$200+ per patient per month in reimbursable revenue.",
  },
  {
    q: "Can VytalWatch integrate with our existing EHR?",
    a: "Yes. We offer API access and custom integration options on our Professional and Enterprise plans. Our team works directly with your IT staff to configure integrations with major EHR systems. Enterprise customers also have access to webhooks, custom data exports, and SSO/SAML authentication.",
  },
  {
    q: "What kind of support is included?",
    a: "Starter plans include email support during business hours. Professional plans include SLA-backed priority support. Enterprise customers receive 24/7 dedicated support with a named account manager, quarterly business reviews, and a direct escalation line for critical issues.",
  },
  {
    q: "What outcomes can we realistically expect?",
    a: "Published research shows RPM programs reduce hospital readmissions by 22–38%, reduce all-cause mortality by up to 29% for chronic conditions, and achieve 93%+ patient satisfaction. Results depend on patient population, clinical workflows, and engagement — our team helps optimize all three during implementation.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faqs" className="relative py-20 sm:py-28 bg-slate-950 overflow-hidden">
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-medium mb-4 sm:mb-6">
            FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-5 tracking-tight">
            Common questions
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Everything you need to know before getting started.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="space-y-2 sm:space-y-3"
        >
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              className="rounded-xl border border-white/5 overflow-hidden bg-white/[0.02] hover:bg-white/[0.03] transition-colors duration-300"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full p-4 sm:p-5 flex justify-between items-center text-left gap-4"
              >
                <span className="text-white font-medium text-sm sm:text-base">
                  {faq.q}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="flex-shrink-0"
                >
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
