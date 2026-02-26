'use client';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MonitoringInbox, ClaimsDashboard, TimeTracker, RPMAnalyticsDashboard } from '@/components/rpm';
import { tasksApi } from '@/services/api';
import type { Task, Claim, RPMBillingPeriodSummary } from '@/types';

export default function RPMPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksApi.getAll().then(r => setTasks(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">RPM Monitoring</h1>
          <TimeTracker patientId="" onTimeLogged={() => {}} />
        </div>
        <RPMAnalyticsDashboard />
        <div className="grid lg:grid-cols-2 gap-6">
          <MonitoringInbox tasks={tasks} isLoading={loading} onTaskSelect={() => {}} onTaskComplete={async (id) => { await tasksApi.complete(id, 'user', ''); }} onTaskSnooze={async (id, u) => { await tasksApi.snooze(id, u); }} />
          <ClaimsDashboard claims={[]} summaries={[]} onBuildClaim={async () => ({} as Claim)} onFinalize={async () => {}} onSubmit={async () => {}} />
        </div>
      </div>
    </DashboardLayout>
  );
}
