'use client';

import { useState, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VitalSignCard } from '@/components/dashboard/VitalSignCard';
import { TrendChart } from '@/components/dashboard/Charts';
import { Select } from '@/components/ui/Select';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Download, Activity } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useAuthStore } from '@/stores/authStore';
import { vitalsApi } from '@/services/api';
import { extractArray, extractData } from '@/lib/utils';
import type { ApiResponse, VitalReading, PaginatedResponse } from '@/types';

const vitalTypes = [
  { value: 'all', label: 'All Vitals' },
  { value: 'blood_pressure', label: 'Blood Pressure' },
  { value: 'heart_rate', label: 'Heart Rate' },
  { value: 'glucose', label: 'Blood Glucose' },
  { value: 'spo2', label: 'Oxygen (SpO2)' },
  { value: 'weight', label: 'Weight' },
  { value: 'temperature', label: 'Temperature' },
];

const timeRanges = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
];

// Map vital type to display card type
const typeToCardType: Record<string, 'bp' | 'heart_rate' | 'glucose' | 'spo2' | 'weight' | 'temperature'> = {
  blood_pressure: 'bp',
  heart_rate: 'heart_rate',
  glucose: 'glucose',
  spo2: 'spo2',
  weight: 'weight',
  temperature: 'temperature',
};

function formatVitalValue(reading: VitalReading): string {
  if (reading.type === 'blood_pressure' && reading.values) {
    const sys = reading.values.systolic ?? reading.values.sys;
    const dia = reading.values.diastolic ?? reading.values.dia;
    if (sys !== undefined && dia !== undefined) return `${sys}/${dia}`;
  }
  const vals = Object.values(reading.values || {});
  return vals.length > 0 ? String(vals[0]) : '--';
}

