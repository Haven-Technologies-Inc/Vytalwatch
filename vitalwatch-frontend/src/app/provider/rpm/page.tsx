'use client';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MonitoringInbox, ClaimsDashboard, RPMAnalyticsDashboard } from '@/components/rpm';
import { tasksApi } from '@/services/api';
import type { Task, Claim } from '@/types';

const defaultAnalytics = {
  patients: { total: 0, active: 0, newEnrollments: 0, churned: 0 },
  compliance: { avgReadingDays: 0, avgTimeMinutes: 0, meetingThreshold: 0, atRisk: 0 },
  billing: { totalClaims: 0, submitted: 0, accepted: 0, rejected: 0, totalBilled: 0, totalPaid: 0 },
  alerts: { critical: 0, high: 0, medium: 0, low: 0 },
  tasks: { open: 0, completed: 0, overdue: 0 },
  trends: { readingDaysTrend: [] as number[], timeTrend: [] as number[], claimsTrend: [] as number[] },
};

export default function RPMPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksApi.getAll().then(r => setTasks(r?.data ?? [])).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">RPM Monitoring</h1>
        </div>
        <RPMAnalyticsDashboard data={defaultAnalytics} />
        <div className="grid lg:grid-cols-2 gap-6">
          <MonitoringInbox tasks={tasks} isLoading={loading} onTaskSelect={() => {}} onTaskComplete={async (id) => { await tasksApi.complete(id, 'user', ''); }} onTaskSnooze={async (id, u) => { await tasksApi.snooze(id, u); }} />
          <ClaimsDashboard claims={[]} summaries={[]} onBuildClaim={async () => ({} as Claim)} onFinalize={async () => {}} onSubmit={async () => {}} />
        </div>
      </div>
    </DashboardLayout>
  );
}
