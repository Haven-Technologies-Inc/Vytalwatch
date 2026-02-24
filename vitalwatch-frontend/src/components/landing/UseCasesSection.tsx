"use client";
import { Heart, Activity, Stethoscope, Building2 } from "lucide-react";

const useCases = [
  { icon: Heart, title: "Cardiology", desc: "Monitor heart failure patients with continuous BP, weight, and SpO2 tracking. Early detection of fluid retention and arrhythmias.", color: "from-red-500 to-pink-500" },
  { icon: Activity, title: "Chronic Care Management", desc: "Manage diabetes, COPD, and hypertension patients remotely. Track glucose, lung function, and blood pressure trends.", color: "from-blue-500 to-cyan-500" },
  { icon: Stethoscope, title: "Post-Discharge Care", desc: "Reduce 30-day readmissions with intensive monitoring after hospital discharge. AI alerts for deterioration signs.", color: "from-violet-500 to-purple-500" },
  { icon: Building2, title: "Senior Living Facilities", desc: "Scale monitoring across multiple residents. Population health dashboards and automated wellness checks.", color: "from-emerald-500 to-teal-500" },
];

export function UseCasesSection() {
  return (
    <section id="use-cases" className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Use Cases</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">VytalWatch adapts to diverse healthcare settings and patient populations.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {useCases.map((uc, i) => (
            <div key={i} className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:shadow-lg transition-all">
              <div className={`w-14 h-14 rounded-2xl bg-linear-to-r ${uc.color} flex items-center justify-center mb-6`}>
                <uc.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">{uc.title}</h3>
              <p className="text-slate-600 dark:text-slate-400">{uc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
