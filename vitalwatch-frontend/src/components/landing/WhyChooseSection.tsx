"use client";
import { Shield, Zap, Brain, Clock, DollarSign, HeartPulse } from "lucide-react";

const reasons = [
  { icon: Brain, title: "AI-Powered Predictions", desc: "Detect health anomalies 3-5 days before symptoms appear using advanced machine learning algorithms." },
  { icon: Zap, title: "Real-Time Monitoring", desc: "24/7 continuous vital sign monitoring with instant alerts for critical changes." },
  { icon: Shield, title: "Enterprise Security", desc: "HIPAA compliant, SOC 2 certified with end-to-end encryption for complete data protection." },
  { icon: Clock, title: "Quick Deployment", desc: "Get started in 48 hours. Our team handles setup, training, and ongoing support." },
  { icon: DollarSign, title: "Revenue Generation", desc: "Automated CPT code generation and billing optimization for sustainable RPM revenue." },
  { icon: HeartPulse, title: "Better Outcomes", desc: "Reduce readmissions by 40% and improve patient satisfaction with proactive care." },
];

export function WhyChooseSection() {
  return (
    <section id="why-choose" className="py-24 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Why Choose VytalWatch?</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">The most advanced AI-powered remote patient monitoring platform trusted by healthcare leaders.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reasons.map((r, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <r.icon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{r.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
