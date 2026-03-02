'use client';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface Step { label: string; status: 'completed' | 'current' | 'pending'; date?: string; }

const getStepStyle = (status: string) => {
  if (status === 'completed') return 'bg-emerald-500 text-white';
  if (status === 'current') return 'bg-blue-500 text-white';
  return 'bg-gray-200 dark:bg-gray-700 text-gray-400';
};

export function OrderTimeline({ steps }: { steps: Step[] }) {
  return (
    <div className="space-y-0">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getStepStyle(s.status)}`}>
              {s.status === 'completed' ? <CheckCircle2 className="h-5 w-5"/> : s.status === 'current' ? <Clock className="h-5 w-5"/> : <Circle className="h-5 w-5"/>}
            </div>
            {i < steps.length - 1 && <div className={`w-0.5 flex-1 min-h-6 ${s.status === 'completed' ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
          </div>
          <div className="pb-6">
            <p className={`font-medium ${s.status === 'pending' ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>{s.label}</p>
            {s.date && <p className="text-sm text-gray-500">{s.date}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
