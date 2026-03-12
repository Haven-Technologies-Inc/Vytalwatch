'use client';

import { useState, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TrendChart, SimpleBarChart, DonutChart } from '@/components/dashboard/Charts';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  Users,
  Activity,
  TrendingUp,
  DollarSign,
  Download,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useApiQuery } from '@/hooks/useApiQuery';
import apiClient from '@/services/api/client';
import { extractData } from '@/lib/utils';

interface AnalyticsOverview {
  data: {
    totalPatients: number;
    patientChange: number;
    readingsThisMonth: number;
    readingsChange: number;
    avgAdherenceRate: number;
    adherenceChange: number;
    monthlyRevenue: number;
    revenueSubtitle: string;
    patientGrowth: Array<{ month: string; patients: number }>;
    readingsData: Array<{ date: string; readings: number }>;
    alertDistribution: Array<{ name: string; value: number; color: string }>;
    conditionBreakdown: Array<{ condition: string; count: number }>;
    adherenceData: Array<{ day: string; adherence: number }>;
    kpis: {
      readmissionRate: number;
      readmissionChange: number;
      avgResponseTime: number;
      responseTimeUnit: string;
      patientSatisfaction: number;
    };
    billingSummary: Array<{
      cptCode: string;
      description: string;
      patientsEligible: number;
      rate: number;
      potentialRevenue: number;
    }>;
    billingTotal: number;
  };
}

const timeRanges = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '12m', label: 'Last 12 Months' },
];

export default function ProviderAnalyticsPage() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('30d');
  const [isExporting, setIsExporting] = useState(false);

  const {
    data: analyticsData,
    isLoading,
    error,
    refetch,
  } = useApiQuery<AnalyticsOverview>(
    () => apiClient.get<AnalyticsOverview>('/analytics/overview', { params: { range: timeRange } }),
    { deps: [timeRange] },
  );

  const d = extractData<AnalyticsOverview['data']>(analyticsData);

  const patientGrowth = d?.patientGrowth ?? [];
  const readingsData = d?.readingsData ?? [];
  const alertDistribution = d?.alertDistribution ?? [];
  const conditionBreakdown = d?.conditionBreakdown ?? [];
  const adherenceData = d?.adherenceData ?? [];
  const kpis = d?.kpis;
  const billingSummary = d?.billingSummary ?? [];
  const billingTotal = d?.billingTotal ?? 0;

  const handleExportReport = useCallback(async () => {
    setIsExporting(true);
    try {
      await apiClient.get('/analytics/export', { params: { format: 'csv', range: timeRange } });
      toast({
        title: 'Report exported',
        description: 'Analytics report has been downloaded',
        type: 'success'
      });
    } catch {
      toast({ title: 'Export failed', description: 'Could not export report', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  }, [toast, timeRange]);

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
        <ErrorState message={error} onRetry={refetch} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Monitor your practice performance and patient outcomes
            </p>
          </div>
          <div className="flex gap-3">
            <Select
              options={timeRanges}
              value={timeRange}
              onChange={setTimeRange}
              className="w-40"
            />
            <Button
              variant="outline"
              onClick={handleExportReport}
              disabled={isExporting}
            >
              {isExporting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isExporting ? 'Exporting...' : 'Export Report'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Patients"
            value={String(d?.totalPatients ?? 0)}
            icon={<Users className="h-5 w-5" />}
            trend={{ direction: 'up', value: `+${d?.patientChange ?? 0} this month`, positive: true }}
          />
          <MetricCard
            title="Readings This Month"
            value={(d?.readingsThisMonth ?? 0).toLocaleString()}
            icon={<Activity className="h-5 w-5" />}
            trend={{ direction: 'up', value: `+${d?.readingsChange ?? 0}% vs last month`, positive: true }}
          />
          <MetricCard
            title="Avg. Adherence Rate"
            value={`${d?.avgAdherenceRate ?? 0}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={{ direction: 'up', value: `+${d?.adherenceChange ?? 0}% vs last month`, positive: true }}
          />
          <MetricCard
            title="Monthly Revenue"
            value={`$${(d?.monthlyRevenue ?? 0).toLocaleString()}`}
            icon={<DollarSign className="h-5 w-5" />}
            subtitle={d?.revenueSubtitle}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Patient Growth
            </h2>
            <SimpleBarChart
              data={patientGrowth}
              xKey="month"
              yKey="patients"
              color="#0066FF"
              height={280}
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Daily Readings
            </h2>
            <TrendChart
              data={readingsData}
              xKey="date"
              yKey="readings"
              type="area"
              color="#00C48C"
              height={280}
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Alert Distribution
            </h2>
            <DonutChart
              data={alertDistribution}
              dataKey="value"
              nameKey="name"
              height={280}
              colors={alertDistribution.map((d) => d.color).length > 0 ? alertDistribution.map((d) => d.color) : ['#EF4444', '#F59E0B', '#3B82F6']}
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Patients by Condition
            </h2>
            <SimpleBarChart
              data={conditionBreakdown}
              xKey="condition"
              yKey="count"
              color="#8B5CF6"
              height={280}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Weekly Adherence
            </h2>
            <SimpleBarChart
              data={adherenceData}
              xKey="day"
              yKey="adherence"
              color="#10B981"
              height={200}
            />
          </div>

          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Key Performance Indicators
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/20">
                <p className="text-sm text-green-600 dark:text-green-400">Readmission Rate</p>
                <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">{kpis?.readmissionRate ?? 0}%</p>
                <p className="mt-1 text-xs text-green-600">{'\u2193'} {kpis?.readmissionChange ?? 0}% from baseline</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
                <p className="text-sm text-blue-600 dark:text-blue-400">Avg. Response Time</p>
                <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{kpis?.avgResponseTime ?? 0} {kpis?.responseTimeUnit ?? 'min'}</p>
                <p className="mt-1 text-xs text-blue-600">To critical alerts</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-950/20">
                <p className="text-sm text-purple-600 dark:text-purple-400">Patient Satisfaction</p>
                <p className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">{kpis?.patientSatisfaction ?? 0}/5</p>
                <p className="mt-1 text-xs text-purple-600">Based on surveys</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Billing Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 text-left font-medium text-gray-500">CPT Code</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Description</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Patients Eligible</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Rate</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Potential Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {billingSummary.map((row) => (
                  <tr key={row.cptCode}>
                    <td className="py-3 font-medium">{row.cptCode}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{row.description}</td>
                    <td className="py-3 text-right">{row.patientsEligible}</td>
                    <td className="py-3 text-right">${row.rate}</td>
                    <td className="py-3 text-right font-medium">${row.potentialRevenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td colSpan={4} className="pt-3 text-right font-semibold">Total Potential:</td>
                  <td className="pt-3 text-right text-lg font-bold text-primary">${billingTotal.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
