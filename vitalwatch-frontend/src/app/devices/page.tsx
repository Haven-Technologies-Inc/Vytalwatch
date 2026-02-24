import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";
import {
  Activity,
  Heart,
  Droplets,
  Scale,
  Thermometer,
  Watch,
  Smartphone,
  Wifi,
  Battery,
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
} from "lucide-react";

const deviceCategories = [
  {
    icon: Heart,
    name: "Blood Pressure Monitors",
    description: "FDA-cleared automatic BP monitors with irregular heartbeat detection",
    features: ["Automatic inflation", "Irregular heartbeat detection", "Large cuff options", "Memory storage"],
    brands: ["Tenovi", "Omron", "Withings"],
  },
  {
    icon: Activity,
    name: "Pulse Oximeters",
    description: "Continuous and spot-check SpO2 and heart rate monitoring",
    features: ["Continuous monitoring", "Perfusion index", "Motion tolerant", "Low battery alerts"],
    brands: ["Tenovi", "Masimo", "Nonin"],
  },
  {
    icon: Scale,
    name: "Weight Scales",
    description: "Precision scales for weight and body composition tracking",
    features: ["0.1 lb precision", "Body composition", "High capacity", "Auto-recognition"],
    brands: ["Tenovi", "Withings", "Renpho"],
  },
  {
    icon: Droplets,
    name: "Glucose Meters",
    description: "Blood glucose monitoring with trend analysis",
    features: ["Fast results", "Small sample size", "Ketone testing", "Pattern alerts"],
    brands: ["Tenovi", "Dexcom", "Abbott"],
  },
  {
    icon: Thermometer,
    name: "Thermometers",
    description: "Non-contact and oral temperature monitoring",
    features: ["Non-contact option", "Fever alerts", "History tracking", "Fast reading"],
    brands: ["Tenovi", "Withings", "Kinsa"],
  },
  {
    icon: Watch,
    name: "Wearables",
    description: "Continuous vital monitoring through smartwatches and bands",
    features: ["24/7 monitoring", "Activity tracking", "Sleep analysis", "ECG capable"],
    brands: ["Apple Watch", "Fitbit", "Samsung"],
  },
];

const tenoviHighlights = [
  {
    icon: Wifi,
    title: "Cellular Connected",
    description: "Built-in cellular connectivity means no WiFi setup required. Devices work anywhere with cell coverage.",
  },
  {
    icon: Battery,
    title: "Long Battery Life",
    description: "Devices last months on a single charge, with automatic low-battery alerts to your care team.",
  },
  {
    icon: Zap,
    title: "Instant Sync",
    description: "Readings automatically transmit to VytalWatch within seconds of being taken.",
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description: "End-to-end encryption ensures patient data is protected from device to dashboard.",
  },
];

const setupSteps = [
  { step: "1", title: "Order Devices", description: "Select devices from our catalog or use existing compatible devices" },
  { step: "2", title: "Ship to Patient", description: "Devices ship directly to patients with setup instructions" },
  { step: "3", title: "Auto-Pairing", description: "Devices automatically pair with patient accounts via unique ID" },
  { step: "4", title: "Start Monitoring", description: "Readings flow to your dashboard immediately" },
];

export default function DevicesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                  Medical-Grade Devices,<br />Seamless Integration
                </h1>
                <p className="text-xl text-blue-200 mb-8">
                  VytalWatch AI works with FDA-cleared devices from leading manufacturers. Cellular-connected for zero-friction patient setup.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/admin/devices/order"
                    className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-center"
                  >
                    Order Devices
                  </Link>
                  <Link
                    href="/auth/login?redirect=/admin/devices/order"
                    className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors text-center"
                  >
                    Sign In to Order
                  </Link>
                </div>
              </div>
              <div className="hidden lg:grid grid-cols-3 gap-4">
                {[Heart, Activity, Scale, Droplets, Thermometer, Watch].map((Icon, i) => (
                  <div
                    key={i}
                    className="bg-white/10 backdrop-blur rounded-xl p-6 flex items-center justify-center"
                  >
                    <Icon className="h-10 w-10 text-white" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tenovi Partnership */}
        <section className="py-16 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <CheckCircle className="h-4 w-4" />
                Preferred Partner
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Powered by Tenovi
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                Our deep integration with Tenovi provides the most seamless device experience in RPM.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tenoviHighlights.map((item) => (
                <div
                  key={item.title}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 text-center"
                >
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Device Categories */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Supported Devices
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                FDA-cleared devices for comprehensive remote monitoring
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {deviceCategories.map((category) => (
                <div
                  key={category.name}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4">
                      <category.icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {category.name}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
                      {category.description}
                    </p>
                    <div className="space-y-2 mb-4">
                      {category.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Compatible brands</div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {category.brands.join(" • ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Setup Process */}
        <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Simple Setup Process
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Get patients monitoring in minutes, not days
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {setupSteps.map((item, index) => (
                <div key={item.step} className="relative">
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 text-center h-full">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                      {item.step}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {item.description}
                    </p>
                  </div>
                  {index < setupSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <ArrowRight className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Patient App */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                  <Smartphone className="h-4 w-4" />
                  Mobile App
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
                  VytalWatch Patient App
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
                  For patients who prefer using their smartphones, our mobile app provides an alternative way to log readings, view trends, and communicate with their care team.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Manual reading entry with guided workflows",
                    "Sync with Apple Health & Google Fit",
                    "View personal health trends and history",
                    "Secure messaging with care team",
                    "Medication and reading reminders",
                    "Educational content library",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                      <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-4">
                  <Link href="#" className="px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors">
                    App Store
                  </Link>
                  <Link href="#" className="px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors">
                    Google Play
                  </Link>
                </div>
              </div>
              <div className="bg-linear-to-br from-blue-100 to-emerald-100 dark:from-blue-900/20 dark:to-emerald-900/20 rounded-2xl p-8 flex items-center justify-center">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-4 w-64">
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl aspect-9/16 flex items-center justify-center">
                    <div className="text-center">
                      <Activity className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">120/80</div>
                      <div className="text-sm text-slate-500">Blood Pressure</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-br from-blue-600 to-blue-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Equip Your Patients?
            </h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              Get started with our device catalog or bring your own compatible devices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/admin/devices/order"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Order Devices Now
              </Link>
              <Link
                href="/auth/register"
                className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
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
