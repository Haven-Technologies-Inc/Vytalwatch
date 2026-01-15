"use client";

import { Button } from "@/components/ui/Button";
import {
  Play,
  ArrowRight,
  Shield,
  Award,
  CheckCircle,
  Activity
} from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative min-h-screen pt-20 pb-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800" />

      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse animation-delay-400" />
        <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-600" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium mb-6">
              <Activity className="h-4 w-4" />
              <span>AI-Powered Healthcare Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
              Stop Losing Patients to{" "}
              <span className="gradient-text">Preventable Readmissions</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-xl mx-auto lg:mx-0">
              AI-Powered Remote Patient Monitoring That Pays for Itself—While Saving Lives.
              Reduce readmissions by 40% and generate sustainable RPM revenue.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Link href="/auth/register">
                <Button size="xl" rightIcon={<ArrowRight className="h-5 w-5" />}>
                  Start Free 30-Day Trial
                </Button>
              </Link>
              <Button
                variant="outline"
                size="xl"
                leftIcon={<Play className="h-5 w-5" />}
              >
                Watch 2-Min Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-start text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-500" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-500" />
                <span>FDA-Approved Devices</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-500" />
                <span>SOC 2 Certified</span>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative">
            <div className="relative">
              {/* Main Dashboard Image */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2">
                <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-4">
                  {/* Mock Dashboard Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">VitalWatch AI</div>
                        <div className="text-xs text-slate-500">Provider Dashboard</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                        <span className="text-xs text-emerald-600">12</span>
                      </div>
                    </div>
                  </div>

                  {/* Mock Stats */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Patients", value: "47", color: "blue" },
                      { label: "Alerts", value: "12", color: "red" },
                      { label: "Adherence", value: "89%", color: "emerald" },
                      { label: "Revenue", value: "$5.8K", color: "purple" },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center"
                      >
                        <div className={`text-lg font-bold text-${stat.color}-600`}>
                          {stat.value}
                        </div>
                        <div className="text-xs text-slate-500">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mock Patient List */}
                  <div className="space-y-2">
                    {[
                      { name: "Maria Garcia", status: "critical", bp: "185/110" },
                      { name: "James Lee", status: "warning", bp: "145/92" },
                      { name: "Susan Park", status: "normal", bp: "122/78" },
                    ].map((patient, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {patient.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              BP: {patient.bp}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            patient.status === "critical"
                              ? "bg-red-500"
                              : patient.status === "warning"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating AI Insight Card */}
              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 max-w-xs animate-float">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🤖</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                      AI Insight
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Maria&apos;s BP trending up 12% over 5 days. Consider medication adjustment.
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Alert Card */}
              <div className="absolute -top-4 -right-4 bg-red-50 dark:bg-red-900/20 rounded-xl shadow-lg border border-red-200 dark:border-red-800 p-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    3 Critical Alerts
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted By Logos */}
        <div className="mt-20 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Trusted by 500+ Forward-Thinking Healthcare Providers
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            {["Memorial Clinic", "HealthFirst", "CareConnect", "MedPlus", "VitaCare"].map(
              (name, i) => (
                <div
                  key={i}
                  className="text-lg font-bold text-slate-400 dark:text-slate-600"
                >
                  {name}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
