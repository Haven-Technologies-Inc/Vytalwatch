'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { tenoviApi } from '@/services/api';
import type { TenoviHwiDevice, TenoviDeviceStats } from '@/types';
import { 
  Smartphone, 
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

const sensorCodeToType: Record<string, string> = {
  'BP': 'Blood Pressure Monitor',
  'WS': 'Weight Scale',
  'PO': 'Pulse Oximeter',
  'GM': 'Glucose Meter',
  'TH': 'Thermometer',
};

const typeFilters = [
  { value: 'all', label: 'All Types' },
  { value: 'BP', label: 'Blood Pressure' },
  { value: 'WS', label: 'Weight Scale' },
  { value: 'PO', label: 'Pulse Oximeter' },
  { value: 'GM', label: 'Glucose Meter' },
];

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'connected', label: 'Connected' },
  { value: 'disconnected', label: 'Disconnected' },
];

export default function ProviderDevicesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [devices, setDevices] = useState<TenoviHwiDevice[]>([]);
  const [stats, setStats] = useState<TenoviDeviceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDevice, setSelectedDevice] = useState<TenoviHwiDevice | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [devicesRes, statsRes] = await Promise.all([
        tenoviApi.listDevices({ limit: 100 }),
        tenoviApi.getStats(),
      ]);
      if (devicesRes.data?.results) {
        setDevices(devicesRes.data.results);
      }
      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch {
      setError('Failed to load devices. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await tenoviApi.syncAll();
      if (result.data) {
        toast({ 
          title: 'Sync complete', 
          description: `${result.data.synced} devices synced, ${result.data.errors} errors`,
          type: result.data.errors > 0 ? 'warning' : 'success'
        });
      }
      await fetchDevices();
    } catch {
      toast({ title: 'Sync failed', description: 'Failed to sync devices from Tenovi', type: 'error' });
      setError('Failed to sync devices');
    } finally {
      setSyncing(false);
    }
  };

  const handleAssignDevice = (deviceId: string) => {
    router.push(`/provider/devices/${deviceId}/assign`);
  };

  const handleViewPatient = (patientId: string) => {
    router.push(`/provider/patients/${patientId}`);
  };

  const filteredDevices = devices.filter((d) => {
    if (typeFilter !== 'all' && d.sensorCode !== typeFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  const activeDevices = stats?.active ?? devices.filter((d) => d.status === 'active').length;
  const connectedDevices = stats?.connected ?? devices.filter((d) => d.status === 'connected').length;
  const totalDevices = stats?.total ?? devices.length;
  const assignedDevices = devices.filter((d) => d.patientId).length;

  const columns: Column<TenoviHwiDevice>[] = [
    {
      key: 'hwiDeviceId',
      header: 'Device ID',
      render: (id: string) => <span className="font-mono text-sm">{id}</span>,
    },
    {
      key: 'sensorCode',
      header: 'Type',
      render: (code: string, device) => (
        <div>
          <p className="font-medium">{sensorCodeToType[code] || code || 'Unknown'}</p>
          <p className="text-sm text-gray-500">{device.modelNumber || '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (status: string) => {
        const isActive = status === 'active' || status === 'connected';
        return (
          <Badge variant={isActive ? 'success' : 'secondary'} className="flex items-center gap-1 w-fit">
            {isActive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {status}
          </Badge>
        );
      },
    },
    {
      key: 'patientName',
      header: 'Patient',
      render: (name: string | undefined, device) => (
        <div>
          {device.patientId ? (
            <Link href={`/provider/patients/${device.patientId}`} className="text-blue-600 hover:underline">
              {name || device.patientExternalId || 'View Patient'}
            </Link>
          ) : (
            <span className="text-gray-400">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'lastMeasurement',
      header: 'Last Reading',
      render: (date: string | undefined) => {
        if (!date) return <span className="text-gray-400">Never</span>;
        return new Date(date).toLocaleString();
      },
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading devices...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patient Devices</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage Tenovi devices for your patients ({totalDevices} total)
            </p>
          </div>
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {syncing ? 'Syncing...' : 'Sync from Tenovi'}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Active Devices"
            value={activeDevices}
            icon={<CheckCircle2 className="h-5 w-5" />}
            className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
          />
          <MetricCard
            title="Connected"
            value={connectedDevices}
            icon={<Wifi className="h-5 w-5" />}
            className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20"
          />
          <MetricCard
            title="Assigned to Patients"
            value={assignedDevices}
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            title="Unassigned"
            value={devices.filter((d) => !d.patientId).length}
            icon={<Smartphone className="h-5 w-5" />}
            className={devices.filter((d) => !d.patientId).length > 0 ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20' : ''}
          />
        </div>

        {devices.filter((d) => !d.patientId).length > 0 && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-400">
                  {devices.filter((d) => !d.patientId).length} unassigned devices
                </p>
                <p className="text-sm text-yellow-600">
                  These devices are not assigned to any patient and won&apos;t collect data.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Select options={typeFilters} value={typeFilter} onChange={setTypeFilter} className="w-44" />
          <Select options={statusFilters} value={statusFilter} onChange={setStatusFilter} className="w-36" />
        </div>

        <DataTable
          data={filteredDevices}
          columns={columns}
          onRowClick={(device) => {
            setSelectedDevice(device);
            setShowDetailsModal(true);
          }}
          actions={[
            { label: 'View', onClick: (d) => { setSelectedDevice(d); setShowDetailsModal(true); } },
            { label: 'View Patient', onClick: (d) => { if (d.patientId) handleViewPatient(d.patientId); } },
            { label: 'Assign', onClick: (d) => { if (!d.patientId) handleAssignDevice(d.hwiDeviceId); } },
          ]}
        />

        <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Device Details" size="md">
          {selectedDevice && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Device ID</p>
                  <p className="font-mono font-medium">{selectedDevice.hwiDeviceId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{sensorCodeToType[selectedDevice.sensorCode || ''] || selectedDevice.sensorCode || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Model</p>
                  <p className="font-medium">{selectedDevice.modelNumber || selectedDevice.deviceName || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant={selectedDevice.status === 'active' || selectedDevice.status === 'connected' ? 'success' : 'secondary'}>
                    {selectedDevice.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Patient</p>
                  {selectedDevice.patientId ? (
                    <Link href={`/provider/patients/${selectedDevice.patientId}`} className="font-medium text-blue-600 hover:underline">
                      {selectedDevice.patientName || selectedDevice.patientExternalId || 'View Patient'}
                    </Link>
                  ) : (
                    <p className="font-medium text-gray-400">Unassigned</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Reading</p>
                  <p className="font-medium">{selectedDevice.lastMeasurement ? new Date(selectedDevice.lastMeasurement).toLocaleString() : 'Never'}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                {selectedDevice.patientId ? (
                  <Link href={`/provider/patients/${selectedDevice.patientId}`} className="flex-1">
                    <Button variant="outline" className="w-full">View Patient</Button>
                  </Link>
                ) : (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleAssignDevice(selectedDevice.hwiDeviceId)}
                  >
                    Assign to Patient
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => tenoviApi.syncDevice(selectedDevice.hwiDeviceId)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
