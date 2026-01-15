"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Users,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowRight,
  Phone,
  Eye,
  MoreHorizontal,
  Brain,
  Lightbulb,
  Target,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

// Mock data
const stats = [
  {
    title: "Total Patients",
    value: "47",
    change: "+3 this week",
    changeType: "positive",
    icon: Users,
    color: "blue",
  },
  {
    title: "Active Alerts",
    value: "12",
    change: "3 critical",
    changeType: "warning",
    icon: AlertTriangle,
    color: "red",
  },
  {
    title: "Adherence Rate",
    value: "89%",
    change: "+4% vs last month",
    changeType: "positive",
    icon: TrendingUp,
    color: "emerald",
  },
  {
    title: "Monthly Revenue",
    value: "$5,875",
    change: "47 × $125",
    changeType: "neutral",
    icon: DollarSign,
    color: "purple",
  },
];

const alerts = [
  {
    id: "1",
    patient: { name: "Maria Garcia", avatar: null },
    type: "Blood Pressure",
    value: "185/110 mmHg",
    severity: "critical",
    time: new Date(Date.now() - 5 * 60000),
  },
  {
    id: "2",
    patient: { name: "James Lee", avatar: null },
    type: "Glucose",
    value: "45 mg/dL",
    severity: "critical",
    time: new Date(Date.now() - 12 * 60000),
  },
  {
    id: "3",
    patient: { name: "Susan Park", avatar: null },
    type: "Weight",
    value: "+5 lbs in 2 days",
    severity: "warning",
    time: new Date(Date.now() - 60 * 60000),
  },
  {
    id: "4",
    patient: { name: "Robert Chen", avatar: null },
    type: "No Reading",
    value: "3 days",
    severity: "warning",
    time: new Date(Date.now() - 2 * 60 * 60000),
  },
];

const patients = [
  {
    id: "1",
    name: "Maria Garcia",
    age: 68,
    conditions: ["CHF", "Hypertension"],
    riskScore: 87,
    lastVitals: { bp: "142/88", glucose: "126", weight: "168 lbs" },
    lastReading: new Date(Date.now() - 2 * 60 * 60000),
    status: "critical",
  },
  {
    id: "2",
    name: "James Lee",
    age: 54,
    conditions: ["Diabetes", "Obesity"],
    riskScore: 72,
    lastVitals: { bp: "138/86", glucose: "185", weight: "224 lbs" },
    lastReading: new Date(Date.now() - 4 * 60 * 60000),
    status: "warning",
  },
  {
    id: "3",
    name: "Susan Park",
    age: 72,
    conditions: ["CHF", "CKD"],
    riskScore: 65,
    lastVitals: { bp: "128/78", glucose: "102", weight: "156 lbs" },
    lastReading: new Date(Date.now() - 6 * 60 * 60000),
    status: "warning",
  },
  {
    id: "4",
    name: "Robert Chen",
    age: 61,
    conditions: ["Hypertension"],
    riskScore: 35,
    lastVitals: { bp: "122/76", glucose: "95", weight: "182 lbs" },
    lastReading: new Date(Date.now() - 8 * 60 * 60000),
    status: "normal",
  },
  {
    id: "5",
    name: "Linda Martinez",
    age: 59,
    conditions: ["Diabetes"],
    riskScore: 28,
    lastVitals: { bp: "118/74", glucose: "108", weight: "145 lbs" },
    lastReading: new Date(Date.now() - 12 * 60 * 60000),
    status: "normal",
  },
];

const aiInsights = [
  {
    type: "prediction",
    icon: Brain,
    title: "CHF Risk Alert",
    message: "3 patients showing early signs of fluid retention. Consider proactive intervention.",
    confidence: 89,
    color: "purple",
  },
  {
    type: "recommendation",
    icon: Lightbulb,
    title: "Medication Suggestion",
    message: "Maria Garcia's BP could improve with morning dosing based on her patterns.",
    confidence: 82,
    color: "amber",
  },
  {
    type: "achievement",
    icon: Target,
    title: "Quality Metric",
    message: "Your diabetes cohort has 15% better A1C control than regional average.",
    confidence: 95,
    color: "emerald",
  },
];

export default function ProviderDashboard() {
  return (
    <DashboardLayout requiredRole="provider">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Provider Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Monitor your patients and manage alerts in real-time
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />}>
              Refresh
            </Button>
            <Button leftIcon={<Users className="h-4 w-4" />}>
              Add Patient
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between">
                <div
                  className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}
                >
                  <stat.icon
                    className={`h-5 w-5 text-${stat.color}-600 dark:text-${stat.color}-400`}
                  />
                </div>
                <span
                  className={`text-xs font-medium ${
                    stat.changeType === "positive"
                      ? "text-emerald-600"
                      : stat.changeType === "warning"
                      ? "text-red-600"
                      : "text-slate-500"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {stat.title}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Alerts Section */}
          <div className="lg:col-span-2">
            <Card padding="none">
              <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Active Alerts
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            alert.severity === "critical"
                              ? "bg-red-500 animate-pulse"
                              : "bg-amber-500"
                          }`}
                        />
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-300">
                          {alert.patient.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {alert.patient.name}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {alert.type}: {alert.value}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                          {formatRelativeTime(alert.time)}
                        </span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <div>
            <Card padding="none">
              <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {aiInsights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border bg-${insight.color}-50 dark:bg-${insight.color}-900/10 border-${insight.color}-200 dark:border-${insight.color}-800`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-1.5 rounded-lg bg-${insight.color}-100 dark:bg-${insight.color}-900/30`}
                      >
                        <insight.icon
                          className={`h-4 w-4 text-${insight.color}-600 dark:text-${insight.color}-400`}
                        />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium text-${insight.color}-900 dark:text-${insight.color}-100`}
                        >
                          {insight.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {insight.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-${insight.color}-500 rounded-full`}
                              style={{ width: `${insight.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">
                            {insight.confidence}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Patient List */}
        <Card padding="none">
          <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle>Patient Overview</CardTitle>
              <div className="flex gap-2">
                <select className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <option>All Patients</option>
                  <option>High Risk</option>
                  <option>Medium Risk</option>
                  <option>Low Risk</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="table-header">Patient</th>
                  <th className="table-header">Conditions</th>
                  <th className="table-header">Risk Score</th>
                  <th className="table-header">Latest Vitals</th>
                  <th className="table-header">Last Reading</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-medium">
                          {patient.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {patient.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {patient.age} years old
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {patient.conditions.map((condition) => (
                          <span
                            key={condition}
                            className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded"
                          >
                            {condition}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            patient.riskScore >= 70
                              ? "bg-red-500"
                              : patient.riskScore >= 40
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        >
                          {patient.riskScore}
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            patient.riskScore >= 70
                              ? "text-red-600"
                              : patient.riskScore >= 40
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {patient.riskScore >= 70
                            ? "High"
                            : patient.riskScore >= 40
                            ? "Medium"
                            : "Low"}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="space-y-1 text-xs">
                        <p>
                          <span className="text-slate-500">BP:</span>{" "}
                          {patient.lastVitals.bp}
                        </p>
                        <p>
                          <span className="text-slate-500">Glucose:</span>{" "}
                          {patient.lastVitals.glucose}
                        </p>
                        <p>
                          <span className="text-slate-500">Weight:</span>{" "}
                          {patient.lastVitals.weight}
                        </p>
                      </div>
                    </td>
                    <td className="table-cell text-slate-500">
                      {formatRelativeTime(patient.lastReading)}
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
