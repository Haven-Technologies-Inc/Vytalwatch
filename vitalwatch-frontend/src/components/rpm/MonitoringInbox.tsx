'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Filter, Search, Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TaskCard } from './TaskCard';
import type { Task, TaskStatus, TaskPriority, TaskType } from '@/types';

interface MonitoringInboxProps {
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
  onTaskComplete: (taskId: string, resolution?: string) => void;
  onTaskSnooze: (taskId: string, until: string) => void;
  onStartTimer?: (patientId: string, category: string) => void;
  isLoading?: boolean;
  className?: string;
}

const statusTabs: { value: TaskStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'SNOOZED', label: 'Snoozed' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function MonitoringInbox({ tasks, onTaskSelect, onTaskComplete, onTaskSnooze, onStartTimer, isLoading, className }: MonitoringInboxProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && !task.patientName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const urgentCount = tasks.filter(t => t.priority === 'URGENT' && t.status === 'OPEN').length;
  const openCount = tasks.filter(t => t.status === 'OPEN').length;

  const handleSnooze = (taskId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    onTaskSnooze(taskId, tomorrow.toISOString());
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Monitoring Inbox</h2>
          {urgentCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium">
              <Bell className="h-3 w-3" />{urgentCount} Urgent
            </span>
          )}
          <span className="text-sm text-slate-500">{openCount} open tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4 mr-1" />Filters</Button>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-slate-200 dark:border-slate-700">
        {statusTabs.map(tab => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)} className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', statusFilter === tab.value ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>
            {tab.label}
            {tab.value === 'OPEN' && <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">{openCount}</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <Bell className="h-12 w-12 mb-2 opacity-30" /><p>No tasks found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} onSelect={() => onTaskSelect(task)} onComplete={() => onTaskComplete(task.id)} onSnooze={() => handleSnooze(task.id)} onStartTimer={onStartTimer ? () => onStartTimer(task.patientId, task.taskType) : undefined} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
