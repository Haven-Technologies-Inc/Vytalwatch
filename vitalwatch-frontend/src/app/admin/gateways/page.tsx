'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { tenoviApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import type { TenoviGateway } from '@/types';
import { 
  Router, 
  Wifi,
  WifiOff,
  Signal,
  RefreshCw,
  Loader2,
  Unlink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminGatewaysPage() {
  const { toast } = useToast();
  const [gateways, setGateways] = useState<TenoviGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<TenoviGateway | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchGateways = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tenoviApi.listGateways({ limit: 100 });
      if (response.data?.results) {
        setGateways(response.data.results);
      }
    } catch (err) {
      setError('Failed to load gateways. Please try again.');
      console.error('Error fetching gateways:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  const handleSyncGateway = useCallback(async (uuid: string) => {
    try {
      setSyncing(true);
      await tenoviApi.syncGateway(uuid);
      await fetchGateways();
      toast({ title: 'Gateway synced', description: `Gateway ${uuid.slice(0, 8)}... synced successfully`, type: 'success' });
    } catch (err) {
      console.error('Sync error:', err);
      toast({ title: 'Sync failed', description: 'Failed to sync gateway', type: 'error' });
    } finally {
      setSyncing(false);
    }
  }, [fetchGateways, toast]);

  const handleUnlinkGateway = useCallback(async (gatewayId: string) => {
    try {
      await tenoviApi.unlinkGateway(gatewayId);
      await fetchGateways();
      toast({ title: 'Gateway unlinked', description: 'Gateway has been unlinked', type: 'success' });
    } catch (err) {
      console.error('Unlink error:', err);
      toast({ title: 'Unlink failed', description: 'Failed to unlink gateway', type: 'error' });
    }
  }, [fetchGateways, toast]);

  const getSignalStrengthBadge = (strength?: number) => {
    if (strength === undefined || strength === null) {
      return <Badge variant="secondary">Unknown</Badge>;
    }
    if (strength >= 30) {
      return <Badge variant="success"><Signal className="mr-1 h-3 w-3" />Excellent ({strength})</Badge>;
    }
    if (strength >= 20) {
      return <Badge variant="warning"><Signal className="mr-1 h-3 w-3" />Good ({strength})</Badge>;
    }
    if (strength >= 10) {
      return <Badge variant="warning"><Signal className="mr-1 h-3 w-3" />Fair ({strength})</Badge>;
    }
    return <Badge variant="danger"><Signal className="mr-1 h-3 w-3" />Poor ({strength})</Badge>;
  };

  const provisionedCount = gateways.filter((g) => g.provisioned).length;
  const recentlyActiveCount = gateways.filter((g) => {
    if (!g.lastCheckinTime) return false;
    const checkin = new Date(g.lastCheckinTime);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return checkin > hourAgo;
  }).length;

  const columns: Column<TenoviGateway>[] = [
    {
      key: 'gatewayUuid',
      header: 'Gateway UUID',
      render: (uuid: string) => <span className="font-mono text-sm">{uuid}</span>,
    },
    {
      key: 'provisioned',
      header: 'Status',
      render: (provisioned: boolean) => (
        <Badge variant={provisioned ? 'success' : 'secondary'} className="flex items-center gap-1 w-fit">
          {provisioned ? <><CheckCircle2 className="h-3 w-3" />Provisioned</> : <><AlertTriangle className="h-3 w-3" />Not Provisioned</>}
        </Badge>
      ),
    },
    {
      key: 'lastSignalStrength',
      header: 'Signal',
      render: (strength: number | undefined) => getSignalStrengthBadge(strength),
    },
    {
      key: 'firmwareVersion',
      header: 'Firmware',
      render: (version: string | undefined) => version || '—',
    },
    {
      key: 'lastCheckinTime',
      header: 'Last Check-in',
      render: (date: string | undefined) => {
        if (!date) return <span className="text-gray-400">Never</span>;
        return new Date(date).toLocaleString();
      },
    },
    {
      key: 'whitelistedDevices',
      header: 'Devices',
      render: (devices: any[] | undefined) => (
        <span className="font-medium">{devices?.length || 0}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading gateways...</span>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenovi Gateways</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage Tenovi gateway devices ({gateways.length} total)
            </p>
          </div>
          <Button variant="outline" onClick={fetchGateways} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Gateways"
            value={gateways.length}
            icon={<Router className="h-5 w-5" />}
          />
          <MetricCard
            title="Provisioned"
            value={provisionedCount}
            icon={<CheckCircle2 className="h-5 w-5" />}
            className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
          />
          <MetricCard
            title="Recently Active"
            value={recentlyActiveCount}
            subtitle="Last hour"
            icon={<Wifi className="h-5 w-5" />}
            className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20"
          />
          <MetricCard
            title="Inactive"
            value={gateways.length - recentlyActiveCount}
            icon={<WifiOff className="h-5 w-5" />}
            className={gateways.length - recentlyActiveCount > 0 ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20' : ''}
          />
        </div>

        <DataTable
          data={gateways}
          columns={columns}
          onRowClick={(gateway) => {
            setSelectedGateway(gateway);
            setShowDetailsModal(true);
          }}
          actions={[
            { label: 'View', onClick: (g) => { setSelectedGateway(g); setShowDetailsModal(true); } },
            { label: 'Sync', onClick: (g) => handleSyncGateway(g.gatewayUuid) },
          ]}
        />

        <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Gateway Details" size="lg">
          {selectedGateway && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-3 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Gateway UUID</p>
                  <p className="font-mono font-medium">{selectedGateway.gatewayUuid}</p>
                </div>
                <div className="rounded-lg border p-3 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant={selectedGateway.provisioned ? 'success' : 'secondary'}>
                    {selectedGateway.provisioned ? 'Provisioned' : 'Not Provisioned'}
                  </Badge>
                </div>
                <div className="rounded-lg border p-3 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Signal Strength</p>
                  {getSignalStrengthBadge(selectedGateway.lastSignalStrength)}
                </div>
                <div className="rounded-lg border p-3 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Firmware Version</p>
                  <p className="font-medium">{selectedGateway.firmwareVersion || '—'}</p>
                </div>
                <div className="rounded-lg border p-3 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Bootloader Version</p>
                  <p className="font-medium">{selectedGateway.bootloaderVersion || '—'}</p>
                </div>
                <div className="rounded-lg border p-3 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Last Check-in</p>
                  <p className="font-medium">{selectedGateway.lastCheckinTime ? new Date(selectedGateway.lastCheckinTime).toLocaleString() : 'Never'}</p>
                </div>
                <div className="rounded-lg border p-3 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Assigned On</p>
                  <p className="font-medium">{selectedGateway.assignedOn ? new Date(selectedGateway.assignedOn).toLocaleDateString() : '—'}</p>
                </div>
                <div className="rounded-lg border p-3 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Shipped On</p>
                  <p className="font-medium">{selectedGateway.shippedOn ? new Date(selectedGateway.shippedOn).toLocaleDateString() : '—'}</p>
                </div>
              </div>

              {selectedGateway.whitelistedDevices && selectedGateway.whitelistedDevices.length > 0 && (
                <div>
                  <h4 className="mb-3 font-semibold">Whitelisted Devices ({selectedGateway.whitelistedDevices.length})</h4>
                  <div className="rounded-lg border dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Sensor Code</th>
                          <th className="px-4 py-2 text-left font-medium">MAC Address</th>
                          <th className="px-4 py-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGateway.whitelistedDevices.map((device, idx) => (
                          <tr key={idx} className="border-b last:border-0 dark:border-gray-700">
                            <td className="px-4 py-2">{device.sensorCode}</td>
                            <td className="px-4 py-2 font-mono text-xs">{device.macAddress}</td>
                            <td className="px-4 py-2">
                              <Badge variant={device.whitelistStatus === 'CO' ? 'success' : 'secondary'}>
                                {device.whitelistStatus === 'CO' ? 'Confirmed' : device.whitelistStatus === 'RE' ? 'Registered' : device.whitelistStatus}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedGateway.properties && selectedGateway.properties.length > 0 && (
                <div>
                  <h4 className="mb-3 font-semibold">Properties ({selectedGateway.properties.length})</h4>
                  <div className="rounded-lg border dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Key</th>
                          <th className="px-4 py-2 text-left font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGateway.properties.map((prop, idx) => (
                          <tr key={idx} className="border-b last:border-0 dark:border-gray-700">
                            <td className="px-4 py-2 font-mono">{prop.key}</td>
                            <td className="px-4 py-2">{prop.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => handleSyncGateway(selectedGateway.gatewayUuid)}>
                  <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} />
                  Sync
                </Button>
                <Button variant="outline" className="flex-1 text-red-600" onClick={() => { handleUnlinkGateway(selectedGateway.id); setShowDetailsModal(false); }}>
                  <Unlink className="mr-2 h-4 w-4" />
                  Unlink
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
