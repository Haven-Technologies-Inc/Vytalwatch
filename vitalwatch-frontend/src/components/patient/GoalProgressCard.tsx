/**
 * GoalProgressCard Component
 *
 * Health goals tracking with progress bars.
 * @module components/patient/GoalProgressCard
 */

'use client';

import React from 'react';
import { Target, TrendingUp, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/formatters';

export interface HealthGoal {
  id: string;
  title: string;
  description?: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  category: string;
}

export interface GoalProgressCardProps {
  goals: HealthGoal[];
  className?: string;
}

/**
 * GoalProgressCard - Health goals tracking
 */
export function GoalProgressCard({ goals, className }: GoalProgressCardProps) {
  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Health Goals</h3>
      </div>

      <div className="space-y-4">
        {goals.map((goal) => {
          const progress = getProgressPercentage(goal.current, goal.target);
          const isCompleted = progress >= 100;

          return (
            <div key={goal.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{goal.title}</h4>
                    {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </div>
                  {goal.description && (
                    <p className="mt-1 text-sm text-gray-600">{goal.description}</p>
                  )}
                </div>
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                  {goal.category}
                </span>
              </div>

              <div className="mb-2">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium text-gray-900">
                    {goal.current} / {goal.target} {goal.unit}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      getProgressColor(progress)
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{progress.toFixed(0)}% complete</span>
                <span>Due: {formatDate(goal.deadline)}</span>
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            No active goals. Set a goal to get started!
          </p>
        )}
      </div>
    </div>
  );
}

export default GoalProgressCard;
