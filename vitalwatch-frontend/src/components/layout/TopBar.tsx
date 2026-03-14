"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useAuthStore, getRedirectPath } from "@/stores/authStore";
import { notificationsApi } from "@/services/api";
import { extractArray } from "@/lib/utils";
import {
  Bell,
  Search,
  Sun,
  Moon,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface TopBarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

interface NotificationItem {
  id: string;
  type?: string;
  category?: string;
  title: string;
  body?: string;
  message?: string;
  createdAt?: string;
  time?: string;
}

export function TopBar({ onMenuClick, showMenuButton = false }: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const response = await notificationsApi.getAll();
      const items = extractArray<NotificationItem>(response);
      setNotifications(items.slice(0, 5));
      setUnreadCount(items.filter((n: NotificationItem & { status?: string }) => n.status !== 'read').length);
    } catch {
      // Notifications are non-critical; silently fail
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds for new notifications
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Get role-based paths for profile and settings
  const getRolePath = (path: string) => {
    const role = user?.role?.toLowerCase();
    switch (role) {
      case 'superadmin':
      case 'admin':
        return `/admin/${path}`;
      case 'provider':
        return `/provider/${path}`;
      case 'patient':
        return `/patient/${path}`;
      default:
        return `/patient/${path}`;
    }
  };

  const handleNavigateToProfile = () => {
    router.push(getRolePath('profile'));
  };

  const handleNavigateToSettings = () => {
    router.push(getRolePath('settings'));
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
        )}

        {/* Search */}
        <div className="hidden sm:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients, alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 lg:w-80 pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        )}

        {/* Notifications */}
        <DropdownMenu.Root
          open={showNotifications}
          onOpenChange={setShowNotifications}
        >
          <DropdownMenu.Trigger asChild>
            <button className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50"
              align="end"
              sideOffset={8}
            >
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 mb-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Notifications
                </h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenu.Item
                      key={notification.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer outline-none"
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                          notification.category === "alert" || notification.type === "critical"
                            ? "bg-red-500"
                            : notification.type === "warning"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {notification.title}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                          {notification.body || notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {notification.createdAt
                            ? formatRelativeTime(notification.createdAt)
                            : notification.time || ''}
                        </p>
                      </div>
                    </DropdownMenu.Item>
                  ))
                )}
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                <button className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                  View all notifications
                </button>
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* User Menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center text-white font-medium text-sm overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.firstName?.[0] || "U"
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "User"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {user?.role || "Member"}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 hidden lg:block" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50"
              align="end"
              sideOffset={8}
            >
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 mb-2">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user?.email}
                </p>
              </div>

              <DropdownMenu.Item
                onClick={handleNavigateToProfile}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer outline-none"
              >
                <User className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Profile
                </span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onClick={handleNavigateToSettings}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer outline-none"
              >
                <Settings className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Settings
                </span>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-slate-200 dark:bg-slate-700 my-2" />

              <DropdownMenu.Item
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer outline-none"
              >
                <LogOut className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">
                  Sign Out
                </span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
