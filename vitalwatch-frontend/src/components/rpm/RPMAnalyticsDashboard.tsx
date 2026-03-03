'use client';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Users, Clock, FileText, AlertTriangle, Activity, DollarSign } from 'lucide-react';

interface RPMAnalytics {
  patients: { total: number; active: number; newEnrollments: number; churned: number };
  compliance: { avgReadingDays: number; avgTimeMinutes: number; meetingThreshold: number; atRisk: number };
  billing: { totalClaims: number; submitted: number; accepted: number; rejected: number; totalBilled: number; totalPaid: number };
  tasks: { open: number; completed: number; overdue: number };
  trends: { readingDaysTrend: number[]; timeTrend: number[]; claimsTrend: number[] };
}

function StatCard({ icon: Icon, label, value, subValue, trend, color }: { icon: any; label: string; value: string | number; subValue?: string; trend?: number; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={'p-2 rounded-lg ' + color}><Icon className="h-5 w-5 text-white" /></div>
        {trend !== undefined && (
          <div className={'flex items-center text-sm ' + (trend >= 0 ? 'text-green-600' : 'text-red-600')}>
            {trend >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
      {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
    </div>
  );
}

export function RPMAnalyticsDashboard({ data, className }: { data: RPMAnalytics; className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <h2 className="text-xl font-semibold">RPM Analytics Dashboard</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active Patients" value={data.patients.active} subValue={'+' + data.patients.newEnrollments + ' new'} trend={5} color="bg-blue-500" />
        <StatCard icon={Activity} label="Avg Reading Days" value={data.compliance.avgReadingDays} subValue={'/' + '16 threshold'} trend={3} color="bg-green-500" />
        <StatCard icon={Clock} label="Avg Time (min)" value={data.compliance.avgTimeMinutes} subValue={'/20 threshold'} trend={8} color="bg-purple-500" />
        <StatCard icon={AlertTriangle} label="At Risk" value={data.compliance.atRisk} subValue="Needs attention" color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Claims" value={data.billing.totalClaims} subValue={data.billing.submitted + ' submitted'} color="bg-indigo-500" />
        <StatCard icon={FileText} label="Accepted" value={data.billing.accepted} trend={12} color="bg-emerald-500" />
        <StatCard icon={DollarSign} label="Total Billed" value={'$' + data.billing.totalBilled.toLocaleString()} color="bg-cyan-500" />
        <StatCard icon={DollarSign} label="Total Paid" value={'$' + data.billing.totalPaid.toLocaleString()} trend={15} color="bg-teal-500" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border p-4">
          <p className="font-medium mb-2">Open Tasks</p>
          <p className="text-3xl font-bold text-blue-600">{data.tasks.open}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border p-4">
          <p className="font-medium mb-2">Completed</p>
          <p className="text-3xl font-bold text-green-600">{data.tasks.completed}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border p-4">
          <p className="font-medium mb-2">Overdue</p>
          <p className="text-3xl font-bold text-red-600">{data.tasks.overdue}</p>
        </div>
      </div>
    </div>
  );
}
