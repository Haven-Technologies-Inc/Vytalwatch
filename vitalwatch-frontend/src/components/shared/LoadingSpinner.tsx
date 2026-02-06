/**
 * LoadingSpinner Component
 *
 * Loading spinner with different sizes and variants.
 * @module components/shared/LoadingSpinner
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Variant of the spinner
   */
  variant?: 'primary' | 'white' | 'gray';

  /**
   * Additional text to display
   */
  text?: string;

  /**
   * Whether to center the spinner
   */
  center?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const variantClasses = {
  primary: 'border-blue-600',
  white: 'border-white',
  gray: 'border-gray-600',
};

/**
 * LoadingSpinner - Display loading state
 *
 * @example
 * ```tsx
 * <LoadingSpinner />
 * <LoadingSpinner size="lg" text="Loading..." />
 * <LoadingSpinner center />
 * ```
 */
export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  text,
  center = false,
  className,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (text) {
    return (
      <div
        className={cn(
          'flex items-center gap-2',
          center && 'justify-center'
        )}
      >
        {spinner}
        <span className="text-sm text-gray-600">{text}</span>
      </div>
    );
  }

  if (center) {
    return (
      <div className="flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Full page loading spinner
 */
export function FullPageLoader({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="text-center">
        <LoadingSpinner size="xl" />
        {text && <p className="mt-4 text-lg text-gray-600">{text}</p>}
      </div>
    </div>
  );
}

export default LoadingSpinner;
