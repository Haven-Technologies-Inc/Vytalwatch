"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Zap,
  Activity,
  Bell,
  BarChart3,
  Smartphone,
  Video,
  FileText,
} from "lucide-react";
import { staggerContainer, fadeInUp } from "@/lib/animations";

const features = [
  {
    icon: Brain,
    title: "Predictive AI Engine",
    description:
      "Machine learning models analyze vital sign patterns to detect anomalies days before clinical symptoms manifest.",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "group-hover:border-blue-500/20",
  },
  {
    icon: Activity,
    title: "Real-Time Vital Monitoring",
    description:
      "Continuous tracking of blood pressure, heart rate, SpO2, glucose, weight, and temperature — streamed directly from patient devices.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "group-hover:border-emerald-500/20",
  },
  {
    icon: Bell,
    title: "Intelligent Alerting",
    description:
      "Configurable threshold-based and AI-driven alerts ensure your team focuses on patients who need attention most.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "group-hover:border-amber-500/20",
  },
  {
    icon: Video,
    title: "Telehealth Integration",
    description:
      "Built-in secure video consultations with screen sharing, enabling care teams to respond immediately to alerts.",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "group-hover:border-violet-500/20",
  },
  {
    icon: BarChart3,
    title: "Population Health Analytics",
    description:
      "Cohort-level dashboards and risk stratification help you manage entire patient populations efficiently.",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "group-hover:border-cyan-500/20",
  },
  {
    icon: Zap,
    title: "Automated CPT Billing",
    description:
      "Auto-generated time logs and CPT code tracking (99453, 99454, 99457, 99458) for seamless RPM revenue capture.",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "group-hover:border-rose-500/20",
  },
  {
    icon: Smartphone,
    title: "Cellular-Connected Devices",
    description:
      "FDA-cleared Tenovi devices connect over cellular — no WiFi setup, no patient tech support needed.",
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "group-hover:border-teal-500/20",
  },
  {
    icon: FileText,
    title: "Clinical Notes & Care Plans",
    description:
      "Document encounters, create care plans, and track medication adherence — all within a single platform.",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "group-hover:border-orange-500/20",
  },
];

export function PlatformSection() {
  return (
    <section id="platform" className="relative py-20 sm:py-28 bg-slate-900 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.04)_0%,_transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-medium mb-4 sm:mb-6">
            Platform Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-5 tracking-tight">
            Everything you need to run{" "}
            <br className="hidden sm:block" />
            a world-class RPM program
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            From device onboarding to AI-powered insights and revenue capture —
            VytalWatch is the complete platform for modern remote care.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              className={`group relative p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5 ${feature.borderColor} hover:bg-white/[0.04] transition-all duration-500`}
            >
              <div
                className={`w-10 h-10 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}
              >
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <h3 className="text-white font-semibold text-sm mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
