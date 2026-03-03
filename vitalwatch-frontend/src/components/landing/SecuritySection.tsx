"use client";

import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  Eye,
  Server,
  Key,
  FileCheck,
  Clock,
  UserCheck,
} from "lucide-react";
import { staggerContainer, fadeInUp } from "@/lib/animations";

const securityFeatures = [
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description: "Full HIPAA compliance with Business Associate Agreements, access controls, and audit logging for all PHI interactions.",
  },
  {
    icon: Lock,
    title: "AES-256 Encryption",
    description: "All data encrypted at rest and in transit using bank-grade AES-256 encryption with TLS 1.3 for every connection.",
  },
  {
    icon: Eye,
    title: "SOC 2 Type II",
    description: "Independently audited security controls covering availability, processing integrity, confidentiality, and privacy.",
  },
  {
    icon: FileCheck,
    title: "Audit Logging",
    description: "Every access to patient data is logged immutably with 6-year retention, meeting HIPAA audit trail requirements.",
  },
  {
    icon: UserCheck,
    title: "Role-Based Access",
    description: "Granular RBAC with multi-factor authentication, session management, and automatic lockout after failed attempts.",
  },
  {
    icon: Key,
    title: "OAuth & SSO",
    description: "Enterprise single sign-on support with Google, Microsoft, and Apple OAuth providers for seamless staff onboarding.",
  },
  {
    icon: Server,
    title: "Infrastructure Security",
    description: "Deployed on enterprise-grade infrastructure with automated backups, disaster recovery, and 99.9% uptime SLA.",
  },
  {
    icon: Clock,
    title: "Break-Glass Access",
    description: "Emergency access protocols with full audit trails, ensuring patient care is never blocked by access controls.",
  },
];

export function SecuritySection() {
  return (
    <section id="security" className="relative py-20 sm:py-28 bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.04)_0%,_transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-4 sm:mb-6">
              Enterprise Security
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-5 tracking-tight">
              Security that healthcare
              <br className="hidden sm:block" /> demands
            </h2>
            <p className="text-slate-400 text-base sm:text-lg mb-8 leading-relaxed">
              Patient data is sacred. VytalWatch is built from the ground up with
              defense-in-depth security — not bolted on as an afterthought. Every
              layer of the platform is designed to meet and exceed healthcare
              compliance requirements.
            </p>

            <div className="flex flex-wrap gap-3">
              {["HIPAA", "SOC 2 Type II", "HITRUST", "FDA 21 CFR Part 11"].map(
                (badge) => (
                  <div
                    key={badge}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs font-medium"
                  >
                    {badge}
                  </div>
                )
              )}
            </div>
          </motion.div>

          {/* Right - Feature grid */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
          >
            {securityFeatures.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/10 hover:bg-white/[0.04] transition-all duration-500"
              >
                <feature.icon className="h-4 w-4 text-emerald-400 mb-3" />
                <h3 className="text-white font-medium text-sm mb-1">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
