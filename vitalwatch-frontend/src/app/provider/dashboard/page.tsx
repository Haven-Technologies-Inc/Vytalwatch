"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { PageWrapper } from "@/components/ui/PageWrapper";
import { Button } from "@/components/ui/Button";
import {
  Users,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Phone,
  Eye,
  MoreHorizontal,
  Brain,
  Lightbulb,
  Target,
  RefreshCw,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { useApiQuery } from "@/hooks/useApiQuery";
import apiClient from "@/services/api/client";

// ---------- API response types ----------

interface ProviderStatsResponse {
  data: {
    totalPatients: number;
    activeAlerts: number;
    criticalAlerts: number;
    adherenceRate: number;
    adherenceChange: number;
    monthlyRevenue: number;
    patientChange: number;
  };
}

interface DashboardAlert {
  id: string;
  patient: { name: string; avatar: string | null };
  type: string;
  value: string;
  severity: "critical" | "warning" | "info";
  time: string;
}

interface AlertsResponse {
  data: {
    results: DashboardAlert[];
  };
}

interface DashboardPatient {
  id: string;
  name: string;
  age: number;
  conditions: string[];
  riskScore: number;
  lastVitals: { bp: string; glucose: string; weight: string };
  lastReading: string;
  status: "critical" | "warning" | "normal";
}

interface PatientsResponse {
  data: {
    results: DashboardPatient[];
  };
}

interface DashboardInsight {
  type: string;
  title: string;
  message: string;
  confidence: number;
  color: string;
}

interface InsightsResponse {
  data: DashboardInsight[];
}

// ---------- Icon/color mapping helpers ----------

const insightIconMap: Record<string, typeof Brain> = {
  prediction: Brain,
  recommendation: Lightbulb,
  achievement: Target,
};

const statIcons = [Users, AlertTriangle, TrendingUp, DollarSign];
const statColors = ["blue", "red", "emerald", "purple"];

export default function ProviderDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ---- API calls ----
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApiQuery<ProviderStatsResponse>(
    () => apiClient.get<ProviderStatsResponse>("/analytics/provider-stats"),
  );

  const {
    data: alertsData,
    isLoading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useApiQuery<AlertsResponse>(
    () => apiClient.get<AlertsResponse>("/alerts", { params: { limit: 5 } }),
  );

  const {
    data: patientsData,
    isLoading: patientsLoading,
    error: patientsError,
    refetch: refetchPatients,
  } = useApiQuery<PatientsResponse>(
    () => apiClient.get<PatientsResponse>("/patients", { params: { limit: 10 } }),
  );

  const {
    data: insightsData,
    refetch: refetchInsights,
  } = useApiQuery<InsightsResponse>(
    () => apiClient.get<InsightsResponse>("/ai/insights"),
  );

  // ---- Derived data ----

  const isLoading = statsLoading || alertsLoading || patientsLoading;
  const error = statsError || alertsError || patientsError;

  const stats = useMemo(() => {
    const s = statsData?.data;
    if (!s) return [];
    return [
      {
        title: "Total Patients",
        value: String(s.totalPatients ?? 0),
        change: `+${s.patientChange ?? 0} this week`,
        changeType: "positive" as const,
        icon: statIcons[0],
        color: statColors[0],
      },
      {
        title: "Active Alerts",
        value: String(s.activeAlerts ?? 0),
        change: `${s.criticalAlerts ?? 0} critical`,
        changeType: "warning" as const,
        icon: statIcons[1],
        color: statColors[1],
      },
      {
        title: "Adherence Rate",
        value: `${s.adherenceRate ?? 0}%`,
        change: `+${s.adherenceChange ?? 0}% vs last month`,
        changeType: "positive" as const,
        icon: statIcons[2],
        color: statColors[2],
      },
      {
        title: "Monthly Revenue",
        value: `$${(s.monthlyRevenue ?? 0).toLocaleString()}`,
        change: `${s.totalPatients ?? 0} patients`,
        changeType: "neutral" as const,
        icon: statIcons[3],
        color: statColors[3],
      },
    ];
  }, [statsData]);

  const alerts = useMemo(() => {
    const results = alertsData?.data?.results ?? [];
    return results.map((a) => ({
      ...a,
      time: new Date(a.time),
    }));
  }, [alertsData]);

  const patients = useMemo(() => {
    const results = patientsData?.data?.results ?? [];
    return results.map((p) => ({
      ...p,
      lastReading: new Date(p.lastReading),
    }));
  }, [patientsData]);

  const aiInsights = useMemo(() => {
    const data = insightsData?.data ?? [];
    return data.map((i) => ({
      ...i,
      icon: insightIconMap[i.type] || Brain,
      color: i.color || "purple",
    }));
  }, [insightsData]);

  // ---- Handlers ----

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchStats(), refetchAlerts(), refetchPatients(), refetchInsights()]);
      toast({ title: "Dashboard refreshed", description: "All data is up to date" });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast, refetchStats, refetchAlerts, refetchPatients, refetchInsights]);

  const handleAddPatient = () => {
    router.push("/provider/patients?action=add");
  };

  const handleViewAllAlerts = () => {
    router.push("/provider/alerts");
  };

  const handleViewPatient = (patientId: string) => {
    router.push(`/provider/patients/${patientId}`);
  };

  const handleCallPatient = (patientName: string) => {
    toast({ title: "Initiating call", description: `Calling ${patientName}...` });
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    toast({ title: "Alert acknowledged", description: `Alert ${alertId} has been acknowledged` });
  };

  const handleMessagePatient = (patientId: string, patientName: string) => {
    router.push(`/provider/messages?patient=${patientId}&name=${encodeURIComponent(patientName)}`);
  };

  return (
    <DashboardLayout requiredRole="provider">
      <PageWrapper
        isLoading={isLoading}
        error={error}
        isEmpty={patients.length === 0 && !isLoading && !error}
        emptyProps={{
          icon: Users,
          title: 'No patients yet',
          description: 'Add your first patient to start monitoring their vitals and health data.',
          action: { label: 'Add Patient', onClick: handleAddPatient },
        }}
        loadingMessage="Loading provider dashboard..."
      >
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
            <Button
              variant="outline"
              leftIcon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button leftIcon={<Users className="h-4 w-4" />} onClick={handleAddPatient}>
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
                  <Button variant="ghost" size="sm" onClick={handleViewAllAlerts}>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewPatient(alert.id)}
                            title="View patient"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCallPatient(alert.patient.name)}
                            title="Call patient"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            title="Acknowledge alert"
                          >
                            <CheckCircle className="h-4 w-4" />
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
                <select
                  aria-label="Filter patients by risk level"
                  title="Filter patients"
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPatient(patient.id)}
                          title="View patient details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMessagePatient(patient.id, patient.name)}
                          title="Message patient"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCallPatient(patient.name)}
                          title="Call patient"
                        >
                          <Phone className="h-4 w-4" />
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
      </PageWrapper>
    </DashboardLayout>
  );
}
