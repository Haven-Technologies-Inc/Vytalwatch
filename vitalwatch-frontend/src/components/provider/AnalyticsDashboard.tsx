/**
 * AnalyticsDashboard Component - Provider analytics
 */

'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/shared/StatCard';

export interface AnalyticsDashboardProps {
  stats: any;
  className?: string;
}

export function AnalyticsDashboard({ stats, className }: AnalyticsDashboardProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <BarChart3 className="h-6 w-6" />
        Analytics
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Patients" value={stats?.totalPatients || 0} />
        <StatCard title="Appointments Today" value={stats?.appointmentsToday || 0} />
        <StatCard title="Active Alerts" value={stats?.activeAlerts || 0} />
        <StatCard title="Avg Response Time" value={stats?.avgResponseTime || '0 min'} />
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
