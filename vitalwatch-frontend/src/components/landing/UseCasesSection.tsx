"use client";

import { motion } from "framer-motion";
import {
  Heart,
  Activity,
  Stethoscope,
  Building2,
  Droplets,
  Wind,
} from "lucide-react";
import { staggerContainer, fadeInUp } from "@/lib/animations";

const useCases = [
  {
    icon: Heart,
    title: "Heart Failure Management",
    description:
      "Continuous monitoring of weight, BP, and SpO2. AI detects fluid retention early — before symptoms escalate to an ED visit.",
    stat: "22% reduction in rehospitalization",
    statSource: "European Journal of Preventive Cardiology, 2024",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderHover: "hover:border-rose-500/20",
  },
  {
    icon: Activity,
    title: "Hypertension Control",
    description:
      "Daily BP readings with AI trend analysis and medication adherence tracking. Patients achieve control faster with fewer office visits.",
    stat: "74% achieved BP control in 12 months",
    statSource: "AHA Hypertension Scientific Sessions, 2024",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderHover: "hover:border-blue-500/20",
  },
  {
    icon: Droplets,
    title: "Diabetes Management",
    description:
      "Track glucose trends, weight, and blood pressure together. AI correlates multi-vital patterns to flag risks before HbA1c rises.",
    stat: "Significant HbA1c improvements documented",
    statSource: "JMIR meta-analysis, Ding et al., 2022",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderHover: "hover:border-amber-500/20",
  },
  {
    icon: Wind,
    title: "COPD & Respiratory",
    description:
      "SpO2 and symptom tracking for chronic respiratory patients. Early alerts on oxygen desaturation enable rapid clinical response.",
    stat: "Reduced acute care utilization",
    statSource: "JMIR systematic review, 2022",
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderHover: "hover:border-teal-500/20",
  },
  {
    icon: Stethoscope,
    title: "Post-Discharge Monitoring",
    description:
      "Intensive 30-day monitoring after hospital discharge. Reduce readmissions and flag deterioration early in the highest-risk window.",
    stat: "58% fewer hospitalizations at 3 months",
    statSource: "JMIR Formative Research, Po et al., 2024",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderHover: "hover:border-violet-500/20",
  },
  {
    icon: Building2,
    title: "Senior Living & SNFs",
    description:
      "Scale monitoring across entire facilities. Population health dashboards and automated wellness checks for every resident.",
    stat: "43% more staff time for direct care",
    statSource: "Cureus, 2024",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderHover: "hover:border-emerald-500/20",
  },
];

export function UseCasesSection() {
  return (
    <section id="solutions" className="relative py-20 sm:py-28 bg-slate-900 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(124,58,237,0.04)_0%,_transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-medium mb-4 sm:mb-6">
            Clinical Solutions
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-5 tracking-tight">
            Built for the conditions
            <br className="hidden sm:block" /> that matter most
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            VytalWatch adapts to the clinical workflows and patient populations
            your team manages every day.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        >
          {useCases.map((uc) => (
            <motion.div
              key={uc.title}
              variants={fadeInUp}
              className={`group relative p-6 sm:p-7 rounded-2xl bg-white/[0.02] border border-white/5 ${uc.borderHover} hover:bg-white/[0.04] transition-all duration-500`}
            >
              <div
                className={`w-10 h-10 rounded-xl ${uc.bgColor} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}
              >
                <uc.icon className={`h-5 w-5 ${uc.color}`} />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                {uc.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                {uc.description}
              </p>
              <div className="pt-3 border-t border-white/5">
                <p className={`text-xs font-semibold ${uc.color} mb-0.5`}>
                  {uc.stat}
                </p>
                <p className="text-slate-700 text-[10px]">{uc.statSource}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
