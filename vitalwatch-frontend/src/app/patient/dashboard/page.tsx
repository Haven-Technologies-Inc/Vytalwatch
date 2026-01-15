"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Activity,
  Heart,
  Droplet,
  Scale,
  Thermometer,
  TrendingUp,
  TrendingDown,
  Minus,
  Pill,
  Calendar,
  MessageSquare,
  Brain,
  Check,
  Clock,
  ChevronRight,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

// Mock vitals data
const vitals = [
  {
    type: "Blood Pressure",
    icon: Heart,
    value: "128/82",
    unit: "mmHg",
    status: "normal",
    trend: "down",
    change: "-5 points",
    lastReading: new Date(Date.now() - 2 * 60 * 60000),
    color: "red",
  },
  {
    type: "Oxygen Level",
    icon: Droplet,
    value: "98",
    unit: "%",
    status: "normal",
    trend: "stable",
    change: "No change",
    lastReading: new Date(Date.now() - 4 * 60 * 60000),
    color: "blue",
  },
  {
    type: "Blood Glucose",
    icon: Activity,
    value: "108",
    unit: "mg/dL",
    status: "normal",
    trend: "down",
    change: "-12 from yesterday",
    lastReading: new Date(Date.now() - 6 * 60 * 60000),
    color: "purple",
  },
  {
    type: "Weight",
    icon: Scale,
    value: "168",
    unit: "lbs",
    status: "warning",
    trend: "up",
    change: "+2 lbs this week",
    lastReading: new Date(Date.now() - 24 * 60 * 60000),
    color: "amber",
  },
];

const medications = [
  { name: "Lisinopril 10mg", time: "8:00 AM", taken: true },
  { name: "Metformin 500mg", time: "8:00 AM", taken: true },
  { name: "Metformin 500mg", time: "6:00 PM", taken: false },
  { name: "Aspirin 81mg", time: "8:00 PM", taken: false },
];

const aiInsights = [
  {
    type: "achievement",
    title: "Great Progress!",
    message: "Your blood pressure has improved by 12% this month. Keep up the great work!",
    icon: "🎉",
  },
  {
    type: "tip",
    title: "Medication Tip",
    message: "Taking your BP meds in the morning may help with better daytime control.",
    icon: "💡",
  },
  {
    type: "goal",
    title: "Weight Goal",
    message: "You're on track to reach your weight goal. 8 lbs to go!",
    icon: "🎯",
  },
];

const appointments = [
  {
    title: "Virtual Check-in",
    doctor: "Dr. Sarah Chen",
    date: "Tomorrow, 10:00 AM",
    type: "video",
  },
  {
    title: "Lab Work",
    doctor: "Quest Diagnostics",
    date: "Jan 20, 9:00 AM",
    type: "in-person",
  },
];

export default function PatientDashboard() {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4" />;
      case "down":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout requiredRole="patient">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-blue-600 to-emerald-500 border-0 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-white">
              <h1 className="text-2xl font-bold">Welcome back, John!</h1>
              <p className="text-blue-100 mt-1">
                You&apos;re doing great this week. Keep it up!
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Care Team
              </Button>
            </div>
          </div>
        </Card>

        {/* Vitals Grid */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Today&apos;s Readings
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {vitals.map((vital, index) => (
              <Card
                key={index}
                className={`p-4 ${
                  vital.status === "critical"
                    ? "vital-critical"
                    : vital.status === "warning"
                    ? "vital-warning"
                    : "vital-normal"
                }`}
                hover
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2 rounded-lg bg-${vital.color}-100 dark:bg-${vital.color}-900/30`}
                  >
                    <vital.icon
                      className={`h-5 w-5 text-${vital.color}-600 dark:text-${vital.color}-400`}
                    />
                  </div>
                  <span
                    className={`flex items-center gap-1 text-xs font-medium ${
                      vital.trend === "up"
                        ? vital.status === "warning"
                          ? "text-amber-600"
                          : "text-slate-500"
                        : vital.trend === "down"
                        ? "text-emerald-600"
                        : "text-slate-400"
                    }`}
                  >
                    {getTrendIcon(vital.trend)}
                    {vital.change}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {vital.value}
                    <span className="text-sm font-normal text-slate-500 ml-1">
                      {vital.unit}
                    </span>
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {vital.type}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {formatRelativeTime(vital.lastReading)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* AI Insights */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  AI Health Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiInsights.map((insight, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                  >
                    <span className="text-2xl">{insight.icon}</span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {insight.title}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {insight.message}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Medications */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-blue-500" />
                    Today&apos;s Medications
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {medications.map((med, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      med.taken
                        ? "bg-emerald-50 dark:bg-emerald-900/20"
                        : "bg-slate-50 dark:bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          med.taken
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 dark:border-slate-600 hover:border-emerald-500"
                        }`}
                      >
                        {med.taken && <Check className="h-3 w-3" />}
                      </button>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            med.taken
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {med.name}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {med.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Upcoming Appointments
              </CardTitle>
              <Button variant="ghost" size="sm">
                Schedule New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {appointments.map((apt, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        apt.type === "video"
                          ? "bg-blue-100 dark:bg-blue-900/30"
                          : "bg-emerald-100 dark:bg-emerald-900/30"
                      }`}
                    >
                      <Calendar
                        className={`h-6 w-6 ${
                          apt.type === "video"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {apt.title}
                      </p>
                      <p className="text-sm text-slate-500">{apt.doctor}</p>
                      <p className="text-xs text-slate-400 mt-1">{apt.date}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
