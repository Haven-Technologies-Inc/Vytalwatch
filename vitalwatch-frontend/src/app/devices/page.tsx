import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";
import { Activity, Heart, Droplets, Scale, Thermometer, Watch, Smartphone, Wifi, Battery, CheckCircle, ArrowRight, Shield, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Devices",
  description: "FDA-cleared medical devices with cellular connectivity for seamless remote patient monitoring.",
};

const cats = [
  { icon: Heart, name: "Blood Pressure Monitors", desc: "FDA-cleared automatic BP monitors with irregular heartbeat detection", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", features: ["Automatic inflation", "Irregular heartbeat detection", "Large cuff options", "Memory storage"], brands: ["Tenovi", "Omron", "Withings"] },
  { icon: Activity, name: "Pulse Oximeters", desc: "Continuous and spot-check SpO2 and heart rate monitoring", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", features: ["Continuous monitoring", "Perfusion index", "Motion tolerant", "Low battery alerts"], brands: ["Tenovi", "Masimo", "Nonin"] },
  { icon: Scale, name: "Weight Scales", desc: "Precision scales for weight and body composition tracking", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", features: ["0.1 lb precision", "Body composition", "High capacity", "Auto-recognition"], brands: ["Tenovi", "Withings", "Renpho"] },
  { icon: Droplets, name: "Glucose Meters", desc: "Blood glucose monitoring with trend analysis", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", features: ["Fast results", "Small sample size", "Ketone testing", "Pattern alerts"], brands: ["Tenovi", "Dexcom", "Abbott"] },
  { icon: Thermometer, name: "Thermometers", desc: "Non-contact and oral temperature monitoring", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", features: ["Non-contact option", "Fever alerts", "History tracking", "Fast reading"], brands: ["Tenovi", "Withings", "Kinsa"] },
  { icon: Watch, name: "Wearables", desc: "Continuous vital monitoring through smartwatches and bands", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", features: ["24/7 monitoring", "Activity tracking", "Sleep analysis", "ECG capable"], brands: ["Apple Watch", "Fitbit", "Samsung"] },
];

const highlights = [
  { icon: Wifi, title: "Cellular Connected", desc: "Built-in cellular connectivity. No WiFi setup required." },
  { icon: Battery, title: "Long Battery Life", desc: "Months on a single charge with low-battery alerts." },
  { icon: Zap, title: "Instant Sync", desc: "Readings transmit to VytalWatch within seconds." },
  { icon: Shield, title: "HIPAA Compliant", desc: "End-to-end encryption from device to dashboard." },
];

const steps = [
  { n: "01", title: "Order Devices", desc: "Select from our catalog or use existing compatible devices" },
  { n: "02", title: "Ship to Patient", desc: "Devices ship directly with setup instructions" },
  { n: "03", title: "Auto-Pairing", desc: "Devices automatically pair via unique ID" },
  { n: "04", title: "Start Monitoring", desc: "Readings flow to your dashboard immediately" },
];
export default function DevicesPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 py-20 lg:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.08)_0%,_transparent_50%)]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-medium mb-6">
                  <Shield className="h-3.5 w-3.5" />
                  FDA-Cleared Devices
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
                  Medical-Grade Devices,{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Seamless Integration</span>
                </h1>
                <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                  VytalWatch AI works with FDA-cleared devices from leading manufacturers. Cellular-connected for zero-friction patient setup.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/admin/devices/order" className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all duration-300">
                    Order Devices <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/auth/login?redirect=/admin/devices/order" className="px-8 py-3.5 border border-slate-600 text-white rounded-lg font-semibold hover:bg-white/5 transition-all duration-300">
                    Sign In to Order
                  </Link>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-400 mt-8">
                  <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-500" />HIPAA Compliant</span>
                  <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-red-500" />FDA Approved</span>
                </div>
              </div>
              <div className="hidden lg:grid grid-cols-3 gap-3">
                {[Heart, Activity, Scale, Droplets, Thermometer, Watch].map((Icon, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/5 hover:border-blue-500/20 hover:bg-white/[0.06] backdrop-blur rounded-2xl p-6 flex items-center justify-center transition-all duration-500">
                    <Icon className="h-10 w-10 text-blue-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        {/* Tenovi Partnership */}
        <section className="relative py-20 sm:py-24 bg-slate-900 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(16,185,129,0.04)_0%,_transparent_50%)]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-4">
                <CheckCircle className="h-3.5 w-3.5" />
                Preferred Partner
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">Powered by Tenovi</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">Our deep integration with Tenovi provides the most seamless device experience in RPM.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {highlights.map((item) => (
                <div key={item.title} className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/10 hover:bg-white/[0.04] transition-all duration-500 text-center">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-2">{item.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* Device Categories */}
        <section className="relative py-20 sm:py-28 bg-slate-950 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.04)_0%,_transparent_50%)]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-medium mb-4">
                Supported Devices
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">FDA-Cleared Device Catalog</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">Comprehensive remote monitoring with medical-grade devices from leading manufacturers.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {cats.map((c) => (
                <div key={c.name} className={`group relative p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:${c.border} hover:bg-white/[0.04] transition-all duration-500`}>
                  <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
                    <c.icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                  <h3 className="text-white font-semibold text-base mb-2">{c.name}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-4">{c.desc}</p>
                  <div className="space-y-2 mb-4">
                    {c.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Compatible brands</div>
                    <div className="text-xs font-medium text-slate-400">{c.brands.join(" \u2022 ")}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="relative py-20 sm:py-28 bg-slate-900 overflow-hidden">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-medium mb-4">How It Works</div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">Simple Setup Process</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Get patients monitoring in minutes, not days.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {steps.map((item, index) => (
                <div key={item.n} className="relative">
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-500 text-center h-full">
                    <div className="w-11 h-11 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-blue-400 text-sm font-mono font-bold">{item.n}</span>
                    </div>
                    <h3 className="text-white font-semibold text-base mb-2">{item.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                  {index < steps.length - 1 && (<div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 z-10"><ArrowRight className="h-5 w-5 text-slate-700" /></div>)}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="relative py-20 sm:py-28 bg-slate-950 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(59,130,246,0.04)_0%,_transparent_50%)]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400 text-xs font-medium mb-6">
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile App
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 tracking-tight">VytalWatch Patient App</h2>
                <p className="text-slate-400 text-base sm:text-lg mb-6 leading-relaxed">Our mobile app lets patients log readings, view trends, and message their care team.</p>
                <ul className="space-y-3 mb-8">
                  {["Manual reading entry with guided workflows", "Sync with Apple Health & Google Fit", "View personal health trends and history", "Secure messaging with care team", "Medication and reading reminders", "Educational content library"].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-slate-400 text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-4">
                  <Link href="#" className="px-6 py-3 bg-white/[0.05] border border-white/10 text-white rounded-lg font-medium hover:bg-white/[0.08] transition-all duration-300">App Store</Link>
                  <Link href="#" className="px-6 py-3 bg-white/[0.05] border border-white/10 text-white rounded-lg font-medium hover:bg-white/[0.08] transition-all duration-300">Google Play</Link>
                </div>
              </div>
              <div className="hidden lg:flex items-center justify-center">
                <div className="relative">
                  <div className="absolute -inset-8 bg-gradient-to-br from-blue-500/10 to-violet-500/10 rounded-3xl blur-2xl" />
                  <div className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-4 w-64">
                    <div className="bg-slate-900/80 rounded-2xl aspect-[9/16] flex items-center justify-center">
                      <div className="text-center">
                        <Activity className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                        <div className="text-2xl font-bold text-white">120/80</div>
                        <div className="text-sm text-slate-500">Blood Pressure</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="relative py-20 bg-slate-900 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.08)_0%,_transparent_60%)]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">Ready to Equip Your Patients?</h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto text-base sm:text-lg">Get started with our device catalog or bring your own compatible devices.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/admin/devices/order" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all duration-300">
                Order Devices Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/auth/register" className="px-8 py-3.5 border border-slate-600 text-white rounded-lg font-semibold hover:bg-white/5 transition-all duration-300">
                Start Free Trial
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}