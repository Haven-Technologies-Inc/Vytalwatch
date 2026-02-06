/**
 * Data Formatters for VytalWatch
 *
 * Utility functions for formatting data for display.
 * @module utils/formatters
 */

import { format, formatDistance, formatRelative } from 'date-fns';

/**
 * Format a date to a readable string
 */
export function formatDate(date: string | Date, formatStr = 'MMM dd, yyyy'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatStr);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format a date with time
 */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'MMM dd, yyyy h:mm a');
}

/**
 * Format a date relative to now (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistance(dateObj, new Date(), { addSuffix: true });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format a date relative with context (e.g., "yesterday at 3:00 PM")
 */
export function formatRelativeDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatRelative(dateObj, new Date());
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format vital signs with appropriate units
 */
export function formatVital(type: string, value: number): string {
  const formats: Record<string, (val: number) => string> = {
    heart_rate: (val) => `${val} bpm`,
    blood_pressure: (val) => `${val}`, // Usually comes as "120/80"
    temperature: (val) => `${val.toFixed(1)}°F`,
    oxygen_saturation: (val) => `${val}%`,
    respiratory_rate: (val) => `${val} /min`,
    weight: (val) => `${val.toFixed(1)} lbs`,
    glucose: (val) => `${val} mg/dL`,
  };

  const formatter = formats[type];
  return formatter ? formatter(value) : `${value}`;
}

/**
 * Format blood pressure from systolic/diastolic
 */
export function formatBloodPressure(systolic: number, diastolic: number): string {
  return `${systolic}/${diastolic} mmHg`;
}

/**
 * Get color class for vital status
 */
export function getVitalStatusColor(status: 'normal' | 'warning' | 'critical'): string {
  const colors = {
    normal: 'text-green-600 bg-green-50',
    warning: 'text-yellow-600 bg-yellow-50',
    critical: 'text-red-600 bg-red-50',
  };
  return colors[status] || colors.normal;
}

/**
 * Get color for alert severity
 */
export function getAlertSeverityColor(severity: 'low' | 'medium' | 'high' | 'critical'): string {
  const colors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };
  return colors[severity] || colors.low;
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format medication dosage
 */
export function formatDosage(amount: number, unit: string): string {
  return `${amount} ${unit}`;
}

/**
 * Format duration in minutes to readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format patient MRN (Medical Record Number)
 */
export function formatMRN(mrn: string): string {
  // Format as XXX-XXX-XXXX
  const cleaned = mrn.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return mrn;
}

/**
 * Get risk score color
 */
export function getRiskScoreColor(score: number): string {
  if (score >= 80) return 'text-red-600';
  if (score >= 60) return 'text-orange-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-green-600';
}

/**
 * Get risk score background color
 */
export function getRiskScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-red-100';
  if (score >= 60) return 'bg-orange-100';
  if (score >= 40) return 'bg-yellow-100';
  return 'bg-green-100';
}

/**
 * Format appointment status
 */
export function formatAppointmentStatus(status: string): {
  label: string;
  color: string;
} {
  const statusMap: Record<string, { label: string; color: string }> = {
    scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
    confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800' },
    in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
    completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
    no_show: { label: 'No Show', color: 'bg-orange-100 text-orange-800' },
  };
  return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Validate and format email
 */
export function formatEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Get medication adherence color
 */
export function getAdherenceColor(percentage: number): string {
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 70) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Format BMI with category
 */
export function formatBMI(bmi: number): { value: string; category: string; color: string } {
  let category = '';
  let color = '';

  if (bmi < 18.5) {
    category = 'Underweight';
    color = 'text-blue-600';
  } else if (bmi < 25) {
    category = 'Normal';
    color = 'text-green-600';
  } else if (bmi < 30) {
    category = 'Overweight';
    color = 'text-yellow-600';
  } else {
    category = 'Obese';
    color = 'text-red-600';
  }

  return {
    value: bmi.toFixed(1),
    category,
    color,
  };
}

/**
 * Get device status color
 */
export function getDeviceStatusColor(status: 'online' | 'offline' | 'low_battery'): string {
  const colors = {
    online: 'text-green-600 bg-green-50',
    offline: 'text-gray-600 bg-gray-50',
    low_battery: 'text-yellow-600 bg-yellow-50',
  };
  return colors[status] || colors.offline;
}

/**
 * Format time to 12-hour format
 */
export function formatTime(time: string): string {
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
  } catch {
    return time;
  }
}
