'use client';

import { Badge } from '@/components/ui/Badge';
import { 
  FileEdit, 
  Clock, 
  PackageCheck, 
  Truck, 
  CheckCircle2, 
  RotateCcw, 
  XCircle,
  Pause
} from 'lucide-react';

export type OrderStatus = 'DR' | 'RQ' | 'PE' | 'CR' | 'OH' | 'RS' | 'SH' | 'DE' | 'RE' | 'CA';

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'danger'; icon: React.ElementType }> = {
  DR: { label: 'Draft', variant: 'secondary', icon: FileEdit },
  RQ: { label: 'Requested', variant: 'default', icon: Clock },
  PE: { label: 'Pending', variant: 'warning', icon: Clock },
  CR: { label: 'Created', variant: 'default', icon: PackageCheck },
  OH: { label: 'On Hold', variant: 'warning', icon: Pause },
  RS: { label: 'Ready to Ship', variant: 'default', icon: PackageCheck },
  SH: { label: 'Shipped', variant: 'success', icon: Truck },
  DE: { label: 'Delivered', variant: 'success', icon: CheckCircle2 },
  RE: { label: 'Returned', variant: 'danger', icon: RotateCcw },
  CA: { label: 'Cancelled', variant: 'danger', icon: XCircle },
};

interface OrderStatusBadgeProps {
  status: string | undefined;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function OrderStatusBadge({ status, size = 'md', showIcon = true }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status as OrderStatus] || { label: status || 'Unknown', variant: 'secondary' as const, icon: Clock };
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge variant={config.variant} className={`${sizeClasses[size]} flex items-center gap-1.5`}>
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />}
      {config.label}
    </Badge>
  );
}

export function getStatusLabel(status: string | undefined): string {
  return STATUS_CONFIG[status as OrderStatus]?.label || status || 'Unknown';
}

export function getStatusProgress(status: string | undefined): number {
  const progressMap: Record<string, number> = {
    DR: 10, RQ: 20, PE: 30, CR: 40, OH: 35, RS: 60, SH: 80, DE: 100, RE: 0, CA: 0,
  };
  return progressMap[status || ''] || 0;
}
