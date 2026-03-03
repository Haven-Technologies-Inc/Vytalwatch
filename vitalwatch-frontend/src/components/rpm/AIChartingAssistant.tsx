'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, FileText, CheckCircle, Edit3, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface SOAPNote { subjective: string; objective: string; assessment: string; plan: string; icd10Codes: string[]; cptCodes: string[]; billingJustification: string; }

export function AIChartingAssistant({ onGenerate, className }: { onGenerate: () => Promise<SOAPNote>; className?: string }) {
  const [note, setNote] = useState<SOAPNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => { setLoading(true); try { const n = await onGenerate(); setNote(n); } finally { setLoading(false); } };
  const copy = () => { if (note) { navigator.clipboard.writeText(Object.values(note).flat().join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2000); } };

  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-xl border p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-500" />AI Charting Assistant</h3>
        {note && <Button variant="outline" size="sm" onClick={copy}>{copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>}
      </div>
      {!note ? (
        <Button onClick={generate} disabled={loading} className="w-full">{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate SOAP Note</Button>
      ) : (
        <div className="space-y-3 text-sm">
          <div><p className="font-medium text-slate-500">Subjective</p><p className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded">{note.subjective}</p></div>
          <div><p className="font-medium text-slate-500">Objective</p><p className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded">{note.objective}</p></div>
          <div><p className="font-medium text-slate-500">Assessment</p><p className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded">{note.assessment}</p></div>
          <div><p className="font-medium text-slate-500">Plan</p><p className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded">{note.plan}</p></div>
          <div className="flex gap-2 flex-wrap">{note.icd10Codes.map(c => <Badge key={c} variant="info">{c}</Badge>)}{note.cptCodes.map(c => <Badge key={c} variant="success">{c}</Badge>)}</div>
        </div>
      )}
    </div>
  );
}
