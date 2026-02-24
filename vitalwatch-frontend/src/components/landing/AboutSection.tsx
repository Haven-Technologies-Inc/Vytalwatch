"use client";

export function AboutSection() {
  return (
    <section id="about" className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">About VytalWatch</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-lg leading-relaxed">
              VytalWatch is a cutting-edge AI-powered remote patient monitoring platform designed to revolutionize healthcare delivery. We combine advanced machine learning with FDA-approved medical devices to predict health risks before they become emergencies.
            </p>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-lg leading-relaxed">
              Our mission is to reduce preventable hospital readmissions, improve patient outcomes, and empower healthcare providers with actionable real-time insights.
            </p>
            <div className="grid grid-cols-3 gap-6 mt-10">
              <div className="text-center"><div className="text-3xl font-bold text-blue-400">40%</div><div className="text-slate-500 dark:text-slate-400 text-sm">Readmission Reduction</div></div>
              <div className="text-center"><div className="text-3xl font-bold text-violet-400">24/7</div><div className="text-slate-500 dark:text-slate-400 text-sm">AI Monitoring</div></div>
              <div className="text-center"><div className="text-3xl font-bold text-cyan-400">5000+</div><div className="text-slate-500 dark:text-slate-400 text-sm">Patients Monitored</div></div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-linear-to-r from-blue-600/20 to-violet-600/20 rounded-3xl blur-2xl" />
            <div className="relative bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
              <div className="space-y-4">
                <div className="flex items-center gap-4"><div className="w-3 h-3 bg-emerald-500 rounded-full" /><span className="text-slate-700 dark:text-slate-300">HIPAA Compliant Infrastructure</span></div>
                <div className="flex items-center gap-4"><div className="w-3 h-3 bg-blue-500 rounded-full" /><span className="text-slate-700 dark:text-slate-300">SOC 2 Type II Certified</span></div>
                <div className="flex items-center gap-4"><div className="w-3 h-3 bg-violet-500 rounded-full" /><span className="text-slate-700 dark:text-slate-300">FDA-Approved Devices</span></div>
                <div className="flex items-center gap-4"><div className="w-3 h-3 bg-cyan-500 rounded-full" /><span className="text-slate-700 dark:text-slate-300">Bank-Grade Encryption</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
