/**
 * Notification Store
 *
 * Zustand store for managing in-app notifications and toasts.
 * @module stores/notificationStore
 */

'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface Toast {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
  dismissible?: boolean;
}

interface NotificationState {
  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Toasts
  toasts: Toast[];

  // Actions - Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Actions - Toasts
  showToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Helpers
  showSuccess: (message: string, duration?: number) => string;
  showError: (message: string, duration?: number) => string;
  showWarning: (message: string, duration?: number) => string;
  showInfo: (message: string, duration?: number) => string;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useNotificationStore = create<NotificationState>()(
  devtools((set, get) => ({
    notifications: [],
    unreadCount: 0,
    toasts: [],

    addNotification: (notification) =>
      set((state) => {
        const newNotification: Notification = {
          ...notification,
          id: generateId(),
          read: false,
          createdAt: new Date().toISOString(),
        };
        return {
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        };
      }, false, 'addNotification'),

    markAsRead: (id) =>
      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        if (!notification || notification.read) {
          return state;
        }
        return {
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        };
      }, false, 'markAsRead'),

    markAllAsRead: () =>
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }), false, 'markAllAsRead'),

    removeNotification: (id) =>
      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount:
            notification && !notification.read
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
        };
      }, false, 'removeNotification'),

    clearNotifications: () =>
      set({ notifications: [], unreadCount: 0 }, false, 'clearNotifications'),

    showToast: (toast) => {
      const id = generateId();
      const newToast: Toast = {
        ...toast,
        id,
        duration: toast.duration ?? 5000,
        dismissible: toast.dismissible ?? true,
      };

      set((state) => ({
        toasts: [...state.toasts, newToast],
      }), false, 'showToast');

      // Auto-remove toast after duration
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          get().removeToast(id);
        }, newToast.duration);
      }

      return id;
    },

    removeToast: (id) =>
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }), false, 'removeToast'),

    clearToasts: () =>
      set({ toasts: [] }, false, 'clearToasts'),

    showSuccess: (message, duration) => {
      return get().showToast({ type: 'success', message, duration });
    },

    showError: (message, duration) => {
      return get().showToast({ type: 'error', message, duration });
    },

    showWarning: (message, duration) => {
      return get().showToast({ type: 'warning', message, duration });
    },

    showInfo: (message, duration) => {
      return get().showToast({ type: 'info', message, duration });
    },
  }))
);

export default useNotificationStore;
