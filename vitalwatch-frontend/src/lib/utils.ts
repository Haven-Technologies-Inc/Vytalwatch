import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return formatDate(date);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function getVitalStatus(
  type: string,
  value: number
): "normal" | "warning" | "critical" {
  const thresholds: Record<string, { warning: number[]; critical: number[] }> = {
    systolic: { warning: [140, 160], critical: [180, 200] },
    diastolic: { warning: [90, 100], critical: [110, 120] },
    glucose: { warning: [140, 180], critical: [200, 400] },
    spo2: { warning: [92, 95], critical: [0, 90] },
    heartRate: { warning: [100, 120], critical: [130, 200] },
    weight: { warning: [0, 0], critical: [0, 0] }, // Trend-based
  };

  const threshold = thresholds[type];
  if (!threshold) return "normal";

  if (
    value >= threshold.critical[0] &&
    (threshold.critical[1] === 0 || value <= threshold.critical[1])
  ) {
    return "critical";
  }
  if (
    value >= threshold.warning[0] &&
    (threshold.warning[1] === 0 || value <= threshold.warning[1])
  ) {
    return "warning";
  }
  return "normal";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
