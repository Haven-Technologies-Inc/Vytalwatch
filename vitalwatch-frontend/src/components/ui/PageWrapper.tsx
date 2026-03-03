'use client';

import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState, type EmptyStateProps } from './EmptyState';
import { cn } from '@/lib/utils';

interface PageWrapperProps {
  isLoading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyProps?: EmptyStateProps;
  onRetry?: () => void;
  loadingMessage?: string;
  className?: string;
  children: React.ReactNode;
}

export function PageWrapper({
  isLoading,
  error,
  isEmpty,
  emptyProps,
  onRetry,
  loadingMessage,
  className,
  children,
}: PageWrapperProps) {
  if (isLoading) {
    return (
      <div className={cn('min-h-[400px] flex items-center justify-center', className)}>
        <LoadingState message={loadingMessage || 'Loading...'} size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('min-h-[400px] flex items-center justify-center', className)}>
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (isEmpty && emptyProps) {
    return (
      <div className={cn('min-h-[400px] flex items-center justify-center', className)}>
        <EmptyState {...emptyProps} />
      </div>
    );
  }

  return <>{children}</>;
}
