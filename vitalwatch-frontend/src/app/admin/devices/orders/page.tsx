'use client';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { tenoviApi } from '@/services/api';
import type { TenoviOrder } from '@/types';
import { Package, Plus, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function OrdersPage() {
  const [orders, setOrders] = useState<TenoviOrder[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { tenoviApi.listBulkOrders({limit:50}).then(r => setOrders(r.data?.results||[])).finally(() => setLoading(false)); }, []);
  if (loading) return <DashboardLayout><div className="flex h-96 justify-center items-center"><Loader2 className="h-8 w-8 animate-spin"/></div></DashboardLayout>;
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Device Orders</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => location.reload()}><RefreshCw className="h-4 w-4 mr-1"/>Refresh</Button>
            <Link href="/admin/devices/order"><Button><Plus className="h-4 w-4 mr-1"/>New Order</Button></Link>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700"><tr>
              <th className="px-4 py-3 text-left">Order #</th><th className="px-4 py-3 text-left">Recipient</th>
              <th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Created</th>
            </tr></thead>
            <tbody>{orders.map(o => (
              <tr key={o.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 font-mono">{o.orderNumber||o.id.slice(0,8)}</td>
                <td className="px-4 py-3">{o.shippingName||'—'}</td>
                <td className="px-4 py-3"><Badge variant={o.shippingStatus==='DE'?'success':'secondary'}>{o.shippingStatus||'Pending'}</Badge></td>
                <td className="px-4 py-3">{o.created?new Date(o.created).toLocaleDateString():'—'}</td>
              </tr>
            ))}</tbody>
          </table>
          {orders.length===0 && <div className="text-center py-12"><Package className="h-12 w-12 mx-auto text-gray-300 mb-2"/><p>No orders yet</p></div>}
        </div>
      </div>
    </DashboardLayout>
  );
}
