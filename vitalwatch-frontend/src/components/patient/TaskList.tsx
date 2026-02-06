/**
 * TaskList Component
 *
 * Patient tasks with completion tracking.
 * @module components/patient/TaskList
 */

'use client';

import React from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

export interface TaskListProps {
  tasks: Task[];
  onToggleComplete?: (id: string) => void;
  className?: string;
}

/**
 * TaskList - Patient tasks with completion tracking
 *
 * @example
 * ```tsx
 * <TaskList tasks={tasks} onToggleComplete={handleToggle} />
 * ```
 */
export function TaskList({ tasks, onToggleComplete, className }: TaskListProps) {
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const isOverdue = (dueDate: string, completed: boolean) => {
    if (completed) return false;
    return new Date(dueDate) < new Date();
  };

  if (tasks.length === 0) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
        <EmptyState
          icon={<CheckCircle2 className="h-12 w-12" />}
          title="All caught up!"
          description="You have no pending tasks"
        />
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">My Tasks</h3>
      <div className="space-y-3">
        {sortedTasks.map((task) => {
          const overdue = isOverdue(task.dueDate, task.completed);
          return (
            <div
              key={task.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-4 transition-all',
                task.completed
                  ? 'border-gray-200 bg-gray-50 opacity-60'
                  : overdue
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-white hover:shadow-md'
              )}
            >
              <button
                onClick={() => onToggleComplete?.(task.id)}
                className="mt-0.5 transition-colors"
              >
                {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400 hover:text-blue-600" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className={cn(
                    'font-medium',
                    task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                  )}>
                    {task.title}
                  </h4>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge variant={getPriorityColor(task.priority) as any} size="sm">
                      {task.priority}
                    </StatusBadge>
                    {overdue && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>

                {task.description && (
                  <p className="mt-1 text-sm text-gray-600">{task.description}</p>
                )}

                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Due: {formatDate(task.dueDate)}
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                    {task.category}
                  </span>
                </div>

                {task.completed && task.completedAt && (
                  <p className="mt-2 text-xs text-green-600">
                    Completed on {formatDate(task.completedAt)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TaskList;
