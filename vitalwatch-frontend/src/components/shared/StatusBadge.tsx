/**
 * StatusBadge Component
 *
 * Reusable status indicator badge with different variants.
 * @module components/shared/StatusBadge
 */

'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800',
        primary: 'bg-blue-100 text-blue-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-cyan-100 text-cyan-800',
        purple: 'bg-purple-100 text-purple-800',
        orange: 'bg-orange-100 text-orange-800',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /**
   * Whether to show a pulse animation
   */
  pulse?: boolean;

  /**
   * Icon to display before the text
   */
  icon?: React.ReactNode;
}

/**
 * StatusBadge - Reusable status indicator
 *
 * @example
 * ```tsx
 * <StatusBadge variant="success">Active</StatusBadge>
 * <StatusBadge variant="warning" pulse>Pending</StatusBadge>
 * <StatusBadge variant="danger" icon={<AlertIcon />}>Critical</StatusBadge>
 * ```
 */
export function StatusBadge({
  className,
  variant,
  size,
  pulse,
  icon,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {pulse && (
        <span className="mr-1.5 flex h-2 w-2">
          <span
            className={cn(
              'absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-75',
              {
                'bg-gray-400': variant === 'default',
                'bg-blue-400': variant === 'primary',
                'bg-green-400': variant === 'success',
                'bg-yellow-400': variant === 'warning',
                'bg-red-400': variant === 'danger',
                'bg-cyan-400': variant === 'info',
                'bg-purple-400': variant === 'purple',
                'bg-orange-400': variant === 'orange',
              }
            )}
          />
          <span
            className={cn(
              'relative inline-flex h-2 w-2 rounded-full',
              {
                'bg-gray-500': variant === 'default',
                'bg-blue-500': variant === 'primary',
                'bg-green-500': variant === 'success',
                'bg-yellow-500': variant === 'warning',
                'bg-red-500': variant === 'danger',
                'bg-cyan-500': variant === 'info',
                'bg-purple-500': variant === 'purple',
                'bg-orange-500': variant === 'orange',
              }
            )}
          />
        </span>
      )}
      {icon && <span className="mr-1.5">{icon}</span>}
      {children}
    </span>
  );
}

export default StatusBadge;
