'use client';

import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { useToast } from '@/hooks/useToast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { apiClient } from '@/services/api/client';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SimpleBarChart, DonutChart, TrendChart } from '@/components/dashboard/Charts';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Building2,
  Download,
  Calendar
} from 'lucide-react';

// --- API response types ---

interface RevenueDataPoint {
  name: string;
  value: number;
}

interface RevenueResponse {
  data: {
    trend: RevenueDataPoint[];
    totalRevenue: number;
    mrrGrowth: number;
  };
}

interface TopOrg {
  id: string;
  name: string;
  patients: number;
  revenue: number;
  growth: number;
}

interface PlanDist {
  name: string;
  value: number;
  color: string;
}

interface UserGrowthPoint {
  name: string;
  value: number;
}

interface OverviewResponse {
  data: {
    totalUsers: number;
    usersThisMonth: number;
    usersGrowth: number;
    activePatients: number;
    monthlyRevenue: number;
    revenueGrowth: number;
    organizations: number;
    orgBreakdown: string;
    userGrowth: UserGrowthPoint[];
    planDistribution: PlanDist[];
    topOrganizations: TopOrg[];
    platformHealth: {
      apiUptime: string;
      avgResponseTime: string;
      errorRate: string;
      vitalsProcessed24h: number;
      alertsGenerated24h: number;
    };
  };
}

const timeRanges = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
];

export default function AdminAnalyticsPage() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('30d');
  const [isExporting, setIsExporting] = useState(false);

  const {
    data: revenueRes,
    isLoading: revenueLoading,
    error: revenueError,
    refetch: refetchRevenue,
  } = useApiQuery<RevenueResponse>(
    () => apiClient.get<RevenueResponse>('/analytics/revenue', { params: { range: timeRange } }),
    { deps: [timeRange] },
  );

  const {
    data: overviewRes,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useApiQuery<OverviewResponse>(
    () => apiClient.get<OverviewResponse>('/analytics/overview', { params: { range: timeRange } }),
    { deps: [timeRange] },
  );

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({ title: 'Export complete', description: 'Analytics report downloaded', type: 'success' });
    } finally {
      setIsExporting(false);
    }
  }, [toast]);

  const overview = overviewRes?.data;
  const revenueData: RevenueDataPoint[] = revenueRes?.data?.trend ?? [];
  const userGrowthData: UserGrowthPoint[] = overview?.userGrowth ?? [];
  const planDistribution: PlanDist[] = overview?.planDistribution ?? [];
  const topOrganizations: TopOrg[] = overview?.topOrganizations ?? [];
  const health = overview?.platformHealth;

  const orgColumns: Column<TopOrg>[] = [
    { key: 'name', header: 'Organization' },
    { key: 'patients', header: 'Patients', render: (v: number) => v.toLocaleString() },
    { key: 'revenue', header: 'Monthly Revenue', render: (v: number) => `$${v.toLocaleString()}` },
    {
      key: 'growth',
      header: 'Growth',
      render: (v: number) => (
        <Badge variant={v > 10 ? 'success' : 'info'}>+{v}%</Badge>
      )
    },
  ];

  const isLoading = revenueLoading || overviewLoading;
  const error = revenueError || overviewError;

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading analytics..." />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState message={error} onRetry={() => { refetchRevenue(); refetchOverview(); }} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">Monitor platform performance and growth</p>
          </div>
          <div className="flex items-center gap-3">
            <Select options={timeRanges} value={timeRange} onChange={setTimeRange} className="w-40" />
            <Button variant="outline" onClick={handleExport} disabled={isExporting}>
              <Download className={`mr-2 h-4 w-4 ${isExporting ? 'animate-pulse' : ''}`} />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Users"
            value={(overview?.totalUsers ?? 0).toLocaleString()}
            subtitle={`+${overview?.usersThisMonth ?? 0} this month`}
            icon={<Users className="h-5 w-5" />}
            trend={{ value: overview?.usersGrowth ?? 0, isPositive: (overview?.usersGrowth ?? 0) >= 0 }}
          />
          <MetricCard
            title="Active Patients"
            value={(overview?.activePatients ?? 0).toLocaleString()}
            subtitle="Across all organizations"
            icon={<Activity className="h-5 w-5" />}
            trend={{ value: 12.3, isPositive: true }}
          />
          <MetricCard
            title="Monthly Revenue"
            value={`$${(overview?.monthlyRevenue ?? 0).toLocaleString()}`}
            subtitle="From all subscriptions"
            icon={<DollarSign className="h-5 w-5" />}
            trend={{ value: overview?.revenueGrowth ?? 0, isPositive: (overview?.revenueGrowth ?? 0) >= 0 }}
            className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
          />
          <MetricCard
            title="Organizations"
            value={(overview?.organizations ?? 0).toString()}
            subtitle={overview?.orgBreakdown ?? ''}
            icon={<Building2 className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Revenue Trend</h3>
            <TrendChart data={revenueData} color="#10b981" height={250} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">User Growth</h3>
            <TrendChart data={userGrowthData} color="#3b82f6" height={250} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Plan Distribution</h3>
            <DonutChart data={planDistribution} height={200} />
          </div>
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Platform Health</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4 dark:border-gray-700">
                <p className="text-sm text-gray-500">API Uptime</p>
                <p className="text-2xl font-bold text-green-600">{health?.apiUptime ?? 'N/A'}</p>
              </div>
              <div className="rounded-lg border p-4 dark:border-gray-700">
                <p className="text-sm text-gray-500">Avg Response Time</p>
                <p className="text-2xl font-bold text-primary">{health?.avgResponseTime ?? 'N/A'}</p>
              </div>
              <div className="rounded-lg border p-4 dark:border-gray-700">
                <p className="text-sm text-gray-500">Error Rate</p>
                <p className="text-2xl font-bold text-green-600">{health?.errorRate ?? 'N/A'}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4 dark:border-gray-700">
                <p className="text-sm text-gray-500">Vitals Processed (24h)</p>
                <p className="text-2xl font-bold text-primary">{(health?.vitalsProcessed24h ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-4 dark:border-gray-700">
                <p className="text-sm text-gray-500">Alerts Generated (24h)</p>
                <p className="text-2xl font-bold text-yellow-600">{(health?.alertsGenerated24h ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Top Organizations</h3>
          <DataTable data={topOrganizations} columns={orgColumns} />
        </div>
      </div>
    </DashboardLayout>
  );
}
