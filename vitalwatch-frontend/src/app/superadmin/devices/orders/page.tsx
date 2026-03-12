'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { tenoviApi } from '@/services/api';
import { OrderStatusBadge } from '@/components/devices/OrderStatusBadge';
import { OrderCard } from '@/components/devices/OrderCard';
import type { TenoviOrder } from '@/types';
import { Package, Search, RefreshCw, Loader2, ArrowLeft, Grid, List } from 'lucide-react';
import Link from 'next/link';
import { extractData, extractArray } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'PE', label: 'Pending' },
  { value: 'CR', label: 'Created' },
  { value: 'RS', label: 'Ready to Ship' },
  { value: 'SH', label: 'Shipped' },
  { value: 'DE', label: 'Delivered' },
  { value: 'OH', label: 'On Hold' },
  { value: 'CA', label: 'Cancelled' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped (Local)' },
  { value: 'delivered', label: 'Delivered (Local)' },
];

export default function SuperAdminOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<TenoviOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    tenoviApi.listBulkOrders({ limit: 200 })
      .then(res => { const inner = extractData<{ results?: TenoviOrder[] }>(res); setOrders(inner?.results ?? extractArray<TenoviOrder>(res)); })
      .catch(() => toast({ title: 'Failed to load orders', type: 'error' }))
      .finally(() => setLoading(false));
  }, [toast]);

  const getStatus = (o: TenoviOrder) => o.shippingStatus || o.status || '';
  const getDate = (o: TenoviOrder) => o.created || o.createdAt || '';

  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'all' && getStatus(o) !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (o.shippingName?.toLowerCase().includes(q) || o.orderNumber?.toLowerCase().includes(q) || o.shippingCity?.toLowerCase().includes(q));
    }
    return true;
  });

  const statusCounts = orders.reduce((acc, o) => {
    const s = getStatus(o) || 'unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/superadmin/devices">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">All Device Orders</h1>
            <p className="text-sm text-gray-500">{orders.length} total orders</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button key={status} onClick={() => setStatusFilter(status === statusFilter ? 'all' : status)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${status === statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>
              {status}: {count}
            </button>
          ))}
        </div>

        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} className="w-40" />
          <div className="flex border rounded-lg">
            <Button variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'grid' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}><Grid className="h-4 w-4" /></Button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Order #</th>
                  <th className="px-4 py-3 text-left">Recipient</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Devices</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => (
                  <tr key={o.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-mono">{o.orderNumber || o.id?.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-medium">{o.shippingName || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{o.shippingCity}, {o.shippingState}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={o.shippingStatus || o.status} size="sm" /></td>
                    <td className="px-4 py-3">{o.totalDevices || o.contents?.length || 0}</td>
                    <td className="px-4 py-3 text-gray-500">{getDate(o) ? new Date(getDate(o)).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>No orders match your filters</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
