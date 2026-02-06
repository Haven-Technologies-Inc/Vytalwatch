/**
 * UserAvatar Component
 *
 * User avatar with initials fallback and status indicator.
 * @module components/shared/UserAvatar
 */

'use client';

import React from 'react';
import * as Avatar from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';
import { getInitials } from '@/utils/formatters';

export interface UserAvatarProps {
  /**
   * User's full name (used for initials)
   */
  name: string;

  /**
   * URL of the user's avatar image
   */
  src?: string;

  /**
   * Size of the avatar
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Status indicator
   */
  status?: 'online' | 'offline' | 'away' | 'busy';

  /**
   * Whether to show status indicator
   */
  showStatus?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

const statusClasses = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

const statusSizeClasses = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
};

/**
 * UserAvatar - Display user avatar with initials fallback
 *
 * @example
 * ```tsx
 * <UserAvatar name="John Doe" src="/avatar.jpg" />
 * <UserAvatar name="Jane Smith" size="lg" status="online" showStatus />
 * ```
 */
export function UserAvatar({
  name,
  src,
  size = 'md',
  status = 'offline',
  showStatus = false,
  className,
}: UserAvatarProps) {
  const initials = getInitials(name);

  return (
    <div className="relative inline-block">
      <Avatar.Root
        className={cn(
          'inline-flex select-none items-center justify-center overflow-hidden rounded-full bg-gray-100',
          sizeClasses[size],
          className
        )}
      >
        <Avatar.Image
          src={src}
          alt={name}
          className="h-full w-full object-cover"
        />
        <Avatar.Fallback
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 font-medium text-white"
          delayMs={600}
        >
          {initials}
        </Avatar.Fallback>
      </Avatar.Root>

      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white',
            statusClasses[status],
            statusSizeClasses[size]
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

export default UserAvatar;
