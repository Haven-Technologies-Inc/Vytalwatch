"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useAuthStore, getRedirectPath } from "@/stores/authStore";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export function DashboardLayout({
  children,
  requiredRole,
}: DashboardLayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated || !user) {
      router.push("/auth/login");
      return;
    }

    // Check role authorization
    if (requiredRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(user.role)) {
        router.push(getRedirectPath(user.role));
        return;
      }
    }

    setIsLoading(false);
  }, [isAuthenticated, user, requiredRole, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar role={user.role} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 transform transition-transform duration-300 lg:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar role={user.role} />
      </div>

      {/* Main Content Area */}
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        <TopBar
          showMenuButton={true}
          onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
