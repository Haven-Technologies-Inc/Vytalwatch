"use client";

import { motion } from "framer-motion";
import { Package, Wifi, Brain, TrendingUp } from "lucide-react";
import { staggerContainer, fadeInUp } from "@/lib/animations";

const steps = [
  {
    step: "01",
    icon: Package,
    title: "Deploy Devices",
    description:
      "Ship FDA-cleared cellular devices directly to patients. No WiFi setup needed — they work out of the box.",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    lineColor: "from-blue-500/30",
  },
  {
    step: "02",
    icon: Wifi,
    title: "Collect Data Automatically",
    description:
      "Vitals stream automatically to the VytalWatch platform via secure cellular connection. Patients simply take readings.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    lineColor: "from-emerald-500/30",
  },
  {
    step: "03",
    icon: Brain,
    title: "AI Analyzes & Alerts",
    description:
      "Our AI engine detects trends, flags anomalies, and sends intelligent alerts to your clinical team — prioritized by risk.",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    lineColor: "from-violet-500/30",
  },
  {
    step: "04",
    icon: TrendingUp,
    title: "Improve & Bill",
    description:
      "Intervene early, improve outcomes, and capture RPM revenue with automated CPT code documentation and time tracking.",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    lineColor: "from-cyan-500/30",
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative py-20 sm:py-28 bg-slate-950 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-medium mb-4 sm:mb-6">
            How It Works
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-5 tracking-tight">
            From setup to results in days,
            <br className="hidden sm:block" /> not months
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            Most practices are fully operational within 48 hours. Our team
            handles setup, device provisioning, and staff training.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-4"
        >
          {steps.map((item, index) => (
            <motion.div key={item.step} variants={fadeInUp} className="relative">
              {/* Connector line - desktop only */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[calc(50%+2rem)] right-0 h-px">
                  <div
                    className={`h-full bg-gradient-to-r ${item.lineColor} to-transparent`}
                  />
                </div>
              )}

              <div className="relative p-6 sm:p-7 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-500">
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className={`w-11 h-11 rounded-xl ${item.bgColor} flex items-center justify-center flex-shrink-0`}
                  >
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <span className="text-slate-700 text-xs font-mono font-bold tracking-wider">
                    STEP {item.step}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-base mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
