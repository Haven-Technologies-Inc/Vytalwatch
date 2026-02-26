'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FileDown, FileText, Loader2, CheckCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Claim { id: string; patientName?: string; codes?: { code: string; charge?: number }[]; }

export function ClaimsExportPanel({ claims, onExport837P, onExportAuditBundle, className }: { claims: Claim[]; onExport837P: (ids: string[]) => Promise<Blob>; onExportAuditBundle: (id: string) => Promise<Blob>; className?: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const selectAll = () => setSelected(claims.map(c => c.id));

  const export837P = async () => {
    if (!selected.length) return;
    setLoading('837p');
    try { const blob = await onExport837P(selected); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = '837P_export.edi'; a.click(); }
    finally { setLoading(null); }
  };

  const exportBundle = async (id: string) => {
    setLoading(id);
    try { const blob = await onExportAuditBundle(id); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'audit_bundle_' + id + '.pdf'; a.click(); }
    finally { setLoading(null); }
  };

  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-xl border p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><FileDown className="h-5 w-5 text-blue-500" />Claims Export</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
          <Button size="sm" onClick={export837P} disabled={!selected.length || loading === '837p'}>{loading === '837p' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}Export 837P</Button>
        </div>
      </div>
      <div className="space-y-2 max-h-64 overflow-auto">
        {claims.map(c => (
          <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} className="rounded" />
              <span>{c.patientName || c.id}</span>
            </label>
            <Button variant="ghost" size="sm" onClick={() => exportBundle(c.id)} disabled={loading === c.id}>{loading === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
