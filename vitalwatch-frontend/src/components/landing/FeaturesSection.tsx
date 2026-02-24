"use client";
import { Brain, Bell, Shield, Zap, LineChart, Smartphone } from "lucide-react";

export function FeaturesSection() {
  const features = [
    { icon: Brain, title: "Predictive AI", desc: "Detect anomalies days before symptoms" },
    { icon: Bell, title: "Smart Alerts", desc: "Priority-based notifications" },
    { icon: Shield, title: "HIPAA Secure", desc: "Bank-grade encryption" },
    { icon: Zap, title: "Real-time", desc: "24/7 continuous monitoring" },
    { icon: LineChart, title: "Analytics", desc: "Actionable insights dashboard" },
    { icon: Smartphone, title: "FDA Devices", desc: "Cellular-connected hardware" },
  ];
  return (
    <section className="py-24 bg-slate-950">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-white text-center mb-4">Powered by AI</h2>
        <p className="text-slate-400 text-center mb-16">Advanced technology transforming patient care</p>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20">
                <f.icon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
