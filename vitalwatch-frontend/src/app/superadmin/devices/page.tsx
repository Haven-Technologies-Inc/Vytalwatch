'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import { tenoviApi, organizationsApi } from '@/services/api';
import { OrderStatusBadge } from '@/components/devices/OrderStatusBadge';
import { OrderTimeline } from '@/components/devices/OrderTimeline';
import type { TenoviOrder, TenoviHwiDevice, TenoviDeviceStats, Organization } from '@/types';
import { Package, Truck, CheckCircle2, Clock, AlertTriangle, RefreshCw, Loader2, Eye, ShoppingCart, Wifi } from 'lucide-react';
import Link from 'next/link';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'PE', label: 'Pending' },
  { value: 'SH', label: 'Shipped' },
  { value: 'DE', label: 'Delivered' },
  { value: 'OH', label: 'On Hold' },
];

export default function SuperAdminDevicesPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<TenoviOrder[]>([]);
  const [devices, setDevices] = useState<TenoviHwiDevice[]>([]);
  const [stats, setStats] = useState<TenoviDeviceStats | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<TenoviOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersRes, devicesRes, statsRes, orgsRes] = await Promise.all([
        tenoviApi.listBulkOrders({ limit: 100 }),
        tenoviApi.listDevices({ limit: 200 }),
        tenoviApi.getStats(),
        organizationsApi.getAll({ limit: 50 }).catch(() => ({ data: { data: [] } })),
      ]);
      setOrders(ordersRes.data?.results || []);
      setDevices(devicesRes.data?.results || []);
      setStats(statsRes.data || null);
      setOrganizations(orgsRes.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast({ title: 'Error', description: 'Failed to load device data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await tenoviApi.syncAll();
      toast({ title: 'Sync Complete', description: `Synced ${result.data?.synced || 0} devices`, type: 'success' });
      await fetchData();
    } catch { toast({ title: 'Sync Failed', type: 'error' }); }
    setSyncing(false);
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'all' && o.shippingStatus !== statusFilter) return false;
    return true;
  });

  const pendingOrders = orders.filter(o => ['PE', 'RQ', 'CR'].includes(o.shippingStatus || '')).length;
  const shippedOrders = orders.filter(o => o.shippingStatus === 'SH').length;
  const deliveredOrders = orders.filter(o => o.shippingStatus === 'DE').length;

  const buildTimeline = (order: TenoviOrder) => {
    const status = order.shippingStatus || '';
    const statusOrder = ['RQ', 'PE', 'CR', 'RS', 'SH', 'DE'];
    const currentIndex = statusOrder.indexOf(status);
    return [
      { label: 'Order Placed', status: currentIndex >= 0 ? 'completed' as const : 'pending' as const, date: order.created ? new Date(order.created).toLocaleDateString() : undefined },
      { label: 'Processing', status: currentIndex >= 2 ? 'completed' as const : currentIndex >= 1 ? 'current' as const : 'pending' as const },
      { label: 'Ready to Ship', status: currentIndex >= 3 ? 'completed' as const : currentIndex === 2 ? 'current' as const : 'pending' as const },
      { label: 'Shipped', status: currentIndex >= 4 ? 'completed' as const : currentIndex === 3 ? 'current' as const : 'pending' as const },
      { label: 'Delivered', status: currentIndex >= 5 ? 'completed' as const : currentIndex === 4 ? 'current' as const : 'pending' as const },
    ];
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading device data...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Device Management</h1>
            <p className="text-sm text-gray-500">SuperAdmin view - Monitor all orders and devices</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync All
            </Button>
            <Link href="/admin/devices/order">
              <Button><ShoppingCart className="mr-2 h-4 w-4" />New Order</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard title="Total Orders" value={orders.length} icon={<Package className="h-5 w-5" />} />
          <MetricCard title="Pending" value={pendingOrders} icon={<Clock className="h-5 w-5" />} className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20" />
          <MetricCard title="Shipped" value={shippedOrders} icon={<Truck className="h-5 w-5" />} className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20" />
          <MetricCard title="Delivered" value={deliveredOrders} icon={<CheckCircle2 className="h-5 w-5" />} className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20" />
          <MetricCard title="Active Devices" value={stats?.active || 0} icon={<Wifi className="h-5 w-5" />} />
        </div>

        {pendingOrders > 5 && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="font-medium text-yellow-800 dark:text-yellow-400">{pendingOrders} orders pending - Review required</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Select options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} className="w-40" />
          <Link href="/superadmin/devices/orders">
            <Button variant="outline">View All Orders</Button>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Order #</th>
                <th className="px-4 py-3 text-left font-medium">Recipient</th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Devices</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.slice(0, 20).map(order => (
                <tr key={order.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-mono">{order.orderNumber || order.id?.slice(0, 8)}</td>
                  <td className="px-4 py-3">{order.shippingName || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{order.shippingCity}, {order.shippingState}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={order.shippingStatus} size="sm" /></td>
                  <td className="px-4 py-3">{order.contents?.length || 0} type(s)</td>
                  <td className="px-4 py-3 text-gray-500">{order.created ? new Date(order.created).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No orders found</p>
            </div>
          )}
        </div>

        <Modal isOpen={showOrderModal} onClose={() => setShowOrderModal(false)} title="Order Details" size="lg">
          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-sm text-gray-500">Order #{selectedOrder.orderNumber || selectedOrder.id?.slice(0, 8)}</p>
                  <p className="text-xl font-semibold">{selectedOrder.shippingName}</p>
                </div>
                <OrderStatusBadge status={selectedOrder.shippingStatus} size="lg" />
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Shipping Address</p>
                  <p>{selectedOrder.shippingAddress}</p>
                  <p>{selectedOrder.shippingCity}, {selectedOrder.shippingState} {selectedOrder.shippingZipCode}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p>{selectedOrder.created ? new Date(selectedOrder.created).toLocaleString() : '-'}</p>
                </div>
              </div>

              {selectedOrder.contents && selectedOrder.contents.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Ordered Devices</p>
                  <div className="space-y-2">
                    {selectedOrder.contents.map((item: { name: string; quantity: number }, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <span>{item.name}</span>
                        <Badge variant="secondary">x{item.quantity}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-4">Order Progress</p>
                <OrderTimeline steps={buildTimeline(selectedOrder)} />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
