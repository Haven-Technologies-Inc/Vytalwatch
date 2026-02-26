'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Clock, User, AlertTriangle, CheckCircle, Play, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { taskTypeConfig, priorityConfig, statusConfig } from './TaskCard';
import type { Task } from '@/types';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onComplete: (resolution?: string) => Promise<void>;
  onStartTimer: () => void;
  onViewPatient: () => void;
}

export function TaskDetailModal({ task, onClose, onComplete, onStartTimer, onViewPatient }: TaskDetailModalProps) {
  const [resolution, setResolution] = useState('');
  const [loading, setLoading] = useState(false);

  const typeConfig = taskTypeConfig[task.taskType];
  const TypeIcon = typeConfig.icon;
  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];

  const handleComplete = async () => {
    setLoading(true);
    try { await onComplete(resolution || undefined); onClose(); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-slate-100 dark:bg-slate-700', typeConfig.color)}><TypeIcon className="h-5 w-5" /></div>
            <div><Badge variant={priority.variant}>{priority.label}</Badge><span className={cn('ml-2 text-xs px-2 py-0.5 rounded-full', status.color)}>{status.label}</span></div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-2">{task.title}</h2>
          {task.patientName && (
            <button onClick={onViewPatient} className="flex items-center gap-2 text-blue-600 hover:underline mb-4">
              <User className="h-4 w-4" />{task.patientName}
            </button>
          )}
          {task.description && <p className="text-slate-600 dark:text-slate-400 mb-4">{task.description}</p>}
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg mb-4">
            <div><span className="text-xs text-slate-500">Created</span><p className="text-sm font-medium">{new Date(task.createdAt).toLocaleString()}</p></div>
            {task.dueAt && <div><span className="text-xs text-slate-500">Due</span><p className={cn('text-sm font-medium', new Date(task.dueAt) < new Date() && 'text-red-500')}>{new Date(task.dueAt).toLocaleString()}</p></div>}
          </div>
          {task.status !== 'COMPLETED' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Resolution Notes</label>
              <textarea value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Add notes about how this task was resolved..." className="w-full p-3 border rounded-lg text-sm h-24" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between p-4 border-t bg-slate-50 dark:bg-slate-900/50">
          <Button variant="outline" onClick={onStartTimer}><Play className="h-4 w-4 mr-1" />Start Timer</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {task.status !== 'COMPLETED' && <Button onClick={handleComplete} disabled={loading}><CheckCircle className="h-4 w-4 mr-1" />Complete</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