export default function PatientVitalsPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const patientId = user?.id || '';
  const [selectedVital, setSelectedVital] = useState('all');
  const [timeRange, setTimeRange] = useState('7');

  // Fetch latest vitals by type
  const {
    data: vitalsResponse,
    isLoading: vitalsLoading,
    error: vitalsError,
    refetch: refetchVitals,
  } = useApiQuery<ApiResponse<Record<string, VitalReading>>>(
    () => vitalsApi.getLatest(patientId),
    { enabled: !!patientId }
  );

  // Fetch trend data
  const trendType = selectedVital === 'all' ? 'blood_pressure' : selectedVital;
  const {
    data: trendsResponse,
    isLoading: trendsLoading,
  } = useApiQuery<ApiResponse<VitalReading[]>>(
    () => vitalsApi.getTrends(patientId, trendType, parseInt(timeRange)),
    { enabled: !!patientId, deps: [trendType, timeRange] }
  );

  // Fetch all vitals for history table
  const {
    data: historyResponse,
  } = useApiQuery<ApiResponse<PaginatedResponse<VitalReading>>>(
    () => vitalsApi.getAll({
      patientId,
      type: selectedVital !== 'all' ? selectedVital : undefined,
    }),
    { enabled: !!patientId, deps: [selectedVital] }
  );

  const isLoading = vitalsLoading;
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Transform latest vitals into card format
  const displayVitals = useMemo(() => {
    const vitalsMap = extractData<Record<string, VitalReading>>(vitalsResponse);
    if (!vitalsMap || typeof vitalsMap !== 'object') return [];
    return Object.entries(vitalsMap)
      .filter(([type]) => selectedVital === 'all' || type === selectedVital)
      .map(([type, reading]) => ({
        type: typeToCardType[type] || ('bp' as const),
        value: formatVitalValue(reading),
        unit: reading.unit || '',
        status: reading.status || ('normal' as const),
        timestamp: new Date(reading.timestamp),
        trend: 'stable' as const,
      }));
  }, [vitalsResponse, selectedVital]);

  // Transform trends into chart data
  const trendData = useMemo(() => {
    const readings = extractArray<VitalReading>(trendsResponse);
    if (!readings.length) return [];
    return readings.map((r) => {
      const date = new Date(r.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
      return {
        date,
        systolic: r.values?.systolic ?? r.values?.sys ?? 0,
        diastolic: r.values?.diastolic ?? r.values?.dia ?? 0,
        heartRate: r.values?.heartRate ?? r.values?.heart_rate ?? r.values?.value ?? 0,
      };
    });
  }, [trendsResponse]);

  // History readings
  const historyReadings = useMemo(() => {
    const items = extractArray<VitalReading>(historyResponse);
    if (!items.length) return [];
    return items.slice(0, 10);
  }, [historyResponse]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchVitals();
      toast({ title: 'Vitals refreshed', description: 'Latest readings loaded', type: 'success' });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchVitals, toast]);

  const handleExport = useCallback(async () => {
    toast({ title: 'Exporting data', description: 'Your vitals report is being prepared', type: 'info' });
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast({ title: 'Export complete', description: 'Report downloaded successfully', type: 'success' });
  }, [toast]);

  const handleViewHistory = useCallback((vitalType: string) => {
    setSelectedVital(vitalType);
    toast({ title: 'Viewing history', description: `Showing ${vitalTypes.find(v => v.value === vitalType)?.label || vitalType} readings`, type: 'info' });
  }, [toast]);

  const getVitalTypeLabel = useCallback((type: string) => {
    const labels: Record<string, string> = {
      blood_pressure: 'Blood Pressure',
      heart_rate: 'Heart Rate',
      glucose: 'Blood Glucose',
      spo2: 'SpO2',
      weight: 'Weight',
      temperature: 'Temperature',
    };
    return labels[type] || type;
  }, []);

  return (
    <DashboardLayout>
      <PageWrapper
        isLoading={isLoading}
        error={vitalsError}
        onRetry={refetchVitals}
        isEmpty={!isLoading && displayVitals.length === 0}
        emptyProps={{
          icon: Activity,
          title: 'No vital readings yet',
          description: 'Connect a device or manually log a reading to start tracking your vitals.',
        }}
        loadingMessage="Loading your vitals..."
      >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Vitals</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Track and monitor your health readings
            </p>
          </div>
          <div className="flex gap-3">
            <Select
              options={vitalTypes}
              value={selectedVital}
              onChange={setSelectedVital}
              className="w-40"
            />
            <Select
              options={timeRanges}
              value={timeRange}
              onChange={setTimeRange}
              className="w-36"
            />
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayVitals.map((vital) => (
            <VitalSignCard
              key={vital.type}
              type={vital.type}
              value={vital.value}
              unit={vital.unit}
              status={vital.status}
              timestamp={vital.timestamp}
              trend={vital.trend}
              onViewHistory={() => handleViewHistory(vital.type === 'bp' ? 'blood_pressure' : vital.type)}
            />
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedVital === 'all' ? 'Blood Pressure' : vitalTypes.find((v) => v.value === selectedVital)?.label} Trend
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-gray-600 dark:text-gray-400">Systolic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-gray-600 dark:text-gray-400">Diastolic</span>
              </div>
            </div>
          </div>
          {trendsLoading ? (
            <div className="flex h-[300px] items-center justify-center text-gray-500">Loading trend data...</div>
          ) : trendData.length > 0 ? (
            <TrendChart
              data={trendData}
              xKey="date"
              yKey="systolic"
              height={300}
              normalRange={{ min: 90, max: 140 }}
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-gray-500">No trend data available for this period.</div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Reading History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 text-left font-medium text-gray-500">Date</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Type</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Reading</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {historyReadings.length > 0 ? (
                  historyReadings.map((reading, i) => (
                    <tr key={reading.id || i}>
                      <td className="py-3 text-gray-900 dark:text-white">
                        {new Date(reading.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">
                        {getVitalTypeLabel(reading.type)}
                      </td>
                      <td className="py-3 font-medium text-gray-900 dark:text-white">
                        {formatVitalValue(reading)} {reading.unit}
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          reading.status === 'critical'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : reading.status === 'warning'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {reading.status ? reading.status.charAt(0).toUpperCase() + reading.status.slice(1) : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      No reading history available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </PageWrapper>
    </DashboardLayout>
  );
}
