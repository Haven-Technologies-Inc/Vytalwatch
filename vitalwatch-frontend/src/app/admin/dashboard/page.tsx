"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/hooks/useToast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { apiClient } from "@/services/api/client";
import {
  Users,
  Building,
  Smartphone,
  Activity,
  DollarSign,
  TrendingUp,
  Server,
  Database,
  Zap,
  Brain,
  Mail,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Settings,
} from "lucide-react";
import { formatCurrency, formatNumber, formatRelativeTime, extractArray, extractData } from "@/lib/utils";

// --- API response types ---

interface SystemStatsResponse {
  data: {
    totalUsers: number;
    usersChange: string;
    organizations: number;
    orgsChange: string;
    activeDevices: number;
    devicesOnlinePercent: number;
    monthlyRevenue: number;
    revenueChange: string;
  };
}

interface HealthService {
  name: string;
  status: string;
  uptime: string;
  latency: string;
}

interface HealthResponse {
  data: {
    services: HealthService[];
    overall: string;
  };
}

interface ApiLogEntry {
  method: string;
  endpoint: string;
  status: number;
  duration: string;
  time: string;
}

interface ApiLogsResponse {
  data: ApiLogEntry[];
}

interface AiModel {
  id: string;
  name: string;
  predictionsToday: number;
  accuracy: number;
  version: string;
  lastTrained: string;
}

