import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";
import {
  CreditCard,
  Mail,
  MessageSquare,
  Brain,
  Webhook,
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
  Code,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Connect VytalWatch AI with your existing healthcare stack. EHR integrations with Epic, Cerner, and athenahealth, plus Stripe, Twilio, OpenAI, and a full REST API.",
  openGraph: {
    title: "Integrations - Connect Everything, Anywhere | VytalWatch AI",
    description:
      "Seamless bi-directional EHR integrations, device platforms, payment processing, and a comprehensive developer API for custom workflows.",
    url: "https://vytalwatch.com/integrations",
    type: "website",
  },
};

const integrationCategories = [
  {
    title: "EHR Systems",
    description: "Seamless bi-directional integration with leading electronic health records",
    integrations: [
      { name: "Epic", status: "Available", logo: "E" },
      { name: "Cerner", status: "Available", logo: "C" },
      { name: "Allscripts", status: "Available", logo: "A" },
      { name: "athenahealth", status: "Available", logo: "a" },
      { name: "eClinicalWorks", status: "Available", logo: "eC" },
      { name: "NextGen", status: "Coming Soon", logo: "N" },
    ],
  },
  {
    title: "Device Platforms",
    description: "Connect with medical device ecosystems and health data aggregators",
    integrations: [
      { name: "Tenovi", status: "Deep Integration", logo: "T" },
      { name: "Apple HealthKit", status: "Available", logo: "🍎" },
      { name: "Google Fit", status: "Available", logo: "G" },
      { name: "Validic", status: "Available", logo: "V" },
      { name: "Human API", status: "Available", logo: "H" },
      { name: "Redox", status: "Available", logo: "R" },
    ],
  },
];

const featuredIntegrations = [
  {
    icon: CreditCard,
    name: "Stripe",
    category: "Payments",
    description: "Process patient payments, manage subscriptions, and handle insurance billing with Stripe's secure payment infrastructure.",
    features: ["Automated billing", "Subscription management", "Invoice generation", "Payment analytics"],
  },
  {
    icon: Mail,
    name: "Zoho Mail",
    category: "Email",
    description: "Send transactional emails, patient communications, and automated notifications through Zoho's reliable email service.",
    features: ["Transactional emails", "Email templates", "Delivery tracking", "HIPAA compliant"],
  },
  {
    icon: MessageSquare,
    name: "Twilio",
    category: "SMS & Voice",
    description: "Send SMS alerts, appointment reminders, and enable two-factor authentication with Twilio's communication platform.",
    features: ["SMS notifications", "Voice calls", "2FA authentication", "Global coverage"],
  },
  {
    icon: Brain,
    name: "OpenAI",
    category: "AI",
    description: "Power clinical summaries, patient education content, and intelligent documentation with OpenAI's language models.",
    features: ["Clinical summaries", "Documentation assist", "Patient education", "Natural language queries"],
  },
  {
    icon: Zap,
    name: "Grok AI",
    category: "AI",
    description: "Real-time vital sign analysis and pattern recognition using Grok's advanced machine learning capabilities.",
    features: ["Real-time analysis", "Pattern detection", "Risk prediction", "Trend forecasting"],
  },
  {
    icon: Webhook,
    name: "Webhooks",
    category: "Custom",
    description: "Build custom integrations with real-time event notifications for vitals, alerts, and patient activities.",
    features: ["Real-time events", "Customizable payloads", "Retry logic", "Event filtering"],
  },
];

const apiHighlights = [
  {
    title: "RESTful API",
    description: "Modern REST API with comprehensive endpoints for all platform functionality",
  },
  {
    title: "Webhooks",
    description: "Real-time event notifications for vitals, alerts, and patient activities",
  },
  {
    title: "SDKs",
    description: "Official SDKs for JavaScript, Python, and more coming soon",
  },
  {
    title: "Sandbox",
    description: "Full-featured sandbox environment for development and testing",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Connect Everything,<br />Anywhere
            </h1>
            <p className="text-xl text-blue-200 max-w-3xl mx-auto mb-8">
              VytalWatch AI integrates with your existing healthcare stack. EHRs, devices, payments, communications—all connected seamlessly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/docs/api"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                View API Docs
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                Request Integration
              </Link>
            </div>
          </div>
        </section>

        {/* Integration Categories */}
        {integrationCategories.map((category, index) => (
          <section
            key={category.title}
            className={`py-16 lg:py-20 ${index % 2 === 1 ? "bg-slate-50 dark:bg-slate-800/50" : ""}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  {category.title}
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-300">
                  {category.description}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {category.integrations.map((integration) => (
                  <div
                    key={integration.name}
                    className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 text-center hover:shadow-lg transition-shadow"
                  >
                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-3 text-xl font-bold text-slate-700 dark:text-slate-200">
                      {integration.logo}
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                      {integration.name}
                    </h3>
                    <span
                      className={`text-xs font-medium ${
                        integration.status === "Deep Integration"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : integration.status === "Coming Soon"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {integration.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Featured Integrations */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Featured Integrations
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Pre-built connections with essential healthcare and business tools
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredIntegrations.map((integration) => (
                <div
                  key={integration.name}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <integration.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {integration.name}
                      </h3>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {integration.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
                    {integration.description}
                  </p>
                  <div className="space-y-2">
                    {integration.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* API Section */}
        <section className="py-16 lg:py-24 bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                  <Code className="h-4 w-4" />
                  Developer API
                </div>
                <h2 className="text-3xl font-bold text-white mb-6">
                  Build Custom Integrations
                </h2>
                <p className="text-lg text-slate-300 mb-8">
                  Our comprehensive API lets you build custom integrations, automate workflows, and extend VytalWatch AI to meet your unique needs.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {apiHighlights.map((item) => (
                    <div key={item.title} className="bg-slate-800 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                      <p className="text-sm text-slate-400">{item.description}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/docs/api"
                  className="inline-flex items-center gap-2 text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
                >
                  Explore API Documentation <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="bg-slate-800 rounded-xl p-6 font-mono text-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <pre className="text-slate-300 overflow-x-auto">
{`// Get patient vitals
const response = await fetch(
  'https://api.vytalwatch.ai/v1/patients/123/vitals',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    }
  }
);

const vitals = await response.json();
// {
//   "bloodPressure": { "systolic": 120, "diastolic": 80 },
//   "heartRate": 72,
//   "spO2": 98,
//   "timestamp": "2026-01-17T09:30:00Z"
// }`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8 lg:p-12">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <Shield className="h-12 w-12 text-emerald-600 mb-4" />
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    Enterprise-Grade Security
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300 mb-6">
                    All integrations are built with security-first architecture. Data is encrypted in transit and at rest, with comprehensive audit logging.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "HIPAA compliant data handling",
                      "SOC 2 Type II certified",
                      "End-to-end encryption",
                      "OAuth 2.0 authentication",
                      "Role-based access controls",
                      "Comprehensive audit trails",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-center gap-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-lg mb-2">
                      <span className="text-xl font-bold text-emerald-600">SOC2</span>
                    </div>
                    <span className="text-sm text-slate-500">Type II</span>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-lg mb-2">
                      <span className="text-xl font-bold text-blue-600">HIPAA</span>
                    </div>
                    <span className="text-sm text-slate-500">Compliant</span>
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
              Need a Custom Integration?
            </h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              Our team can help you build custom integrations with your existing systems.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Contact Sales
              </Link>
              <Link
                href="/docs/api"
                className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                API Documentation
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
