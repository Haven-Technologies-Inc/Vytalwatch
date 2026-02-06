/**
 * RiskScoreCircle Component
 *
 * Circular risk score display with color coding.
 * @module components/shared/RiskScoreCircle
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { getRiskScoreColor, getRiskScoreBgColor } from '@/utils/formatters';

export interface RiskScoreCircleProps {
  /**
   * Risk score (0-100)
   */
  score: number;

  /**
   * Size of the circle
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Show label below
   */
  showLabel?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const sizeClasses = {
  sm: 'h-12 w-12 text-sm',
  md: 'h-16 w-16 text-base',
  lg: 'h-24 w-24 text-xl',
  xl: 'h-32 w-32 text-2xl',
};

/**
 * RiskScoreCircle - Display risk score in circular format
 *
 * @example
 * ```tsx
 * <RiskScoreCircle score={75} size="lg" showLabel />
 * ```
 */
export function RiskScoreCircle({
  score,
  size = 'md',
  showLabel = false,
  className,
}: RiskScoreCircleProps) {
  const normalizedScore = Math.min(100, Math.max(0, score));
  const circumference = 2 * Math.PI * 45; // radius = 45
  const offset = circumference - (normalizedScore / 100) * circumference;

  const getRiskLabel = (score: number) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  const strokeColor = () => {
    if (score >= 80) return 'stroke-red-500';
    if (score >= 60) return 'stroke-orange-500';
    if (score >= 40) return 'stroke-yellow-500';
    return 'stroke-green-500';
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        <svg className="h-full w-full -rotate-90 transform">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            className="fill-none stroke-gray-200"
            strokeWidth="10%"
          />
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            className={cn('fill-none transition-all duration-500', strokeColor())}
            strokeWidth="10%"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', getRiskScoreColor(score))}>
            {normalizedScore}
          </span>
        </div>
      </div>

      {showLabel && (
        <div className="mt-2 text-center">
          <p className={cn('text-sm font-medium', getRiskScoreColor(score))}>
            {getRiskLabel(normalizedScore)}
          </p>
          <p className="text-xs text-gray-500">Risk Score</p>
        </div>
      )}
    </div>
  );
}

export default RiskScoreCircle;
