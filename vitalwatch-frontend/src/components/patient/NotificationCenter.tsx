/**
 * NotificationCenter Component
 *
 * In-app notifications panel.
 * @module components/patient/NotificationCenter
 */

'use client';

import React from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/formatters';
import { useNotificationStore } from '@/stores/notificationStore';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';

export interface NotificationCenterProps {
  className?: string;
}

/**
 * NotificationCenter - In-app notifications
 */
export function NotificationCenter({ className }: NotificationCenterProps) {
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  const getVariant = (type: string) => {
    switch (type) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'danger';
      default: return 'info';
    }
  };

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white', className)}>
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <StatusBadge variant="primary" size="sm">
              {unreadCount} new
            </StatusBadge>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-12 w-12" />}
            title="No notifications"
            description="You're all caught up!"
          />
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'p-4 transition-colors hover:bg-gray-50',
                  !notification.read && 'bg-blue-50'
                )}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {notification.title}
                      </h4>
                      <StatusBadge variant={getVariant(notification.type) as any} size="sm">
                        {notification.type}
                      </StatusBadge>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{notification.message}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                    {notification.actionUrl && (
                      <a
                        href={notification.actionUrl}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        {notification.actionLabel || 'View'}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationCenter;
