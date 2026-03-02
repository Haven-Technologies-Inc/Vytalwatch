"use client";

import { motion } from "framer-motion";
import { Shield, Award, Lock, CheckCircle2 } from "lucide-react";

const badges = [
  { icon: Shield, label: "HIPAA Compliant" },
  { icon: Award, label: "SOC 2 Type II" },
  { icon: Lock, label: "256-bit Encryption" },
  { icon: CheckCircle2, label: "FDA-Cleared Devices" },
];

export function SocialProofBar() {
  return (
    <section className="relative bg-slate-950 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 lg:gap-12"
        >
          <p className="text-xs text-slate-600 uppercase tracking-widest font-medium whitespace-nowrap">
            Enterprise-grade compliance
          </p>
          <div className="hidden sm:block w-px h-4 bg-slate-800" />
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8">
            {badges.map((badge, i) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex items-center gap-2 text-slate-500"
              >
                <badge.icon className="h-4 w-4 text-slate-600" />
                <span className="text-xs font-medium whitespace-nowrap">{badge.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
