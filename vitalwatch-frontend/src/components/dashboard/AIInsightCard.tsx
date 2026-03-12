'use client';

import { cn } from '@/lib/utils';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Award, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

type InsightType = 'prediction' | 'recommendation' | 'alert' | 'achievement' | 'trend';

interface AIInsightCardProps {
  type: InsightType;
  title: string;
  description: string;
  confidence?: number;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const insightConfig: Record<InsightType, { 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
}> = {
  prediction: { 
    icon: Brain, 
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  recommendation: { 
    icon: Lightbulb, 
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  alert: { 
    icon: AlertTriangle, 
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  achievement: { 
    icon: Award, 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  trend: { 
    icon: TrendingUp, 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
};

export function AIInsightCard({
  type,
  title,
  description,
  confidence,
  actionLabel,
  onAction,
  className,
}: AIInsightCardProps) {
  const config = insightConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900',
        'transition-all duration-200 hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('rounded-lg p-2', config.bgColor, config.color)}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs capitalize">{type}</Badge>
            {confidence !== undefined && (
              <span className="text-xs text-gray-500">
                {Math.round(confidence * 100)}% confidence
              </span>
            )}
          </div>

          <h4 className="mt-2 font-semibold text-gray-900 dark:text-white">{title}</h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>

          {confidence !== undefined && (
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={cn('h-1.5 rounded-full', config.bgColor.replace('100', '500').replace('900/30', '500'))}
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
            </div>
          )}

          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {actionLabel}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface AIInsightsPanelProps {
  insights: AIInsightCardProps[];
  title?: string;
  className?: string;
}

export function AIInsightsPanel({ insights, title = 'AI Insights', className }: AIInsightsPanelProps) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <Brain className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {(!Array.isArray(insights) || insights.length === 0) ? (
          <div className="p-6 text-center text-gray-500">
            No insights available yet
          </div>
        ) : (
          insights.map((insight, index) => (
            <div key={index} className="p-4">
              <AIInsightCard {...insight} className="border-0 p-0 hover:shadow-none" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