interface AiModelsResponse {
  data: AiModel[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch system stats
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApiQuery<SystemStatsResponse>(
    () => apiClient.get<SystemStatsResponse>("/analytics/system"),
  );

  // Fetch system health
  const {
    data: healthData,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useApiQuery<HealthResponse>(
    () => apiClient.get<HealthResponse>("/health/detailed"),
  );

  // Fetch recent API logs
  const {
    data: logsData,
    isLoading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useApiQuery<ApiLogsResponse>(
    () => apiClient.get<ApiLogsResponse>("/admin/api-logs", { params: { limit: 5 } }),
  );

  // Fetch AI model metrics
  const {
    data: aiData,
    isLoading: aiLoading,
    error: aiError,
    refetch: refetchAi,
  } = useApiQuery<AiModelsResponse>(
    () => apiClient.get<AiModelsResponse>("/ai/models"),
  );

  // Derive display values from API responses (with safe fallbacks)
  const stats = extractData<SystemStatsResponse['data']>(statsData);
  const systemStats = stats
    ? [
        {
          title: "Total Users",
          value: formatNumber(stats.totalUsers),
          change: stats.usersChange || `${stats.totalUsers} total`,
          changeType: "positive",
          icon: Users,
          color: "blue",
        },
        {
          title: "Organizations",
          value: formatNumber(stats.organizations),
          change: stats.orgsChange || `${stats.organizations} total`,
          changeType: "positive",
          icon: Building,
          color: "purple",
        },
        {
          title: "Active Devices",
          value: formatNumber(stats.activeDevices),
          change: `${stats.devicesOnlinePercent ?? 0}% online`,
          changeType: "positive",
          icon: Smartphone,
          color: "emerald",
        },
        {
          title: "Monthly Revenue",
          value: formatCurrency(stats.monthlyRevenue),
          change: stats.revenueChange || "",
          changeType: "positive",
          icon: DollarSign,
          color: "amber",
        },
      ]
    : [];

  const healthInner = extractData<{ services: HealthService[]; overall: string }>(healthData);
  const systemHealth: HealthService[] = healthInner?.services ?? [];
  const overallHealth = healthInner?.overall ?? "operational";

  const recentApiLogs: ApiLogEntry[] = extractArray<ApiLogEntry>(logsData);

  const aiModels: AiModel[] = extractArray<AiModel>(aiData);
  const topModel = aiModels[0];
  const aiMetrics = {
    predictionsToday: aiModels.reduce((s, m) => s + (m.predictionsToday ?? 0), 0),
    accuracy: aiModels.length
      ? Math.round((aiModels.reduce((s, m) => s + (m.accuracy ?? 0), 0) / aiModels.length) * 10) / 10
      : 0,
    modelVersion: topModel?.version ?? "N/A",
    lastTraining: topModel?.lastTrained ? new Date(topModel.lastTrained) : new Date(),
  };

  // Static integration list (shown on dashboard; real list is on /admin/integrations)
  const integrations = [
    { name: "Stripe", status: "active", calls: 1234, icon: "💳" },
    { name: "Zoho Mail", status: "active", calls: 8945, icon: "📧" },
    { name: "Twilio SMS", status: "active", calls: 5678, icon: "📱" },
    { name: "OpenAI", status: "active", calls: 24500, icon: "🤖" },
    { name: "Grok AI", status: "active", calls: 12345, icon: "🔮" },
    { name: "Tenovi", status: "active", calls: 156789, icon: "🩺" },
  ];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchStats(), refetchHealth(), refetchLogs(), refetchAi()]);
      toast({ title: 'Dashboard refreshed', description: 'Latest data loaded', type: 'success' });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast, refetchStats, refetchHealth, refetchLogs, refetchAi]);

  const handleSystemSettings = useCallback(() => {
    router.push('/admin/settings');
  }, [router]);

  const handleConfigureIntegrations = useCallback(() => {
    router.push('/admin/integrations');
  }, [router]);

  const handleViewAllLogs = useCallback(() => {
    router.push('/admin/api-logs');
  }, [router]);

  const handleManageAI = useCallback(() => {
    router.push('/admin/ai');
  }, [router]);

  const handleQuickAction = useCallback((href: string) => {
    router.push(href);
  }, [router]);

  const isInitialLoading = statsLoading || healthLoading || logsLoading || aiLoading;
  const hasError = statsError || healthError || logsError || aiError;

  if (isInitialLoading) {
    return (
      <DashboardLayout requiredRole={["admin", "superadmin"]}>
        <LoadingState message="Loading admin dashboard..." />
      </DashboardLayout>
    );
  }

  if (hasError) {
    return (
      <DashboardLayout requiredRole={["admin", "superadmin"]}>
        <ErrorState
          message={statsError || healthError || logsError || aiError || "Failed to load dashboard data"}
          onRetry={handleRefresh}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout requiredRole={["admin", "superadmin"]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              System overview and management
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" leftIcon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />} onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button leftIcon={<Settings className="h-4 w-4" />} onClick={handleSystemSettings}>
              System Settings
            </Button>
          </div>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {systemStats.map((stat, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between">
                <div
                  className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}
                >
                  <stat.icon
                    className={`h-5 w-5 text-${stat.color}-600 dark:text-${stat.color}-400`}
                  />
                </div>
                <span className="text-xs font-medium text-emerald-600">
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* System Health */}
          <Card padding="none">
            <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-emerald-500" />
                  System Health
                </CardTitle>
                <span className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  {overallHealth === "operational"
                    ? "All Systems Operational"
                    : overallHealth === "degraded"
                    ? "Degraded Performance"
                    : "System Issues Detected"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {systemHealth.map((system, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          system.status === "operational"
                            ? "bg-emerald-500"
                            : system.status === "degraded"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                      />
                      <span className="font-medium text-slate-900 dark:text-white">
                        {system.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-slate-500">
                        Uptime: {system.uptime}
                      </span>
                      <span className="text-slate-500">
                        Latency: {system.latency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Integrations Status */}
          <Card padding="none">
            <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Integration Status
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleConfigureIntegrations}>
                  Configure
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {integrations.map((integration, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{integration.icon}</span>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">
                          {integration.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatNumber(integration.calls)} calls
                        </p>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* AI Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                AI Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Predictions Today
                </span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {formatNumber(aiMetrics.predictionsToday)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Model Accuracy
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {aiMetrics.accuracy}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Model Version
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {aiMetrics.modelVersion}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Last Training
                </span>
                <span className="text-sm text-slate-500">
                  {formatRelativeTime(aiMetrics.lastTraining)}
                </span>
              </div>
              <Button className="w-full" variant="outline" onClick={handleManageAI}>
                <Brain className="h-4 w-4 mr-2" />
                Manage AI Models
              </Button>
            </CardContent>
          </Card>

          {/* Recent API Logs */}
          <div className="lg:col-span-2">
            <Card padding="none">
              <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    Recent API Requests
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleViewAllLogs}>
                    View All Logs
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="table-header">Method</th>
                      <th className="table-header">Endpoint</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Duration</th>
                      <th className="table-header">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentApiLogs.map((log, index) => (
                      <tr key={index} className="table-row">
                        <td className="table-cell">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              log.method === "GET"
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                : log.method === "POST"
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            {log.method}
                          </span>
                        </td>
                        <td className="table-cell font-mono text-xs">
                          {log.endpoint}
                        </td>
                        <td className="table-cell">
                          <span
                            className={`flex items-center gap-1 text-xs ${
                              log.status >= 200 && log.status < 300
                                ? "text-emerald-600"
                                : log.status >= 400
                                ? "text-red-600"
                                : "text-amber-600"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                log.status >= 200 && log.status < 300
                                  ? "bg-emerald-500"
                                  : log.status >= 400
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                              }`}
                            />
                            {log.status}
                          </span>
                        </td>
                        <td className="table-cell text-slate-500">
                          {log.duration}
                        </td>
                        <td className="table-cell text-slate-400 text-xs">
                          {formatRelativeTime(new Date(log.time))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: "Manage Users", icon: Users, color: "blue", href: "/admin/users" },
            { title: "View Billing", icon: DollarSign, color: "emerald", href: "/admin/billing" },
            { title: "API Keys", icon: Database, color: "purple", href: "/admin/api-keys" },
            { title: "Security Logs", icon: AlertTriangle, color: "amber", href: "/admin/security" },
          ].map((action, index) => (
            <Card
              key={index}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              hover
              onClick={() => handleQuickAction(action.href)}
            >
              <div
                className={`w-10 h-10 rounded-lg bg-${action.color}-100 dark:bg-${action.color}-900/30 flex items-center justify-center mb-3`}
              >
                <action.icon
                  className={`h-5 w-5 text-${action.color}-600 dark:text-${action.color}-400`}
                />
              </div>
              <p className="font-medium text-slate-900 dark:text-white">
                {action.title}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
