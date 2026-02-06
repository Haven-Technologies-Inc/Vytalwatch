/**
 * DeviceStatusWidget Component
 *
 * Connected device status display.
 * @module components/patient/DeviceStatusWidget
 */

'use client';

import React from 'react';
import { Watch, Activity, Wifi, WifiOff, Battery, BatteryLow } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime, getDeviceStatusColor } from '@/utils/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';

export interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'low_battery';
  batteryLevel?: number;
  lastSync?: string;
  firmwareVersion?: string;
}

export interface DeviceStatusWidgetProps {
  devices: Device[];
  onSync?: (deviceId: string) => void;
  className?: string;
}

/**
 * DeviceStatusWidget - Connected device status
 *
 * @example
 * ```tsx
 * <DeviceStatusWidget devices={devices} onSync={handleSync} />
 * ```
 */
export function DeviceStatusWidget({
  devices,
  onSync,
  className,
}: DeviceStatusWidgetProps) {
  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'smartwatch':
      case 'watch':
        return Watch;
      case 'monitor':
      case 'bp_monitor':
        return Activity;
      default:
        return Activity;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'low_battery':
        return 'warning';
      case 'offline':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Connected Devices</h3>

      {devices.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          No devices connected
        </p>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => {
            const DeviceIcon = getDeviceIcon(device.type);
            const isLowBattery = device.status === 'low_battery' || (device.batteryLevel && device.batteryLevel < 20);

            return (
              <div
                key={device.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <DeviceIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{device.name}</h4>
                      <p className="text-sm text-gray-600">{device.type}</p>
                      {device.lastSync && (
                        <p className="mt-1 text-xs text-gray-500">
                          Last sync: {formatRelativeTime(device.lastSync)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {device.status === 'online' ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-gray-400" />
                    )}
                    <StatusBadge variant={getStatusVariant(device.status) as any} size="sm">
                      {device.status.replace('_', ' ')}
                    </StatusBadge>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {device.batteryLevel !== undefined && (
                    <div className="flex items-center gap-2">
                      {isLowBattery ? (
                        <BatteryLow className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <Battery className="h-4 w-4 text-green-600" />
                      )}
                      <span className={cn(
                        'text-sm font-medium',
                        isLowBattery ? 'text-yellow-600' : 'text-gray-700'
                      )}>
                        {device.batteryLevel}%
                      </span>
                    </div>
                  )}

                  {onSync && device.status === 'online' && (
                    <button
                      onClick={() => onSync(device.id)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Sync Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DeviceStatusWidget;
