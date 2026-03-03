import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";
import {
  Book,
  Code,
  Zap,
  Shield,
  Settings,
  ArrowRight,
  Search,
  FileText,
  Video,
  MessageSquare
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Comprehensive documentation for VytalWatch AI. Getting started guides, API reference, device integration, billing and CPT codes, AI analytics, and security best practices.",
  openGraph: {
    title: "VytalWatch AI Documentation - Guides, API Reference & More",
    description:
      "Everything you need to implement and optimize your remote patient monitoring program. Quick start guides, API docs, device setup, and compliance resources.",
    url: "https://vytalwatch.com/docs",
    type: "website",
  },
};

const docCategories = [
  {
    title: "Getting Started",
    description: "Quick start guides to get your RPM program up and running",
    icon: Zap,
    color: "bg-blue-500",
    links: [
      { title: "Platform Overview", href: "/docs/overview" },
      { title: "Quick Start Guide", href: "/docs/quickstart" },
      { title: "Account Setup", href: "/docs/account-setup" },
      { title: "Adding Your First Patient", href: "/docs/first-patient" },
    ],
  },
  {
    title: "Device Integration",
    description: "Connect and manage monitoring devices",
    icon: Settings,
    color: "bg-emerald-500",
    links: [
      { title: "Supported Devices", href: "/docs/devices" },
      { title: "Device Pairing", href: "/docs/device-pairing" },
      { title: "Tenovi Integration", href: "/docs/tenovi" },
      { title: "Troubleshooting Devices", href: "/docs/device-troubleshooting" },
    ],
  },
  {
    title: "API Reference",
    description: "Build custom integrations with our REST API",
    icon: Code,
    color: "bg-purple-500",
    links: [
      { title: "Authentication", href: "/docs/api/auth" },
      { title: "Patients API", href: "/docs/api/patients" },
      { title: "Vitals API", href: "/docs/api/vitals" },
      { title: "Webhooks", href: "/docs/api/webhooks" },
    ],
  },
  {
    title: "Billing & Compliance",
    description: "CPT codes, billing automation, and HIPAA compliance",
    icon: FileText,
    color: "bg-amber-500",
    links: [
      { title: "CPT Code Reference", href: "/docs/cpt-codes" },
      { title: "Billing Automation", href: "/docs/billing" },
      { title: "HIPAA Compliance", href: "/docs/hipaa" },
      { title: "Audit Logs", href: "/docs/audit-logs" },
    ],
  },
  {
    title: "AI & Analytics",
    description: "Leverage AI insights for better patient outcomes",
    icon: Zap,
    color: "bg-rose-500",
    links: [
      { title: "AI Insights Overview", href: "/docs/ai-insights" },
      { title: "Risk Score Calculations", href: "/docs/risk-scores" },
      { title: "Predictive Alerts", href: "/docs/predictive-alerts" },
      { title: "Custom Analytics", href: "/docs/analytics" },
    ],
  },
  {
    title: "Security",
    description: "Security features and best practices",
    icon: Shield,
    color: "bg-slate-600",
    links: [
      { title: "Security Overview", href: "/docs/security" },
      { title: "SSO Configuration", href: "/docs/sso" },
      { title: "Role-Based Access", href: "/docs/rbac" },
      { title: "Data Encryption", href: "/docs/encryption" },
    ],
  },
];

const popularDocs = [
  { title: "Quick Start Guide", views: "12.5k", href: "/docs/quickstart" },
  { title: "CPT Code Reference", views: "8.3k", href: "/docs/cpt-codes" },
  { title: "API Authentication", views: "6.7k", href: "/docs/api/auth" },
  { title: "Device Pairing", views: "5.2k", href: "/docs/device-pairing" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Documentation
              </h1>
              <p className="text-xl text-slate-300 mb-8">
                Everything you need to implement and optimize your remote patient monitoring program.
              </p>
              
              {/* Search */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="py-8 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <span className="text-sm text-slate-500 dark:text-slate-400">Quick links:</span>
              <Link href="/docs/quickstart" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Quick Start
              </Link>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <Link href="/docs/api" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                API Reference
              </Link>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <Link href="/docs/cpt-codes" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                CPT Codes
              </Link>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <Link href="/docs/devices" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Devices
              </Link>
            </div>
          </div>
        </section>

        {/* Doc Categories Grid */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {docCategories.map((category) => (
                <div
                  key={category.title}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center mb-4`}>
                    <category.icon className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {category.title}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
                    {category.description}
                  </p>
                  <ul className="space-y-2">
                    {category.links.map((link) => (
                      <li key={link.title}>
                        <Link
                          href={link.href}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          {link.title}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular & Resources */}
        <section className="py-16 bg-slate-50 dark:bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Popular Docs */}
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  Popular Documentation
                </h2>
                <div className="space-y-4">
                  {popularDocs.map((doc, index) => (
                    <Link
                      key={doc.title}
                      href={doc.href}
                      className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-slate-300 dark:text-slate-600">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {doc.title}
                        </span>
                      </div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {doc.views} views
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Additional Resources */}
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  Additional Resources
                </h2>
                <div className="grid gap-4">
                  <Link
                    href="/docs/video-tutorials"
                    className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors"
                  >
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <Video className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Video Tutorials</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Step-by-step video guides</p>
                    </div>
                  </Link>

                  <Link
                    href="/help"
                    className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors"
                  >
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Help Center</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">FAQs and support articles</p>
                    </div>
                  </Link>

                  <Link
                    href="/docs/changelog"
                    className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors"
                  >
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                      <Book className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Changelog</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Latest updates and releases</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Developer CTA */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 lg:p-12 text-center">
              <Code className="h-12 w-12 text-white mx-auto mb-4" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                Build with Our API
              </h2>
              <p className="text-purple-100 mb-8 max-w-2xl mx-auto">
                Integrate VytalWatch AI into your existing systems with our comprehensive REST API. Full documentation, SDKs, and sandbox environment included.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/docs/api"
                  className="px-8 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
                >
                  View API Docs
                </Link>
                <Link
                  href="/developers"
                  className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  Developer Portal
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
