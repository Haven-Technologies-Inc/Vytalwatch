'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { tenoviApi } from '@/services/api';
import { Package, Loader2, Plus, Trash2, Truck, Search, ShieldCheck, Wifi } from 'lucide-react';
import Link from 'next/link';
import { safeArray } from '@/lib/utils';

interface CatalogDevice { id: string; name: string; sensor_code: string; category: string; brand: string; description: string; connection: string; in_stock: boolean; deprecated: boolean; fda_status: string | null; metrics: Array<{ metric: string; unit: string }>; }
interface DeviceCategory { key: string; label: string; icon: string; }
interface CartItem { device: CatalogDevice; quantity: number; }

const CAT_ICONS: Record<string, string> = { bpm: '🩺', scale: '⚖️', pulse_ox: '💓', glucometer: '🩸', thermometer: '🌡️', peak_flow: '🌬️', pillbox: '💊', watch: '⌚', gateway: '📡', fetal: '👶', contactless: '📻' };

function DeviceOrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prescriptionId = searchParams.get('prescriptionId');
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<CatalogDevice[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<'browse' | 'shipping'>('browse');
  const [form, setForm] = useState({ shippingName: '', shippingAddress: '', shippingCity: '', shippingState: '', shippingZipCode: '', notifyEmails: '' });

  useEffect(() => {
    (async () => {
      try {
        const res = await tenoviApi.getCatalog();
        const data = (res.data as any)?.data || res.data;
        setCatalog(data.devices || []);
        setCategories(data.categories || []);
      } catch {
        toast({ title: 'Failed to load device catalog', type: 'error' });
      } finally { setLoading(false); }
    })();
  }, []);
  const filtered = useMemo(() => {
    let d = catalog.filter(x => !x.deprecated && x.in_stock);
    if (selCat !== 'all') d = d.filter(x => x.category === selCat);
    if (search) { const s = search.toLowerCase(); d = d.filter(x => x.name.toLowerCase().includes(s) || x.brand.toLowerCase().includes(s) || x.description.toLowerCase().includes(s)); }
    return d;
  }, [catalog, selCat, search]);

  const addToCart = (device: CatalogDevice) => {
    const exists = cart.find(c => c.device.id === device.id);
    if (exists) { setCart(cart.map(c => c.device.id === device.id ? { ...c, quantity: c.quantity + 1 } : c)); }
    else { setCart([...cart, { device, quantity: 1 }]); }
    toast({ title: `${device.name} added`, type: 'success' });
  };

  const updateQty = (id: string, qty: number) => { if (qty < 1) return; setCart(cart.map(c => c.device.id === id ? { ...c, quantity: qty } : c)); };
  const removeFromCart = (id: string) => setCart(cart.filter(c => c.device.id !== id));
  const totalDevices = cart.reduce((s, c) => s + c.quantity, 0);

  const handleSubmit = async () => {
    if (!form.shippingName || !form.shippingAddress || !form.shippingCity || !form.shippingZipCode) {
      toast({ title: 'Missing Fields', description: 'Fill all required shipping fields', type: 'error' }); return;
    }
    if (cart.length === 0) { toast({ title: 'No Devices', description: 'Add at least one device', type: 'error' }); return; }
    setSubmitting(true);
    try {
      await tenoviApi.createBulkOrder({ ...form, contents: cart.map(c => ({ name: c.device.name, quantity: c.quantity })), prescriptionId: prescriptionId || undefined });
      toast({ title: 'Order Submitted', description: `${totalDevices} device(s) ordered successfully`, type: 'success' });
      router.push('/admin/devices/orders');
    } catch { toast({ title: 'Order Failed', type: 'error' }); }
    setSubmitting(false);
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div></DashboardLayout>;
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/devices"><Button variant="ghost" size="sm">← Back</Button></Link>
            <h1 className="text-2xl font-bold">Order Devices</h1>
            {prescriptionId && <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">From Prescription</span>}
          </div>
          {cart.length > 0 && step === 'browse' && (
            <Button onClick={() => setStep('shipping')} className="gap-2"><Truck className="h-4 w-4" />Checkout ({totalDevices})</Button>
          )}
          {step === 'shipping' && <Button variant="outline" onClick={() => setStep('browse')}>← Back to Catalog</Button>}
        </div>

        {step === 'browse' && (
          <>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search devices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={selCat === 'all' ? 'primary' : 'outline'} onClick={() => setSelCat('all')}>All</Button>
                {categories.map(cat => (
                  <Button key={cat.key} size="sm" variant={selCat === cat.key ? 'primary' : 'outline'} onClick={() => setSelCat(cat.key)}>
                    {CAT_ICONS[cat.key] || '📦'} {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(device => {
                const inCart = cart.find(c => c.device.id === device.id);
                return (
                  <div key={device.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 space-y-3 transition-all ${inCart ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">{device.name}</h3>
                        <p className="text-xs text-gray-500">{device.brand}</p>
                      </div>
                      <span className="text-lg">{CAT_ICONS[device.category] || '📦'}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{device.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {device.connection === 'cellular' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Wifi className="h-3 w-3" />Cellular</span>}
                      {device.connection === 'cellular_gateway' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Wifi className="h-3 w-3" />Gateway</span>}
                      {device.fda_status && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldCheck className="h-3 w-3" />FDA {device.fda_status}</span>}
                    </div>
                    {safeArray(device.metrics).length > 0 && <p className="text-xs text-gray-500">Metrics: {safeArray<{ metric: string }>(device.metrics).map(m => m.metric.replace(/_/g, ' ')).join(', ')}</p>}
                    <div className="flex items-center justify-between pt-2 border-t">
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateQty(device.id, inCart.quantity - 1)}>-</Button>
                          <span className="text-sm font-medium w-6 text-center">{inCart.quantity}</span>
                          <Button size="sm" variant="outline" onClick={() => updateQty(device.id, inCart.quantity + 1)}>+</Button>
                          <Button size="sm" variant="ghost" onClick={() => removeFromCart(device.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => addToCart(device)} className="gap-1"><Plus className="h-3 w-3" />Add</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {filtered.length === 0 && <div className="text-center py-12 text-gray-500">No devices found matching your criteria.</div>}
          </>
        )}
        {step === 'shipping' && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><Package className="h-5 w-5" />Order Summary ({totalDevices} device{totalDevices !== 1 ? 's' : ''})</h2>
              {cart.map(item => (
                <div key={item.device.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{item.device.name}</p>
                    <p className="text-xs text-gray-500">{item.device.brand} | {item.device.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateQty(item.device.id, item.quantity - 1)}>-</Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button size="sm" variant="outline" onClick={() => updateQty(item.device.id, item.quantity + 1)}>+</Button>
                    <Button size="sm" variant="ghost" onClick={() => removeFromCart(item.device.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><Truck className="h-5 w-5" />Shipping Information</h2>
              <Input placeholder="Recipient Name *" value={form.shippingName} onChange={e => setForm({ ...form, shippingName: e.target.value })} />
              <Input placeholder="Street Address *" value={form.shippingAddress} onChange={e => setForm({ ...form, shippingAddress: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="City *" value={form.shippingCity} onChange={e => setForm({ ...form, shippingCity: e.target.value })} />
                <Input placeholder="State *" value={form.shippingState} onChange={e => setForm({ ...form, shippingState: e.target.value })} />
                <Input placeholder="ZIP *" value={form.shippingZipCode} onChange={e => setForm({ ...form, shippingZipCode: e.target.value })} />
              </div>
              <Input placeholder="Notification Emails (comma-separated)" value={form.notifyEmails} onChange={e => setForm({ ...form, notifyEmails: e.target.value })} />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : `Submit Order (${totalDevices} device${totalDevices !== 1 ? 's' : ''})`}
            </Button>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function DeviceOrderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
      <DeviceOrderPageContent />
    </Suspense>
  );
}