import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";
import {
  Activity,
  Brain,
  Bell,
  BarChart3,
  Shield,
  Smartphone,
  Users,
  Clock,
  Zap,
  LineChart,
  MessageSquare,
  FileText,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore VytalWatch AI's powerful RPM features: real-time vital tracking, AI predictive risk scoring, smart alerts, care team collaboration, automated billing, and population health analytics.",
  openGraph: {
    title: "Features - AI-Powered Remote Patient Monitoring | VytalWatch AI",
    description:
      "Real-time vitals, predictive AI analytics, smart alerts, and seamless care coordination. Everything you need to run a modern RPM program.",
    url: "https://vytalwatch.com/features",
    type: "website",
  },
};

const features = [
  {
    category: "Patient Monitoring",
    items: [
      {
        icon: Activity,
        title: "Real-Time Vital Tracking",
        description: "Monitor blood pressure, heart rate, SpO2, glucose, weight, and temperature in real-time with automatic device syncing.",
      },
      {
        icon: LineChart,
        title: "Trend Analysis",
        description: "Visualize patient health trends over time with interactive charts and customizable date ranges.",
      },
      {
        icon: Bell,
        title: "Smart Alerts",
        description: "Configurable thresholds trigger instant notifications when vitals fall outside safe ranges.",
      },
      {
        icon: Clock,
        title: "Automated Reminders",
        description: "Patients receive automatic reminders to take readings, improving compliance and data consistency.",
      },
    ],
  },
  {
    category: "AI & Analytics",
    items: [
      {
        icon: Brain,
        title: "Predictive Risk Scoring",
        description: "AI algorithms analyze patterns to predict deterioration risk before symptoms appear.",
      },
      {
        icon: Zap,
        title: "Anomaly Detection",
        description: "Machine learning identifies unusual readings and subtle changes that humans might miss.",
      },
      {
        icon: BarChart3,
        title: "Population Health Analytics",
        description: "Aggregate insights across your patient population to identify trends and optimize care protocols.",
      },
      {
        icon: FileText,
        title: "AI-Generated Summaries",
        description: "Automated clinical summaries save hours of documentation time while ensuring completeness.",
      },
    ],
  },
  {
    category: "Care Coordination",
    items: [
      {
        icon: Users,
        title: "Care Team Collaboration",
        description: "Multiple providers can access shared patient dashboards with role-based permissions.",
      },
      {
        icon: MessageSquare,
        title: "Secure Messaging",
        description: "HIPAA-compliant messaging between patients and care teams with read receipts and priorities.",
      },
      {
        icon: Smartphone,
        title: "Patient Mobile App",
        description: "Patients can view their data, message providers, and receive education through our mobile app.",
      },
      {
        icon: Shield,
        title: "Audit Trail",
        description: "Complete audit logging for compliance, tracking every action and access to patient data.",
      },
    ],
  },
];

const highlights = [
  { value: "40%", label: "Reduction in Readmissions" },
  { value: "3x", label: "More Patients Per Care Manager" },
  { value: "89%", label: "Patient Engagement Rate" },
  { value: "<30s", label: "Average Alert Response Time" },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Powerful Features for Modern RPM
            </h1>
            <p className="text-xl text-blue-200 max-w-3xl mx-auto mb-8">
              Everything you need to monitor patients remotely, detect problems early, and deliver proactive care at scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/register"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                Schedule Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="py-12 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {highlights.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-slate-600 dark:text-slate-300 text-sm">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Categories */}
        {features.map((category, categoryIndex) => (
          <section
            key={category.category}
            className={`py-16 lg:py-24 ${
              categoryIndex % 2 === 1 ? "bg-slate-50 dark:bg-slate-800/50" : ""
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12 text-center">
                {category.category}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {category.items.map((feature) => (
                  <div
                    key={feature.title}
                    className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
                  >
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Feature Comparison */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Why Choose VytalWatch AI?
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                See how we compare to traditional RPM solutions
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-slate-300 font-medium">Feature</th>
                    <th className="text-center py-4 px-4 text-blue-600 dark:text-blue-400 font-bold">VytalWatch AI</th>
                    <th className="text-center py-4 px-4 text-slate-600 dark:text-slate-300 font-medium">Traditional RPM</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["AI-Powered Risk Prediction", true, false],
                    ["Real-Time Alerting", true, true],
                    ["Automated Billing & CPT Tracking", true, false],
                    ["EHR Integration", true, true],
                    ["Patient Mobile App", true, false],
                    ["Predictive Analytics", true, false],
                    ["24/7 Support", true, false],
                    ["HIPAA & SOC 2 Compliant", true, true],
                  ].map(([feature, vytalwatch, traditional]) => (
                    <tr key={String(feature)} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-4 px-4 text-slate-700 dark:text-slate-300">{String(feature)}</td>
                      <td className="text-center py-4 px-4">
                        {vytalwatch ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="text-center py-4 px-4">
                        {traditional ? (
                          <CheckCircle className="h-5 w-5 text-slate-400 mx-auto" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-br from-blue-600 to-blue-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Transform Your RPM Program?
            </h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
              Join 150+ healthcare organizations already using VytalWatch AI to improve patient outcomes.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Your Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
