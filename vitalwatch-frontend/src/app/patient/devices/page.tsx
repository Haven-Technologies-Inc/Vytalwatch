'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Smartphone, Wifi, WifiOff, RefreshCw, HelpCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { patientsApi, tenoviApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/stores/authStore';
import type { TenoviHwiDevice } from '@/types';

const sensorCodeToType: Record<string, { name: string; icon: string }> = {
  'BP': { name: 'Blood Pressure Monitor', icon: '🩺' },
  'WS': { name: 'Weight Scale', icon: '⚖️' },
  'PO': { name: 'Pulse Oximeter', icon: '💓' },
  'GM': { name: 'Glucose Meter', icon: '🩸' },
  'TH': { name: 'Thermometer', icon: '🌡️' },
};

export default function PatientDevicesPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [devices, setDevices] = useState<TenoviHwiDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<TenoviHwiDevice | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchDevices = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await patientsApi.getDevices(user.id);
      if (response.data?.tenoviDevices) {
        setDevices(response.data.tenoviDevices);
      }
    } catch (err: unknown) {
      const apiErr = err as { status?: number; code?: string };
      if (apiErr?.status === 401) {
        setError('Authentication error. Please log in again.');
      } else if (apiErr?.status === 0 || apiErr?.code === 'NETWORK_ERROR') {
        setError('Server unavailable. Please try again later.');
      } else {
        setError('Failed to load devices. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleSync = async (deviceId: string) => {
    try {
      setSyncing(true);
      await tenoviApi.syncDevice(deviceId);
      await fetchDevices();
      toast({ title: 'Device synced', description: 'Latest readings fetched', type: 'success' });
    } catch {
      // Silently handle sync errors in demo/dev mode
    } finally {
      setSyncing(false);
    }
  };

  const connectedCount = devices.filter((d) => d.status === 'connected' || d.status === 'active').length;
  const disconnectedCount = devices.filter((d) => d.status === 'disconnected' || d.status === 'inactive').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Devices</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your monitoring devices</p>
          </div>
          <Button variant="outline" onClick={() => toast({ title: 'Setup Guide', description: 'Opening device setup guide', type: 'info' })}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Setup Guide
          </Button>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading devices...</span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
            <Button variant="outline" size="sm" className="ml-4" onClick={fetchDevices}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard
                title="Total Devices"
                value={devices.length.toString()}
                subtitle="Assigned to you"
                icon={<Smartphone className="h-5 w-5" />}
              />
              <MetricCard
                title="Connected"
                value={connectedCount.toString()}
                subtitle={`${disconnectedCount} offline`}
                icon={<Wifi className="h-5 w-5" />}
                className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
              />
              <MetricCard
                title="Disconnected"
                value={disconnectedCount.toString()}
                subtitle="Offline devices"
                icon={<WifiOff className="h-5 w-5" />}
                className={disconnectedCount > 0 ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20' : ''}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {devices.length === 0 ? (
                <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
                  <Smartphone className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No devices assigned</h3>
                  <p className="mt-2 text-gray-500">Contact your care team to get devices assigned to your account.</p>
                </div>
              ) : (
                devices.map((device) => {
                  const deviceInfo = sensorCodeToType[device.sensorCode || ''] || { name: device.deviceName || 'Device', icon: '📱' };
                  const isConnected = device.status === 'connected' || device.status === 'active';
                  
                  return (
                    <div
                      key={device.id}
                      className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-4xl">{deviceInfo.icon}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{deviceInfo.name}</h3>
                            <p className="text-sm text-gray-500">{device.modelNumber || device.hwiDeviceId}</p>
                          </div>
                        </div>
                        <Badge variant={isConnected ? 'success' : 'secondary'}>
                          {isConnected ? (
                            <><Wifi className="mr-1 h-3 w-3" />Connected</>
                          ) : (
                            <><WifiOff className="mr-1 h-3 w-3" />Offline</>
                          )}
                        </Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                          <p className="text-xs text-gray-500">Status</p>
                          <p className="mt-1 text-sm font-medium capitalize">{device.status}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                          <p className="text-xs text-gray-500">Last Reading</p>
                          <p className="mt-1 text-sm font-medium">
                            {device.lastMeasurement ? new Date(device.lastMeasurement).toLocaleString() : 'Never'}
                          </p>
                        </div>
                      </div>

                      {device.shippingStatus && (
                        <div className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-500">Shipping Status</p>
                              <p className="text-sm font-medium">{device.shippingStatus === 'DE' ? 'Delivered' : device.shippingStatus}</p>
                            </div>
                            {device.shippingTrackingLink && (
                              <a href={device.shippingTrackingLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                Track
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => { setSelectedDevice(device); setShowModal(true); }}
                        >
                          Details
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleSync(device.hwiDeviceId)} disabled={syncing}>
                          <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-400">Taking Readings</p>
              <p className="text-sm text-blue-700 dark:text-blue-500">
                Your readings are automatically synced when you use your devices. Make sure Bluetooth is enabled on nearby devices.
                For best results, take readings at the same time each day.
              </p>
            </div>
          </div>
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Device Details" size="md">
          {selectedDevice && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-5xl">{sensorCodeToType[selectedDevice.sensorCode || '']?.icon || '📱'}</span>
                <div>
                  <h3 className="text-lg font-semibold">{sensorCodeToType[selectedDevice.sensorCode || '']?.name || selectedDevice.deviceName || 'Device'}</h3>
                  <p className="text-gray-500">{selectedDevice.modelNumber || selectedDevice.hwiDeviceId}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-3 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Device ID</p>
                  <p className="font-mono font-medium">{selectedDevice.hwiDeviceId}</p>
                </div>
                <div className="rounded-lg border p-3 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant={selectedDevice.status === 'connected' || selectedDevice.status === 'active' ? 'success' : 'secondary'}>
                    {selectedDevice.status}
                  </Badge>
                </div>
                <div className="rounded-lg border p-3 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Hardware UUID</p>
                  <p className="font-mono text-xs">{selectedDevice.hardwareUuid || '—'}</p>
                </div>
                <div className="rounded-lg border p-3 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Last Reading</p>
                  <p className="font-medium">{selectedDevice.lastMeasurement ? new Date(selectedDevice.lastMeasurement).toLocaleString() : 'Never'}</p>
                </div>
                {selectedDevice.shippingStatus && (
                  <>
                    <div className="rounded-lg border p-3 dark:border-gray-700">
                      <p className="text-sm text-gray-500">Delivery Status</p>
                      <p className="font-medium">{selectedDevice.shippingStatus === 'DE' ? 'Delivered' : selectedDevice.shippingStatus}</p>
                    </div>
                    {selectedDevice.deliveredOn && (
                      <div className="rounded-lg border p-3 dark:border-gray-700">
                        <p className="text-sm text-gray-500">Delivered On</p>
                        <p className="font-medium">{new Date(selectedDevice.deliveredOn).toLocaleDateString()}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => toast({ title: 'Troubleshoot', description: 'Opening troubleshooting guide', type: 'info' })}>Troubleshoot</Button>
                <Button className="flex-1" onClick={() => handleSync(selectedDevice.hwiDeviceId)} disabled={syncing}>
                  <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
