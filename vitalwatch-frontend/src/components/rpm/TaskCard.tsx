'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, Phone, FileText, Settings, Calendar, Clock, User, CheckCircle2, ChevronRight, ArrowUpRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Task, TaskType, TaskPriority, TaskStatus } from '@/types';

const taskTypeConfig: Record<TaskType, { icon: React.ElementType; label: string; color: string }> = {
  ALERT_REVIEW: { icon: AlertTriangle, label: 'Alert Review', color: 'text-red-500' },
  OUTREACH: { icon: Phone, label: 'Outreach', color: 'text-blue-500' },
  CHARTING: { icon: FileText, label: 'Charting', color: 'text-purple-500' },
  DEVICE_SETUP: { icon: Settings, label: 'Device Setup', color: 'text-orange-500' },
  MONTHLY_SUMMARY: { icon: Calendar, label: 'Monthly Summary', color: 'text-green-500' },
  ESCALATION: { icon: ArrowUpRight, label: 'Escalation', color: 'text-red-600' },
  FOLLOW_UP: { icon: Clock, label: 'Follow Up', color: 'text-cyan-500' },
};

const priorityConfig: Record<TaskPriority, { label: string; variant: 'danger' | 'warning' | 'info' | 'default' }> = {
  URGENT: { label: 'Urgent', variant: 'danger' },
  HIGH: { label: 'High', variant: 'warning' },
  MEDIUM: { label: 'Medium', variant: 'info' },
  LOW: { label: 'Low', variant: 'default' },
};

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
  SNOOZED: { label: 'Snoozed', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

interface TaskCardProps {
  task: Task;
  onSelect: () => void;
  onComplete: () => void;
  onSnooze: () => void;
  onStartTimer?: () => void;
}

export function TaskCard({ task, onSelect, onComplete, onSnooze, onStartTimer }: TaskCardProps) {
  const typeConfig = taskTypeConfig[task.taskType];
  const TypeIcon = typeConfig.icon;
  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-white dark:bg-slate-800 p-4 transition-all duration-200',
        'hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer',
        task.priority === 'URGENT' && 'border-l-4 border-l-red-500',
        task.priority === 'HIGH' && 'border-l-4 border-l-orange-500',
        task.status === 'COMPLETED' && 'opacity-60'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div className={cn('rounded-lg p-2 bg-slate-100 dark:bg-slate-700', typeConfig.color)}>
          <TypeIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={priority.variant} className="text-xs">{priority.label}</Badge>
            <span className={cn('text-xs px-2 py-0.5 rounded-full', status.color)}>{status.label}</span>
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white truncate">{task.title}</h4>
          {task.patientName && (
            <div className="flex items-center gap-1 mt-1 text-sm text-slate-600 dark:text-slate-400">
              <User className="h-3.5 w-3.5" /><span>{task.patientName}</span>
            </div>
          )}
          {task.description && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{task.description}</p>}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" /><span>{formatRelativeTime(task.createdAt)}</span>
              {task.dueAt && (
                <><span className="mx-1">•</span><span className={cn(new Date(task.dueAt) < new Date() && 'text-red-500 font-medium')}>Due {formatRelativeTime(task.dueAt)}</span></>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onStartTimer && task.status !== 'COMPLETED' && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onStartTimer(); }}><Play className="h-3.5 w-3.5" /></Button>}
              {task.status !== 'COMPLETED' && task.status !== 'SNOOZED' && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onSnooze(); }}><Pause className="h-3.5 w-3.5" /></Button>}
              {task.status !== 'COMPLETED' && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onComplete(); }}><CheckCircle2 className="h-3.5 w-3.5" /></Button>}
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { taskTypeConfig, priorityConfig, statusConfig, formatRelativeTime };
