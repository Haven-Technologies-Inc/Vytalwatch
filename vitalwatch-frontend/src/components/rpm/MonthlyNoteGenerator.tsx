'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, CheckCircle, Edit3, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { AIDraft } from '@/types';

interface Props {
  patientName: string;
  readingDays: number;
  totalMinutes: number;
  draft?: AIDraft;
  onGenerate: () => Promise<AIDraft>;
  onAccept: (id: string, content: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  className?: string;
}

export function MonthlyNoteGenerator({ patientName, readingDays, totalMinutes, draft: initial, onGenerate, onAccept, onReject, className }: Props) {
  const [draft, setDraft] = useState(initial);
  const [content, setContent] = useState(initial?.generatedContent || '');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const ready = readingDays >= 16 && totalMinutes >= 20;

  const generate = async () => { setLoading(true); try { const d = await onGenerate(); setDraft(d); setContent(d.generatedContent); } finally { setLoading(false); } };
  const accept = async () => { if (!draft) return; setLoading(true); try { await onAccept(draft.id, content); } finally { setLoading(false); } };
  const reject = async () => { if (!draft) return; setLoading(true); try { await onReject(draft.id); setDraft(undefined); } finally { setLoading(false); } };

  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-xl border p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-500" /><h3 className="font-semibold">Monthly Note</h3></div>
        <Badge variant={ready ? 'success' : 'warning'}>{ready ? 'Ready' : 'Not Ready'}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded">
        <div><span className="text-xs text-slate-500">Reading Days</span><p className={cn('font-bold', readingDays >= 16 ? 'text-green-600' : 'text-red-500')}>{readingDays}/16</p></div>
        <div><span className="text-xs text-slate-500">Time (min)</span><p className={cn('font-bold', totalMinutes >= 20 ? 'text-green-600' : 'text-red-500')}>{totalMinutes}/20</p></div>
      </div>
      {!draft ? (
        <Button onClick={generate} disabled={loading || !ready} className="w-full">{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate AI Note</Button>
      ) : (
        <div>
          {editing ? <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full h-48 p-3 border rounded-lg text-sm mb-3" /> : <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-sm mb-3 max-h-48 overflow-auto whitespace-pre-wrap">{content}</div>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}><Edit3 className="h-4 w-4 mr-1" />{editing ? 'Preview' : 'Edit'}</Button>
            <Button variant="outline" size="sm" onClick={reject}><X className="h-4 w-4 mr-1" />Reject</Button>
            <Button size="sm" onClick={accept} disabled={loading}><CheckCircle className="h-4 w-4 mr-1" />Accept & Sign</Button>
          </div>
        </div>
      )}
    </div>
  );
}
