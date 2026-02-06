/**
 * EmptyState Component
 *
 * Empty state placeholder with icon and action.
 * @module components/shared/EmptyState
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /**
   * Icon to display
   */
  icon?: React.ReactNode;

  /**
   * Title text
   */
  title: string;

  /**
   * Description text
   */
  description?: string;

  /**
   * Action button
   */
  action?: {
    label: string;
    onClick: () => void;
  };

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * EmptyState - Display empty state with optional action
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<InboxIcon />}
 *   title="No messages"
 *   description="You don't have any messages yet"
 *   action={{ label: "Send message", onClick: () => {} }}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-gray-400">
          {icon}
        </div>
      )}

      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        {title}
      </h3>

      {description && (
        <p className="mb-6 max-w-sm text-sm text-gray-500">
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
