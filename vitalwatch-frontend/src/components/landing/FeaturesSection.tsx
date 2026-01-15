"use client";

import { Card } from "@/components/ui/Card";
import {
  Brain,
  Bell,
  LineChart,
  Shield,
  Smartphone,
  Users,
  Zap,
  HeartPulse,
  Clock,
  DollarSign,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Early Warning",
    description:
      "Our AI analyzes vital patterns in real-time, detecting anomalies 3-5 days before clinical symptoms appear.",
    color: "blue",
  },
  {
    icon: Bell,
    title: "Smart Alert Prioritization",
    description:
      "Intelligent severity scoring ensures you focus on the patients who need attention most urgently.",
    color: "red",
  },
  {
    icon: LineChart,
    title: "Predictive Analytics",
    description:
      "Risk scores and trend analysis help you proactively manage patient populations.",
    color: "purple",
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description:
      "Enterprise-grade security with end-to-end encryption and SOC 2 Type II certification.",
    color: "emerald",
  },
  {
    icon: Smartphone,
    title: "FDA-Approved Devices",
    description:
      "Cellular-connected Tenovi devices work out-of-the-box. No WiFi setup required.",
    color: "orange",
  },
  {
    icon: DollarSign,
    title: "Automated Billing",
    description:
      "Auto-generate CPT codes (99453, 99454, 99457, 99458) and track reimbursement eligibility.",
    color: "green",
  },
];

const problems = [
  {
    icon: AlertTriangle,
    stat: "$26B",
    label: "Annual cost of 30-day readmissions",
    color: "red",
  },
  {
    icon: Clock,
    stat: "15+",
    label: "Hours/week wasted on manual calls",
    color: "amber",
  },
  {
    icon: DollarSign,
    stat: "97%",
    label: "Eligible patients NOT enrolled in RPM",
    color: "orange",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-white dark:bg-slate-900">
      {/* Problem Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            The Hidden Cost of Traditional Monitoring
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Healthcare providers are losing patients, time, and revenue to outdated monitoring approaches.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <Card key={index} className="text-center p-8" hover>
              <div
                className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-${problem.color}-100 dark:bg-${problem.color}-900/30`}
              >
                <problem.icon
                  className={`h-8 w-8 text-${problem.color}-600 dark:text-${problem.color}-400`}
                />
              </div>
              <div className={`text-4xl font-bold text-${problem.color}-600 dark:text-${problem.color}-400 mb-2`}>
                {problem.stat}
              </div>
              <p className="text-slate-600 dark:text-slate-400">{problem.label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Solution Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-4">
            <CheckCircle className="h-4 w-4" />
            <span>The Solution</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Your 24/7 Clinical Intelligence Partner
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            VitalWatch AI monitors your patients around the clock, predicting problems before they escalate.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-6 group"
              hover
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-${feature.color}-100 dark:bg-${feature.color}-900/30 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon
                  className={`h-6 w-6 text-${feature.color}-600 dark:text-${feature.color}-400`}
                />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Get started in minutes, not weeks. Our streamlined process gets patients monitored quickly.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Enroll Patients",
              description:
                "Ship cellular devices directly to patients. No setup required—works out of the box.",
              icon: Users,
            },
            {
              step: "2",
              title: "AI Monitors 24/7",
              description:
                "Devices auto-transmit vitals. AI analyzes patterns in real-time and flags anomalies.",
              icon: HeartPulse,
            },
            {
              step: "3",
              title: "Intervene Early",
              description:
                "Get smart alerts on your dashboard. Review AI recommendations and adjust treatment.",
              icon: Zap,
            },
          ].map((item, index) => (
            <div key={index} className="relative">
              <Card className="p-6 text-center relative z-10">
                <div className="w-12 h-12 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {item.step}
                </div>
                <item.icon className="h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {item.description}
                </p>
              </Card>
              {index < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
