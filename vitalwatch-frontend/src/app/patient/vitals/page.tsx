'use client';

import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VitalSignCard } from '@/components/dashboard/VitalSignCard';
import { TrendChart } from '@/components/dashboard/Charts';
import { Select } from '@/components/ui/Select';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Download, Activity } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

const vitalTypes = [
  { value: 'all', label: 'All Vitals' },
  { value: 'bp', label: 'Blood Pressure' },
  { value: 'heart_rate', label: 'Heart Rate' },
  { value: 'glucose', label: 'Blood Glucose' },
  { value: 'spo2', label: 'Oxygen (SpO2)' },
  { value: 'weight', label: 'Weight' },
  { value: 'temperature', label: 'Temperature' },
];

const timeRanges = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

const mockVitals = [
  { type: 'bp' as const, value: '128/82', unit: 'mmHg', status: 'normal' as const, timestamp: new Date(), trend: 'down' as const },
  { type: 'heart_rate' as const, value: '72', unit: 'bpm', status: 'normal' as const, timestamp: new Date(), trend: 'stable' as const },
  { type: 'glucose' as const, value: '98', unit: 'mg/dL', status: 'normal' as const, timestamp: new Date(), trend: 'stable' as const },
  { type: 'spo2' as const, value: '98', unit: '%', status: 'normal' as const, timestamp: new Date(), trend: 'stable' as const },
  { type: 'weight' as const, value: '165', unit: 'lbs', status: 'normal' as const, timestamp: new Date(), trend: 'down' as const },
  { type: 'temperature' as const, value: '98.6', unit: '°F', status: 'normal' as const, timestamp: new Date(), trend: 'stable' as const },
];

const mockTrendData = [
  { date: 'Mon', systolic: 125, diastolic: 80, heartRate: 72 },
  { date: 'Tue', systolic: 128, diastolic: 82, heartRate: 74 },
  { date: 'Wed', systolic: 130, diastolic: 85, heartRate: 70 },
  { date: 'Thu', systolic: 127, diastolic: 81, heartRate: 73 },
  { date: 'Fri', systolic: 124, diastolic: 79, heartRate: 71 },
  { date: 'Sat', systolic: 126, diastolic: 80, heartRate: 72 },
  { date: 'Sun', systolic: 128, diastolic: 82, heartRate: 74 },
];

export default function PatientVitalsPage() {
  const { toast } = useToast();
  const [selectedVital, setSelectedVital] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Loading / error state -- ready for API integration
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ title: 'Vitals refreshed', description: 'Latest readings loaded', type: 'success' });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast]);

  const handleExport = useCallback(async () => {
    toast({ title: 'Exporting data', description: 'Your vitals report is being prepared', type: 'info' });
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast({ title: 'Export complete', description: 'Report downloaded successfully', type: 'success' });
  }, [toast]);

  const handleViewHistory = useCallback((vitalType: string) => {
    setSelectedVital(vitalType);
    toast({ title: 'Viewing history', description: `Showing ${vitalTypes.find(v => v.value === vitalType)?.label || vitalType} readings`, type: 'info' });
  }, [toast]);

  return (
    <DashboardLayout>
      <PageWrapper
        isLoading={isLoading}
        error={error}
        isEmpty={mockVitals.length === 0}
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
          {mockVitals
            .filter((v) => selectedVital === 'all' || v.type === selectedVital)
            .map((vital) => (
              <VitalSignCard
                key={vital.type}
                type={vital.type}
                value={vital.value}
                unit={vital.unit}
                status={vital.status}
                timestamp={vital.timestamp}
                trend={vital.trend}
                onViewHistory={() => handleViewHistory(vital.type)}
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
          <TrendChart
            data={mockTrendData}
            xKey="date"
            yKey="systolic"
            height={300}
            normalRange={{ min: 90, max: 140 }}
          />
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
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="py-3 text-gray-900 dark:text-white">
                      {new Date(Date.now() - i * 86400000).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">Blood Pressure</td>
                    <td className="py-3 font-medium text-gray-900 dark:text-white">
                      {128 - i}/{82 - i} mmHg
                    </td>
                    <td className="py-3">
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Normal
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </PageWrapper>
    </DashboardLayout>
  );
}
