'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { DollarSign, CheckCircle, AlertCircle, Clock, FileText, Send, Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Claim, ClaimStatus, RPMBillingPeriodSummary } from '@/types';

interface ClaimsDashboardProps {
  claims: Claim[];
  summaries: RPMBillingPeriodSummary[];
  onBuildClaim: (summary: RPMBillingPeriodSummary) => Promise<Claim>;
  onFinalize: (claimId: string) => Promise<void>;
  onSubmit: (claimId: string) => Promise<void>;
  className?: string;
}

const statusConfig: Record<ClaimStatus, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: FileText },
  READY: { label: 'Ready', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  SUBMITTED: { label: 'Submitted', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  APPEALED: { label: 'Appealed', color: 'bg-orange-100 text-orange-700', icon: Clock },
};

const codeLabels: Record<string, string> = { '99453': 'Setup', '99454': 'Device', '99457': '20min', '99458': '+20min' };

export function ClaimsDashboard({ claims, summaries, onBuildClaim, onFinalize, onSubmit, className }: ClaimsDashboardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'claims'>('pending');

  const pendingSummaries = summaries.filter(s => !s.claimId);
  const readyClaims = claims.filter(c => c.status === 'READY');
  const totalReady = readyClaims.length;
  const totalPaid = claims.filter(c => c.status === 'ACCEPTED').reduce((sum, c) => sum + (c.paidAmount || 0), 0);

  const build = async (s: RPMBillingPeriodSummary) => { setLoading(s.enrollmentId); try { await onBuildClaim(s); } finally { setLoading(null); } };
  const finalize = async (id: string) => { setLoading(id); try { await onFinalize(id); } finally { setLoading(null); } };
  const submit = async (id: string) => { setLoading(id); try { await onSubmit(id); } finally { setLoading(null); } };

  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-xl border', className)}>
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-500" />Claims Dashboard</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg"><p className="text-xs text-slate-500">Pending Build</p><p className="text-2xl font-bold">{pendingSummaries.length}</p></div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><p className="text-xs text-slate-500">Ready to Submit</p><p className="text-2xl font-bold text-blue-600">{totalReady}</p></div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"><p className="text-xs text-slate-500">Total Paid</p><p className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</p></div>
        </div>
      </div>
      <div className="border-b flex">
        <button onClick={() => setTab('pending')} className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px', tab === 'pending' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500')}>Pending ({pendingSummaries.length})</button>
        <button onClick={() => setTab('claims')} className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px', tab === 'claims' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500')}>Claims ({claims.length})</button>
      </div>
      <div className="p-4 max-h-96 overflow-auto">
        {tab === 'pending' ? (
          pendingSummaries.length === 0 ? <p className="text-center text-slate-500 py-8">No pending billing periods</p> : (
            <div className="space-y-3">{pendingSummaries.map(s => (
              <div key={s.enrollmentId} className="p-4 border rounded-lg flex items-center justify-between">
                <div><p className="font-medium">{s.patientName}</p><p className="text-sm text-slate-500">{s.readingDaysCount} days • {s.totalMinutes} min</p><div className="flex gap-1 mt-1">{s.eligibleCodes.map(c => <Badge key={c} variant="info" className="text-xs">{codeLabels[c] || c}</Badge>)}</div></div>
                <Button size="sm" onClick={() => build(s)} disabled={loading === s.enrollmentId}>{loading === s.enrollmentId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Build Claim'}</Button>
              </div>
            ))}</div>
          )
        ) : (
          claims.length === 0 ? <p className="text-center text-slate-500 py-8">No claims</p> : (
            <div className="space-y-3">{claims.map(c => {
              const cfg = statusConfig[c.status];
              return (
                <div key={c.id} className="p-4 border rounded-lg flex items-center justify-between">
                  <div><p className="font-medium">{c.patientName}</p><p className="text-sm text-slate-500">{new Date(c.periodStart).toLocaleDateString()} - {new Date(c.periodEnd).toLocaleDateString()}</p><Badge className={cn('mt-1', cfg.color)}>{cfg.label}</Badge></div>
                  <div className="flex gap-2">
                    {c.status === 'DRAFT' && <Button size="sm" variant="outline" onClick={() => finalize(c.id)} disabled={loading === c.id}>Finalize</Button>}
                    {c.status === 'READY' && <Button size="sm" onClick={() => submit(c.id)} disabled={loading === c.id}><Send className="h-4 w-4 mr-1" />Submit</Button>}
                  </div>
                </div>
              );
            })}</div>
          )
        )}
      </div>
    </div>
  );
}
