'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import { tenoviApi } from '@/services/api';
import { Package, Loader2, Plus, Trash2, Truck } from 'lucide-react';
import Link from 'next/link';

const DEVICE_OPTIONS = [
  { value: 'Tenovi BPM', label: 'Blood Pressure Monitor' },
  { value: 'Tenovi Scale', label: 'Weight Scale' },
  { value: 'Tenovi Pulse Ox', label: 'Pulse Oximeter' },
  { value: 'Tenovi BGM', label: 'Blood Glucose Meter' },
  { value: 'Tenovi Gateway', label: 'Gateway Hub' },
];

interface DeviceItem { name: string; quantity: number; }

export default function DeviceOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [devices, setDevices] = useState<DeviceItem[]>([{ name: 'Tenovi BPM', quantity: 1 }]);
  const [form, setForm] = useState({ shippingName: '', shippingAddress: '', shippingCity: '', shippingState: '', shippingZipCode: '', notifyEmails: '' });

  const handleSubmit = async () => {
    if (!form.shippingName || !form.shippingAddress || !form.shippingCity || !form.shippingZipCode) {
      toast({ title: 'Missing Fields', description: 'Fill all required shipping fields', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await tenoviApi.createBulkOrder({ ...form, contents: devices.map(d => ({ name: d.name, quantity: d.quantity })) });
      toast({ title: 'Order Submitted', type: 'success' });
      router.push('/admin/devices/orders');
    } catch { toast({ title: 'Order Failed', type: 'error' }); }
    setSubmitting(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/devices"><Button variant="ghost" size="sm">← Back</Button></Link>
          <h1 className="text-2xl font-bold">Order Devices</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Package className="h-5 w-5"/>Devices</h2>
          {devices.map((d,i) => (
            <div key={i} className="flex gap-2">
              <Select options={DEVICE_OPTIONS} value={d.name} onChange={v => { const a=[...devices]; a[i].name=v; setDevices(a); }} className="flex-1"/>
              <Input type="number" min={1} value={d.quantity} onChange={e => { const a=[...devices]; a[i].quantity=+e.target.value; setDevices(a); }} className="w-20"/>
              {devices.length>1 && <Button variant="ghost" size="sm" onClick={() => setDevices(devices.filter((_,j)=>j!==i))}><Trash2 className="h-4 w-4"/></Button>}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setDevices([...devices,{name:'Tenovi BPM',quantity:1}])}><Plus className="h-4 w-4 mr-1"/>Add Device</Button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Truck className="h-5 w-5"/>Shipping</h2>
          <Input placeholder="Recipient Name *" value={form.shippingName} onChange={e => setForm({...form,shippingName:e.target.value})}/>
          <Input placeholder="Street Address *" value={form.shippingAddress} onChange={e => setForm({...form,shippingAddress:e.target.value})}/>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="City *" value={form.shippingCity} onChange={e => setForm({...form,shippingCity:e.target.value})}/>
            <Input placeholder="State *" value={form.shippingState} onChange={e => setForm({...form,shippingState:e.target.value})}/>
            <Input placeholder="ZIP *" value={form.shippingZipCode} onChange={e => setForm({...form,shippingZipCode:e.target.value})}/>
          </div>
          <Input placeholder="Notification Emails (comma-separated)" value={form.notifyEmails} onChange={e => setForm({...form,notifyEmails:e.target.value})}/>
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>{submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Submitting...</> : 'Submit Order'}</Button>
      </div>
    </DashboardLayout>
  );
}
