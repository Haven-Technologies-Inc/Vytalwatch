/**
 * VitalsHistoryChart Component
 *
 * Time-series chart for vitals using Recharts.
 * @module components/patient/VitalsHistoryChart
 */

'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TrendingUp } from 'lucide-react';

export interface VitalReading {
  timestamp: string;
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
  temperature?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
}

export interface VitalsHistoryChartProps {
  /**
   * Vital readings data
   */
  data: VitalReading[];

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Height of the chart
   */
  height?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

type VitalType = 'heartRate' | 'bloodPressure' | 'temperature' | 'oxygenSaturation' | 'respiratoryRate';

/**
 * VitalsHistoryChart - Time-series chart for vitals
 *
 * @example
 * ```tsx
 * <VitalsHistoryChart data={vitalsData} loading={false} />
 * ```
 */
export function VitalsHistoryChart({
  data,
  loading = false,
  height = 400,
  className,
}: VitalsHistoryChartProps) {
  const [selectedVital, setSelectedVital] = useState<VitalType>('heartRate');

  const vitalOptions: { value: VitalType; label: string; color: string }[] = [
    { value: 'heartRate', label: 'Heart Rate', color: '#ef4444' },
    { value: 'bloodPressure', label: 'Blood Pressure', color: '#3b82f6' },
    { value: 'temperature', label: 'Temperature', color: '#f97316' },
    { value: 'oxygenSaturation', label: 'Oxygen Saturation', color: '#06b6d4' },
    { value: 'respiratoryRate', label: 'Respiratory Rate', color: '#10b981' },
  ];

  if (loading) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
        <LoadingSpinner center text="Loading chart data..." />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
        <EmptyState
          icon={<TrendingUp className="h-12 w-12" />}
          title="No vitals data"
          description="No vital readings available for the selected period"
        />
      </div>
    );
  }

  const renderChart = () => {
    switch (selectedVital) {
      case 'bloodPressure':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => format(new Date(value), 'MM/dd')}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy HH:mm')}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="systolic"
                stroke="#3b82f6"
                name="Systolic"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="diastolic"
                stroke="#06b6d4"
                name="Diastolic"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        const option = vitalOptions.find((o) => o.value === selectedVital);
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => format(new Date(value), 'MM/dd')}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy HH:mm')}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={selectedVital}
                stroke={option?.color}
                name={option?.label}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Vitals History</h3>
        <select
          value={selectedVital}
          onChange={(e) => setSelectedVital(e.target.value as VitalType)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {vitalOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {renderChart()}
    </div>
  );
}

export default VitalsHistoryChart;
