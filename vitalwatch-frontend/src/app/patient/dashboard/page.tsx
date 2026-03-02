"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { PageWrapper } from "@/components/ui/PageWrapper";
import { Button } from "@/components/ui/Button";
import {
  Activity,
  Heart,
  Droplet,
  Scale,
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
  ClipboardList,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useAuthStore } from "@/stores/authStore";
import { vitalsApi, aiApi, patientsApi } from "@/services/api";
import type { ApiResponse, VitalReading, AIInsight, Appointment, Medication } from "@/types";

// Icon/color map for vital types
const vitalMeta: Record<string, { icon: typeof Heart; color: string; label: string; unit: string }> = {
  blood_pressure: { icon: Heart, label: "Blood Pressure", color: "red", unit: "mmHg" },
  spo2: { icon: Droplet, label: "Oxygen Level", color: "blue", unit: "%" },
  glucose: { icon: Activity, label: "Blood Glucose", color: "purple", unit: "mg/dL" },
  weight: { icon: Scale, label: "Weight", color: "amber", unit: "lbs" },
  heart_rate: { icon: Heart, label: "Heart Rate", color: "pink", unit: "bpm" },
  temperature: { icon: Activity, label: "Temperature", color: "orange", unit: "°F" },
};

// Insight type to emoji mapping
const insightIconMap: Record<string, string> = {
  achievement: "🎉",
  tip: "💡",
  goal: "🎯",
  trend: "📈",
  anomaly: "⚠️",
  recommendation: "💡",
  warning: "⚠️",
};

function formatVitalValue(reading: VitalReading): string {
  if (reading.type === "blood_pressure" && reading.values) {
    const sys = reading.values.systolic ?? reading.values.sys;
    const dia = reading.values.diastolic ?? reading.values.dia;
    if (sys !== undefined && dia !== undefined) return `${sys}/${dia}`;
  }
  // For single-value vitals, grab the first numeric value
  const vals = Object.values(reading.values || {});
  return vals.length > 0 ? String(vals[0]) : "--";
}

