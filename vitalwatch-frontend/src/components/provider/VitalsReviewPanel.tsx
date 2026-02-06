/**
 * VitalsReviewPanel Component - Review patient vitals
 * @module components/provider/VitalsReviewPanel
 */

'use client';

import React from 'react';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVital, formatDate, getVitalStatusColor } from '@/utils/formatters';

export interface Vital {
  id: string;
  type: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  timestamp: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface VitalsReviewPanelProps {
  vitals: Vital[];
  patientName: string;
  className?: string;
}

export function VitalsReviewPanel({ vitals, patientName, className }: VitalsReviewPanelProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Latest Vitals - {patientName}</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vitals.map((vital) => (
          <div key={vital.id} className={cn('rounded-lg border p-4', getVitalStatusColor(vital.status))}>
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-5 w-5" />
              {vital.trend && (vital.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />)}
            </div>
            <p className="text-sm font-medium uppercase">{vital.type.replace('_', ' ')}</p>
            <p className="text-2xl font-bold">{formatVital(vital.type, vital.value)}</p>
            <p className="text-xs text-gray-600">{formatDate(vital.timestamp, 'MMM dd, h:mm a')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VitalsReviewPanel;
