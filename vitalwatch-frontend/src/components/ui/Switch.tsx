'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: { switch: 'h-5 w-9', thumb: 'h-4 w-4', translate: 'peer-checked:translate-x-4' },
  md: { switch: 'h-6 w-11', thumb: 'h-5 w-5', translate: 'peer-checked:translate-x-5' },
  lg: { switch: 'h-7 w-14', thumb: 'h-6 w-6', translate: 'peer-checked:translate-x-7' },
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, size = 'md', id, ...props }, ref) => {
    const switchId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const sizes = sizeClasses[size];

    return (
      <label
        htmlFor={switchId}
        className={cn(
          'flex cursor-pointer items-center justify-between gap-3',
          props.disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
            )}
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              'rounded-full bg-gray-200 transition-colors',
              'peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20',
              'dark:bg-gray-700',
              sizes.switch,
              className
            )}
          />
          <div
            className={cn(
              'absolute left-0.5 top-0.5 rounded-full bg-white shadow-sm transition-transform',
              sizes.thumb,
              sizes.translate
            )}
          />
        </div>
      </label>
    );
  }
);

Switch.displayName = 'Switch';
