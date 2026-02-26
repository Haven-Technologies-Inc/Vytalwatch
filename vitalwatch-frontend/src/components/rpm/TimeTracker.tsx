'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Play, Square, Clock, Plus, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { TimeEntry, TimeEntryCategory } from '@/types';

interface TimeTrackerProps {
  patientName: string;
  entries: TimeEntry[];
  totalMinutes: number;
  threshold?: number;
  onStart: (category: TimeEntryCategory) => Promise<TimeEntry>;
  onStop: (id: string) => Promise<TimeEntry>;
  className?: string;
}

const categories: { value: TimeEntryCategory; label: string }[] = [
  { value: 'DATA_REVIEW', label: 'Data Review' },
  { value: 'PATIENT_INTERACTION', label: 'Patient Interaction' },
  { value: 'CHARTING', label: 'Charting' },
  { value: 'CARE_COORDINATION', label: 'Care Coordination' },
  { value: 'DEVICE_SETUP', label: 'Device Setup' },
];

export function TimeTracker({ patientName, entries, totalMinutes, threshold = 20, onStart, onStop, className }: TimeTrackerProps) {
  const [active, setActive] = useState<TimeEntry | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [category, setCategory] = useState<TimeEntryCategory>('DATA_REVIEW');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const running = entries.find(e => !e.endAt);
    if (running) { setActive(running); setSeconds(Math.floor((Date.now() - new Date(running.startAt).getTime()) / 1000)); }
  }, [entries]);

  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(i);
  }, [active]);

  const handleStart = async () => {
    setLoading(true);
    try { const e = await onStart(category); setActive(e); setSeconds(0); } finally { setLoading(false); }
  };

  const handleStop = async () => {
    if (!active) return;
    setLoading(true);
    try { await onStop(active.id); setActive(null); setSeconds(0); } finally { setLoading(false); }
  };

  const pct = Math.min((totalMinutes / threshold) * 100, 100);
  const met = totalMinutes >= threshold;

  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-xl border p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div><h3 className="font-semibold text-slate-900 dark:text-white">Time Tracker</h3><p className="text-sm text-slate-500">{patientName}</p></div>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1"><span>Billing Progress</span><span className={met ? 'text-green-600 font-semibold' : ''}>{totalMinutes}/{threshold} min</span></div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full"><div className={cn('h-full rounded-full', met ? 'bg-green-500' : 'bg-blue-500')} style={{ width: `${pct}%` }} /></div>
        {met && <div className="flex items-center gap-1 mt-1 text-green-600 text-xs"><CheckCircle className="h-3 w-3" />99457 met</div>}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map(c => <button key={c.value} onClick={() => setCategory(c.value)} className={cn('px-3 py-1 rounded text-sm', category === c.value ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-700')}>{c.label}</button>)}
      </div>
      <div className="flex items-center justify-center gap-4 py-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
        <div className={cn('text-4xl font-mono font-bold', active ? 'text-blue-600' : 'text-slate-400')}>{Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')}</div>
        {active ? <Button onClick={handleStop} disabled={loading} className="bg-red-500 hover:bg-red-600"><Square className="h-5 w-5" /></Button> : <Button onClick={handleStart} disabled={loading}><Play className="h-5 w-5" /></Button>}
      </div>
    </div>
  );
}
