"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import {
  Activity,
  LayoutDashboard,
  Users,
  AlertTriangle,
  BarChart3,
  MessageSquare,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Pill,
  Calendar,
  BookOpen,
  CreditCard,
  Building,
  Smartphone,
  Zap,
  Shield,
  Key,
  FileText,
  Bell,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const menuConfig: Record<UserRole, MenuItem[]> = {
  patient: [
    { name: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
    { name: "My Vitals", href: "/patient/vitals", icon: HeartPulse },
    { name: "Medications", href: "/patient/medications", icon: Pill },
    { name: "Appointments", href: "/patient/appointments", icon: Calendar },
    { name: "Messages", href: "/patient/messages", icon: MessageSquare, badge: 3 },
    { name: "Education", href: "/patient/education", icon: BookOpen },
    { name: "Settings", href: "/patient/settings", icon: Settings },
  ],
  provider: [
    { name: "Dashboard", href: "/provider/dashboard", icon: LayoutDashboard },
    { name: "Alerts", href: "/provider/alerts", icon: AlertTriangle, badge: 12 },
    { name: "Patients", href: "/provider/patients", icon: Users },
    { name: "Analytics", href: "/provider/analytics", icon: BarChart3 },
    { name: "Messages", href: "/provider/messages", icon: MessageSquare, badge: 5 },
    { name: "Billing", href: "/provider/billing", icon: CreditCard },
    { name: "Settings", href: "/provider/settings", icon: Settings },
  ],
  admin: [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Organizations", href: "/admin/organizations", icon: Building },
    { name: "Devices", href: "/admin/devices", icon: Smartphone },
    { name: "Billing", href: "/admin/billing", icon: CreditCard },
    { name: "Integrations", href: "/admin/integrations", icon: Zap },
    { name: "AI Management", href: "/admin/ai", icon: Activity },
    { name: "API Logs", href: "/admin/api-logs", icon: FileText },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ],
  superadmin: [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Organizations", href: "/admin/organizations", icon: Building },
    { name: "Devices", href: "/admin/devices", icon: Smartphone },
    { name: "Billing", href: "/admin/billing", icon: CreditCard },
    { name: "Integrations", href: "/admin/integrations", icon: Zap },
    { name: "AI Management", href: "/admin/ai", icon: Activity },
    { name: "API Logs", href: "/admin/api-logs", icon: FileText },
    { name: "API Keys", href: "/admin/api-keys", icon: Key },
    { name: "Security", href: "/admin/security", icon: Shield },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ],
};

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = menuConfig[role] || menuConfig.patient;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Activity className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              VitalWatch
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 font-medium">{item.name}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-medium bg-red-500 text-white rounded-full">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <Link
          href="/help"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          )}
        >
          <HelpCircle className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Help & Support</span>}
        </Link>
        <button
          onClick={() => logout()}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-1"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