export default function PatientDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const patientId = user?.id || "";

  // Fetch latest vitals
  const {
    data: vitalsResponse,
    isLoading: vitalsLoading,
    error: vitalsError,
    refetch: refetchVitals,
  } = useApiQuery<ApiResponse<Record<string, VitalReading>>>(
    () => vitalsApi.getLatest(patientId),
    { enabled: !!patientId }
  );

  // Fetch AI insights
  const {
    data: insightsResponse,
    isLoading: insightsLoading,
  } = useApiQuery<ApiResponse<AIInsight[]>>(
    () => aiApi.getInsights(patientId),
    { enabled: !!patientId }
  );

  // Fetch upcoming appointments (limit 3)
  const {
    data: appointmentsResponse,
    isLoading: appointmentsLoading,
  } = useApiQuery<ApiResponse<Appointment[]>>(
    () => patientsApi.getAppointments(patientId, "scheduled"),
    { enabled: !!patientId }
  );

  // Fetch medications
  const {
    data: medicationsResponse,
    isLoading: medicationsLoading,
  } = useApiQuery<ApiResponse<Medication[]>>(
    () => patientsApi.getMedications(patientId),
    { enabled: !!patientId }
  );

  const isLoading = vitalsLoading || insightsLoading || appointmentsLoading || medicationsLoading;

  // Transform vitals data into display format
  const vitals = useMemo(() => {
    const vitalsMap = vitalsResponse?.data;
    if (!vitalsMap) return [];
    return Object.entries(vitalsMap).map(([type, reading]) => {
      const meta = vitalMeta[type] || { icon: Activity, color: "slate", label: type, unit: "" };
      return {
        type: meta.label,
        icon: meta.icon,
        value: formatVitalValue(reading),
        unit: reading.unit || meta.unit,
        status: reading.status || "normal",
        trend: "stable" as string,
        change: "",
        lastReading: new Date(reading.timestamp),
        color: meta.color,
      };
    });
  }, [vitalsResponse]);

  // AI insights
  const aiInsights = useMemo(() => {
    const insights = insightsResponse?.data;
    if (!insights || !Array.isArray(insights)) return [];
    return insights.slice(0, 5).map((insight) => ({
      type: insight.type || "tip",
      title: insight.title,
      message: insight.message,
      icon: insightIconMap[insight.type] || "💡",
    }));
  }, [insightsResponse]);

  // Appointments
  const appointments = useMemo(() => {
    const appts = appointmentsResponse?.data;
    if (!appts || !Array.isArray(appts)) return [];
    return appts.slice(0, 3).map((apt) => ({
      title: apt.notes || "Appointment",
      doctor: apt.providerId || "Provider",
      date: new Date(apt.scheduledAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      type: apt.type === "telehealth" ? "video" : apt.type === "phone" ? "phone" : "in-person",
    }));
  }, [appointmentsResponse]);

  // Medications with local taken state
  const [medicationsTaken, setMedicationsTaken] = useState<Record<string, boolean[]>>({});

  const medications = useMemo(() => {
    const meds = medicationsResponse?.data;
    if (!meds || !Array.isArray(meds)) return [];
    return meds.flatMap((med) =>
      (med.schedule || []).map((sched, idx) => ({
        medId: med.id,
        schedIdx: idx,
        name: `${med.name} ${med.dosage}`,
        time: sched.time,
        taken: medicationsTaken[med.id]?.[idx] ?? sched.taken ?? false,
      }))
    );
  }, [medicationsResponse, medicationsTaken]);

  const handleMessageCareTeam = useCallback(() => {
    router.push('/patient/messages');
  }, [router]);

  const handleViewAllMedications = useCallback(() => {
    router.push('/patient/medications');
  }, [router]);

  const handleScheduleAppointment = useCallback(() => {
    router.push('/patient/appointments?action=schedule');
  }, [router]);

  const handleViewAppointment = useCallback((appointmentTitle: string) => {
    toast({ title: 'Appointment Details', description: `Viewing ${appointmentTitle}`, type: 'info' });
    router.push('/patient/appointments');
  }, [router, toast]);

  const handleToggleMedication = useCallback((index: number) => {
    const med = medications[index];
    if (!med) return;
    setMedicationsTaken((prev) => {
      const existing = prev[med.medId] || [];
      const updated = [...existing];
      updated[med.schedIdx] = !med.taken;
      return { ...prev, [med.medId]: updated };
    });
    if (!med.taken) {
      toast({ title: 'Medication marked as taken', description: med.name, type: 'success' });
    }
  }, [medications, toast]);

  const handleViewVital = useCallback((vitalType: string) => {
    router.push(`/patient/vitals?type=${encodeURIComponent(vitalType)}`);
  }, [router]);

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
      <PageWrapper
        isLoading={isLoading}
        error={vitalsError}
        onRetry={refetchVitals}
        isEmpty={!isLoading && vitals.length === 0}
        emptyProps={{
          icon: ClipboardList,
          title: 'No dashboard data yet',
          description: 'Your vitals and health data will appear here once readings are available.',
        }}
        loadingMessage="Loading your dashboard..."
      >
      <div className="space-y-6">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-blue-600 to-emerald-500 border-0 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-white">
              <h1 className="text-2xl font-bold">Welcome back, {user?.firstName || "Patient"}!</h1>
              <p className="text-blue-100 mt-1">
                You&apos;re doing great this week. Keep it up!
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={handleMessageCareTeam}
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
                {aiInsights.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                    No insights available yet. Keep tracking your vitals!
                  </p>
                ) : (
                  aiInsights.map((insight, index) => (
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
                  ))
                )}
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
                  <Button variant="ghost" size="sm" onClick={handleViewAllMedications}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {medications.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                    No medications scheduled.
                  </p>
                ) : (
                  medications.map((med, index) => (
                    <div
                      key={`${med.medId}-${med.schedIdx}`}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        med.taken
                          ? "bg-emerald-50 dark:bg-emerald-900/20"
                          : "bg-slate-50 dark:bg-slate-700/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleMedication(index)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            med.taken
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-slate-300 dark:border-slate-600 hover:border-emerald-500"
                          }`}
                          aria-label={med.taken ? "Mark as not taken" : "Mark as taken"}
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
                  ))
                )}
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
              <Button variant="ghost" size="sm" onClick={handleScheduleAppointment}>
                Schedule New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No upcoming appointments.
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {appointments.map((apt, index) => (
                  <div
                    key={index}
                    onClick={() => handleViewAppointment(apt.title)}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
            )}
          </CardContent>
        </Card>
      </div>
      </PageWrapper>
    </DashboardLayout>
  );
}
