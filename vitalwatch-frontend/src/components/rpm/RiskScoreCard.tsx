'use client';
import { cn } from '@/lib/utils';
import { AlertTriangle, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface RiskScore { overallScore: number; riskLevel: 'LOW'|'MODERATE'|'HIGH'|'CRITICAL'; factors: { name: string; score: number }[]; predictions: { event: string; probability: number }[]; recommendations: string[]; }

const levelConfig = { LOW: { color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' }, MODERATE: { color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50' }, HIGH: { color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' }, CRITICAL: { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' } };

export function RiskScoreCard({ score, className }: { score: RiskScore; className?: string }) {
  const cfg = levelConfig[score.riskLevel];
  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-xl border p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><Shield className="h-5 w-5" />Risk Assessment</h3>
        <Badge className={cn(cfg.bg, cfg.text)}>{score.riskLevel}</Badge>
      </div>
      <div className="flex items-center justify-center mb-4">
        <div className={cn('w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold', cfg.color)}>{score.overallScore}</div>
      </div>
      <div className="space-y-2 mb-4">{score.factors.slice(0,3).map(f => <div key={f.name} className="flex justify-between text-sm"><span>{f.name}</span><span className="font-medium">{f.score}%</span></div>)}</div>
      {score.predictions.length > 0 && <div className="border-t pt-3"><p className="text-xs text-slate-500 mb-2">Predictions</p>{score.predictions.map(p => <div key={p.event} className="flex justify-between text-sm"><span>{p.event}</span><span>{Math.round(p.probability*100)}%</span></div>)}</div>}
    </div>
  );
}
