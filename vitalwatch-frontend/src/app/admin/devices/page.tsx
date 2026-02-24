'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { useToast } from '@/hooks/useToast';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { tenoviApi, patientsApi, organizationsApi } from '@/services/api';
import type { TenoviHwiDevice, TenoviDeviceStats, Patient, Organization } from '@/types';
import { 
  Smartphone, 
  Plus, 
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ShoppingCart,
  ClipboardList
} from 'lucide-react';
import Link from 'next/link';

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

export default function AdminDevicesPage() {
  const { toast } = useToast();
  const [devices, setDevices] = useState<TenoviHwiDevice[]>([]);
  const [stats, setStats] = useState<TenoviDeviceStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDevice, setSelectedDevice] = useState<TenoviHwiDevice | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [devicesRes, statsRes, patientsRes, orgsRes] = await Promise.all([
        tenoviApi.listDevices({ limit: 100 }),
        tenoviApi.getStats(),
        patientsApi.getAll({ limit: 100 }).catch(() => ({ data: { data: [] } })),
        organizationsApi.getAll({ limit: 100 }).catch(() => ({ data: { data: [] } })),
      ]);
      if (devicesRes.data?.results) {
        setDevices(devicesRes.data.results);
      }
      if (statsRes.data) {
        setStats(statsRes.data);
      }
      if (patientsRes.data?.data) {
        setPatients(patientsRes.data.data);
      }
      if (orgsRes.data?.data) {
        setOrganizations(orgsRes.data.data);
      }
    } catch (err) {
      setError('Failed to load devices. Please try again.');
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAssignDevice = async () => {
    if (!selectedDevice || !selectedPatientId) return;
    
    try {
      setAssigning(true);
      await tenoviApi.assignDevice(selectedDevice.hwiDeviceId, selectedPatientId, selectedOrgId || undefined);
      setShowAssignModal(false);
      setSelectedPatientId('');
      setSelectedOrgId('');
      toast({ title: 'Device assigned', description: `Device ${selectedDevice.hwiDeviceId} has been assigned`, type: 'success' });
      await fetchDevices();
    } catch (err) {
      console.error('Failed to assign device:', err);
      toast({ title: 'Error', description: 'Failed to assign device. Please try again.', type: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignDevice = useCallback(async (device: TenoviHwiDevice) => {
    try {
      await tenoviApi.unassignDevice(device.hwiDeviceId);
      toast({ title: 'Device unassigned', description: `Device ${device.hwiDeviceId} has been unassigned`, type: 'success' });
      await fetchDevices();
    } catch (err) {
      console.error('Failed to unassign device:', err);
      toast({ title: 'Error', description: 'Failed to unassign device. Please try again.', type: 'error' });
    }
  }, [fetchDevices, toast]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await tenoviApi.syncAll();
      if (result.data) {
        toast({ title: 'Sync complete', description: `${result.data.synced} devices synced, ${result.data.errors} errors`, type: 'success' });
      }
      await fetchDevices();
    } catch (err) {
      setError('Failed to sync devices');
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const filteredDevices = devices.filter((d) => {
    if (typeFilter !== 'all' && d.sensorCode !== typeFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  const activeDevices = stats?.active ?? devices.filter((d) => d.status === 'active').length;
  const connectedDevices = stats?.connected ?? devices.filter((d) => d.status === 'connected').length;
  const totalDevices = stats?.total ?? devices.length;
  const unassignedDevices = devices.filter((d) => !d.patientId).length;

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
          <p className="text-sm text-gray-500">{device.modelNumber || device.deviceName || '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (status: string) => {
        const config: Record<string, { variant: 'success' | 'secondary' | 'warning' | 'danger'; icon: React.ElementType }> = {
          active: { variant: 'success', icon: Wifi },
          connected: { variant: 'success', icon: Wifi },
          inactive: { variant: 'secondary', icon: WifiOff },
          disconnected: { variant: 'warning', icon: WifiOff },
          unlinked: { variant: 'danger', icon: WifiOff },
        };
        const { variant, icon: Icon } = config[status] || { variant: 'secondary' as const, icon: WifiOff };
        return (
          <Badge variant={variant} className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {status}
          </Badge>
        );
      },
    },
    {
      key: 'shippingStatus',
      header: 'Fulfillment',
      render: (status: string | undefined) => {
        if (!status) return <span className="text-gray-400">—</span>;
        const statusLabels: Record<string, string> = {
          DR: 'Draft', RQ: 'Requested', PE: 'Pending', CR: 'Created',
          OH: 'On Hold', RS: 'Ready', SH: 'Shipped', DE: 'Delivered',
          RE: 'Returned', CA: 'Cancelled',
        };
        const isDelivered = status === 'DE';
        return (
          <Badge variant={isDelivered ? 'success' : 'secondary'}>
            {statusLabels[status] || status}
          </Badge>
        );
      },
    },
    {
      key: 'patientName',
      header: 'Assigned To',
      render: (name: string | undefined, device) => (
        <div>
          <p>{name || device.patientExternalId || '—'}</p>
          {device.clinicName && <p className="text-xs text-gray-500">{device.clinicName}</p>}
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenovi Device Inventory</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage and monitor connected Tenovi devices ({totalDevices} total)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
            <Link href="/admin/devices/orders">
              <Button variant="outline">
                <ClipboardList className="mr-2 h-4 w-4" />
                Orders
              </Button>
            </Link>
            <Link href="/admin/devices/order">
              <Button>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Order Devices
              </Button>
            </Link>
          </div>
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
            title="Disconnected"
            value={devices.filter((d) => d.status === 'disconnected').length}
            icon={<WifiOff className="h-5 w-5" />}
            className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
          />
          <MetricCard
            title="Unassigned"
            value={unassignedDevices}
            icon={<Smartphone className="h-5 w-5" />}
          />
        </div>

        {unassignedDevices > 0 && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-400">
                  {unassignedDevices} devices need attention
                </p>
                <p className="text-sm text-yellow-600">
                  These devices have not been assigned to patients yet.
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
            { label: 'Assign', onClick: (d) => { setSelectedDevice(d); setShowAssignModal(true); } },
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
                  <p className="text-sm text-gray-500">Hardware UUID</p>
                  <p className="font-mono text-sm">{selectedDevice.hardwareUuid || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant={selectedDevice.status === 'active' || selectedDevice.status === 'connected' ? 'success' : 'warning'}>
                    {selectedDevice.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Shipping Status</p>
                  <p className="font-medium">{selectedDevice.shippingStatus || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Assigned To</p>
                  <p className="font-medium">{selectedDevice.patientName || selectedDevice.patientExternalId || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Reading</p>
                  <p className="font-medium">{selectedDevice.lastMeasurement ? new Date(selectedDevice.lastMeasurement).toLocaleString() : 'Never'}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => { setShowDetailsModal(false); setShowAssignModal(true); }}>
                  {selectedDevice.patientId ? 'Reassign' : 'Assign'}
                </Button>
                <Button variant="outline" className="flex-1">View History</Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Device" size="md">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Device</p>
              <p className="font-medium">{selectedDevice?.hwiDeviceId} - {sensorCodeToType[selectedDevice?.sensorCode || ''] || 'Device'}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Patient *</label>
              <Select
                options={[
                  { value: '', label: 'Select patient...' },
                  ...patients.map((p) => ({
                    value: p.id,
                    label: `${p.firstName} ${p.lastName}` + (p.email ? ` (${p.email})` : ''),
                  })),
                ]}
                value={selectedPatientId}
                onChange={setSelectedPatientId}
                searchable
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Organization</label>
              <Select
                options={[
                  { value: '', label: 'Select organization (optional)...' },
                  ...organizations.map((o) => ({
                    value: o.id,
                    label: o.name,
                  })),
                ]}
                value={selectedOrgId}
                onChange={setSelectedOrgId}
              />
            </div>
            {selectedDevice?.patientId && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/20 dark:text-yellow-400">
                This device is currently assigned to {selectedDevice.patientName || 'a patient'}. Assigning to a new patient will reassign the device.
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
              {selectedDevice?.patientId && (
                <Button variant="outline" className="text-red-600" onClick={() => { handleUnassignDevice(selectedDevice); setShowAssignModal(false); }}>
                  Unassign
                </Button>
              )}
              <Button onClick={handleAssignDevice} disabled={!selectedPatientId || assigning}>
                {assigning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assigning...</> : 'Assign Device'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
