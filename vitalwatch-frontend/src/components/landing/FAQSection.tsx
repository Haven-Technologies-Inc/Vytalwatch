"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  { q: "How does the AI prediction work?", a: "Our machine learning models analyze vital sign patterns, detecting subtle anomalies that precede clinical symptoms by 3-5 days." },
  { q: "Is VytalWatch HIPAA compliant?", a: "Yes. We maintain SOC 2 Type II certification and full HIPAA compliance with end-to-end encryption." },
  { q: "What devices are supported?", a: "We use FDA-approved Tenovi cellular devices that work out-of-the-box with no WiFi setup required." },
  { q: "How quickly can we get started?", a: "Most practices are fully operational within 48 hours. Our team handles all setup and training." },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faqs" className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-slate-900 dark:text-white text-center mb-4">Frequently Asked Questions</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center mb-12">Everything you need to know</p>
        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full p-5 flex justify-between items-center text-left text-slate-900 dark:text-white font-medium hover:bg-slate-100 dark:hover:bg-slate-700">
                {f.q}<ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <div className="px-5 pb-5 text-slate-600 dark:text-slate-400">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
