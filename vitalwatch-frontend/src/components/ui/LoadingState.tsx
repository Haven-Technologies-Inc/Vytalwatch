'use client';

import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { spinner: 'h-6 w-6 border-2', text: 'text-sm', gap: 'gap-2' },
  md: { spinner: 'h-10 w-10 border-3', text: 'text-base', gap: 'gap-3' },
  lg: { spinner: 'h-14 w-14 border-4', text: 'text-lg', gap: 'gap-4' },
};

export function LoadingState({ message, className, size = 'md' }: LoadingStateProps) {
  const sizeStyles = sizeMap[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16',
        sizeStyles.gap,
        className
      )}
      role="status"
      aria-label={message || 'Loading'}
    >
      <div
        className={cn(
          'animate-spin rounded-full border-slate-300 border-t-blue-500 dark:border-slate-600 dark:border-t-blue-400',
          sizeStyles.spinner
        )}
      />
      {message && (
        <p
          className={cn(
            'text-slate-500 dark:text-slate-400 font-medium',
            sizeStyles.text
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
