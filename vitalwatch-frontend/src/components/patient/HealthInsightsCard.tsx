/**
 * HealthInsightsCard Component
 *
 * AI-generated health insights card.
 * @module components/patient/HealthInsightsCard
 */

'use client';

import React from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';

export interface HealthInsight {
  id: string;
  type: 'positive' | 'warning' | 'neutral';
  title: string;
  message: string;
  metric?: string;
  trend?: 'up' | 'down' | 'stable';
  recommendation?: string;
  createdAt: string;
}

export interface HealthInsightsCardProps {
  insights: HealthInsight[];
  className?: string;
}

/**
 * HealthInsightsCard - AI-generated insights
 */
export function HealthInsightsCard({ insights, className }: HealthInsightsCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'positive': return TrendingUp;
      case 'warning': return TrendingDown;
      default: return Activity;
    }
  };

  const getVariant = (type: string) => {
    switch (type) {
      case 'positive': return 'success';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900">Health Insights</h3>
      </div>

      <div className="space-y-4">
        {insights.map((insight) => {
          const Icon = getIcon(insight.type);
          return (
            <div key={insight.id} className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'rounded-full p-2',
                  insight.type === 'positive' && 'bg-green-100',
                  insight.type === 'warning' && 'bg-yellow-100',
                  insight.type === 'neutral' && 'bg-blue-100'
                )}>
                  <Icon className={cn(
                    'h-4 w-4',
                    insight.type === 'positive' && 'text-green-600',
                    insight.type === 'warning' && 'text-yellow-600',
                    insight.type === 'neutral' && 'text-blue-600'
                  )} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    {insight.metric && (
                      <StatusBadge variant={getVariant(insight.type) as any} size="sm">
                        {insight.metric}
                      </StatusBadge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{insight.message}</p>
                  {insight.recommendation && (
                    <p className="mt-2 text-sm font-medium text-blue-600">
                      💡 {insight.recommendation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {insights.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-500">
            No insights available yet
          </p>
        )}
      </div>
    </div>
  );
}

export default HealthInsightsCard;
