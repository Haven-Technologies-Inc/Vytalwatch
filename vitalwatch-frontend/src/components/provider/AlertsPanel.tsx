/**
 * AlertsPanel Component - Active alerts with filtering
 * @module components/provider/AlertsPanel
 */

'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime, getAlertSeverityColor } from '@/utils/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useProviderStore } from '@/stores/providerStore';

export interface AlertsPanelProps {
  onAlertClick?: (alertId: string) => void;
  className?: string;
}

export function AlertsPanel({ onAlertClick, className }: AlertsPanelProps) {
  const alerts = useProviderStore((state) => state.alerts);
  const acknowledgeAlert = useProviderStore((state) => state.acknowledgeAlert);
  const [filter, setFilter] = useState<string>('active');

  const filteredAlerts = alerts.filter((a) => filter === 'all' || a.status === filter);

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white', className)}>
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Alerts</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
          </select>
        </div>
      </div>
      <div className="max-h-[500px] overflow-y-auto divide-y">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className="p-4 hover:bg-gray-50 cursor-pointer"
            onClick={() => onAlertClick?.(alert.id)}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className={cn('h-5 w-5 mt-0.5', alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600')} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{alert.patientName}</h4>
                  <StatusBadge variant={alert.severity === 'critical' ? 'danger' : 'warning'} size="sm">
                    {alert.severity}
                  </StatusBadge>
                </div>
                <p className="text-sm text-gray-600">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(alert.createdAt)}</p>
              </div>
              {alert.status === 'active' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    acknowledgeAlert(alert.id, 'current-provider');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Acknowledge
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredAlerts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="mx-auto h-12 w-12 mb-2 text-green-500" />
            <p>No {filter} alerts</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertsPanel;
