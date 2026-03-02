"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import {
  TrendingDown,
  DollarSign,
  Users,
  HeartPulse,
  BarChart3,
  Stethoscope,
} from "lucide-react";
import { staggerContainer, fadeInUp } from "@/lib/animations";

function AnimatedCounter({
  end,
  suffix = "",
  prefix = "",
  duration = 2,
}: {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, end, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

const stats = [
  {
    icon: HeartPulse,
    value: 29,
    suffix: "%",
    label: "Reduction in All-Cause Mortality",
    source:
      "Ding et al., Journal of Medical Internet Research, 2022 — meta-analysis of 96 studies on interactive RPM devices",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: TrendingDown,
    value: 22,
    suffix: "%",
    label: "Reduction in Heart Failure Rehospitalization",
    source:
      "European Journal of Preventive Cardiology, 2024 — meta-analysis of 41 studies, 16,512 patients",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Users,
    value: 93,
    suffix: "%",
    label: "Patient Satisfaction Rate",
    source:
      "Haddad et al., Journal of Medical Internet Research, 2023 — Mayo Clinic RPM program, 3,172 respondents",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  {
    icon: DollarSign,
    value: 536,
    prefix: "$",
    suffix: "M",
    label: "Medicare RPM Payments in 2024",
    source:
      "HHS Office of Inspector General Report, 2025 — up from $6.8M in 2019, a 7,782% increase in 5 years",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
  },
  {
    icon: Stethoscope,
    value: 43,
    suffix: "%",
    label: "More Nursing Time for Patient Care",
    source:
      "Cureus, 2024 — RPM reduced vital check times by 56% and coordination time by 46%, freeing staff for direct care",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: BarChart3,
    value: 10,
    suffix: "x",
    label: "Growth in Medicare RPM Enrollment",
    source:
      "PMC, 2025 — Medicare beneficiaries using RPM grew from 44,500 (2019) to 451,000 (2023)",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
  },
];

export function EvidenceSection() {
  return (
    <section id="evidence" className="relative py-20 sm:py-28 bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.04)_0%,_transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-medium mb-4 sm:mb-6">
            Evidence-Based Results
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-5 tracking-tight">
            The research is clear
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            Every number below comes from peer-reviewed studies published in
            leading medical journals. RPM is no longer experimental — it is the
            standard of care.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
              className="group relative p-6 sm:p-7 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-500"
            >
              <div
                className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-5`}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className={`text-3xl sm:text-4xl font-bold ${stat.color} mb-2 tracking-tight`}>
                <AnimatedCounter
                  end={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix || ""}
                />
              </div>
              <p className="text-white font-medium text-sm mb-3">
                {stat.label}
              </p>
              <p className="text-slate-600 text-xs leading-relaxed">
                {stat.source}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center mt-10 sm:mt-12 text-slate-600 text-xs max-w-3xl mx-auto"
        >
          Sources: Journal of Medical Internet Research (JMIR), European Journal
          of Preventive Cardiology, HHS Office of Inspector General, Cureus, and
          PMC/PubMed. Individual patient outcomes may vary by population,
          condition, and implementation.
        </motion.p>
      </div>
    </section>
  );
}
