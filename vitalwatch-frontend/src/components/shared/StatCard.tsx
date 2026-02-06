/**
 * StatCard Component
 *
 * Metric display card with trend indicator.
 * @module components/shared/StatCard
 */

'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  /**
   * Card title
   */
  title: string;

  /**
   * Main value to display
   */
  value: string | number;

  /**
   * Optional icon
   */
  icon?: React.ReactNode;

  /**
   * Change/trend information
   */
  change?: {
    value: number;
    label?: string;
    trend?: 'up' | 'down' | 'neutral';
  };

  /**
   * Additional description
   */
  description?: string;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * StatCard - Display metric with trend
 *
 * @example
 * ```tsx
 * <StatCard
 *   title="Total Patients"
 *   value={1234}
 *   change={{ value: 12.5, trend: 'up', label: 'vs last month' }}
 *   icon={<UsersIcon />}
 * />
 * ```
 */
export function StatCard({
  title,
  value,
  icon,
  change,
  description,
  loading = false,
  className,
}: StatCardProps) {
  const getTrendIcon = () => {
    if (!change?.trend) return null;

    switch (change.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      case 'neutral':
        return <Minus className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    if (!change?.trend) return 'text-gray-600';

    switch (change.trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {icon && (
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
        ) : (
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        )}
      </div>

      {change && !loading && (
        <div className="mt-2 flex items-center gap-1 text-sm">
          <span className={cn('flex items-center gap-0.5', getTrendColor())}>
            {getTrendIcon()}
            <span className="font-medium">{change.value}%</span>
          </span>
          {change.label && (
            <span className="text-gray-500">{change.label}</span>
          )}
        </div>
      )}

      {description && !loading && (
        <p className="mt-2 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

export default StatCard;
