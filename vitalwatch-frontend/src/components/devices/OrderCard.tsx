'use client';
import { TenoviOrder } from '@/types';
import { OrderStatusBadge } from './OrderStatusBadge';
import { Package, MapPin, Calendar } from 'lucide-react';

interface Props { order: TenoviOrder; onClick?: () => void; }

export function OrderCard({ order, onClick }: Props) {
  return (
    <div onClick={onClick} className="bg-white dark:bg-gray-800 rounded-xl border p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-sm text-gray-500">#{order.orderNumber || order.id?.slice(0, 8)}</p>
          <p className="font-semibold text-lg">{order.shippingName || 'Unknown Recipient'}</p>
        </div>
        <OrderStatusBadge status={order.shippingStatus} />
      </div>
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{order.shippingCity}, {order.shippingState} {order.shippingZipCode}</span>
        </div>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          <span>{order.contents?.length || 0} device type(s)</span>
        </div>
        {order.created && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(order.created).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
