'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { tenoviApi } from '@/services/api';
import { ClipboardList, Loader2, Plus, Trash2, Search } from 'lucide-react';
import Link from 'next/link';

interface CatalogDevice { id: string; name: string; sensor_code: string; category: string; brand: string; description: string; connection: string; in_stock: boolean; deprecated: boolean; fda_status: string | null; metrics: Array<{ metric: string; unit: string }>; }
interface SelectedDevice { device: CatalogDevice; quantity: number; }

const CAT_ICONS: Record<string, string> = { bpm: '🩺', scale: '⚖️', pulse_ox: '💓', glucometer: '🩸', thermometer: '🌡️', peak_flow: '🌬️', pillbox: '💊', watch: '⌚', gateway: '📡', fetal: '👶', contactless: '📻' };

export default function NewPrescriptionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<CatalogDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SelectedDevice[]>([]);
  const [form, setForm] = useState({ patientId: '', patientName: '', clinicalReason: '', icdCode: '', notes: '' });

  useEffect(() => {
    (async () => {
      try {
        const res = await tenoviApi.getCatalog();
        const data = (res.data as any)?.data || res.data;
        setCatalog((data.devices || []).filter((d: CatalogDevice) => !d.deprecated && d.in_stock));
      } catch { toast({ title: 'Failed to load catalog', type: 'error' }); }
      finally { setLoading(false); }
    })();
  }, []);

  const addDevice = (device: CatalogDevice) => {
    const exists = selected.find(s => s.device.id === device.id);
    if (exists) { setSelected(selected.map(s => s.device.id === device.id ? { ...s, quantity: s.quantity + 1 } : s)); }
    else { setSelected([...selected, { device, quantity: 1 }]); }
  };

  const handleSubmit = async () => {
    if (!form.patientId) { toast({ title: 'Patient ID required', type: 'error' }); return; }
    if (selected.length === 0) { toast({ title: 'Select at least one device', type: 'error' }); return; }
    setSubmitting(true);
    try {
      await tenoviApi.createPrescription({
        patientId: form.patientId, patientName: form.patientName,
        devices: selected.map(s => ({ catalogId: s.device.id, name: s.device.name, quantity: s.quantity, category: s.device.category, brand: s.device.brand })),
        clinicalReason: form.clinicalReason || undefined, icdCode: form.icdCode || undefined, notes: form.notes || undefined,
      });
      toast({ title: 'Prescription created', type: 'success' });
      router.push('/admin/devices/prescriptions');
    } catch { toast({ title: 'Failed to create prescription', type: 'error' }); }
    setSubmitting(false);
  };

  const filteredCatalog = search ? catalog.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.brand.toLowerCase().includes(search.toLowerCase())) : catalog;
  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/devices/prescriptions"><Button variant="ghost" size="sm">← Back</Button></Link>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6" />New Device Prescription</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Patient Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Patient ID *" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} />
            <Input placeholder="Patient Name" value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })} />
          </div>
          <Input placeholder="Clinical Reason" value={form.clinicalReason} onChange={e => setForm({ ...form, clinicalReason: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="ICD Code (optional)" value={form.icdCode} onChange={e => setForm({ ...form, icdCode: e.target.value })} />
            <Input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        {selected.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-3">
            <h2 className="font-semibold">Selected Devices ({selected.length})</h2>
            {selected.map(s => (
              <div key={s.device.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{CAT_ICONS[s.device.category] || '📦'} {s.device.name}</p>
                  <p className="text-xs text-gray-500">{s.device.brand}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelected(selected.map(x => x.device.id === s.device.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}>-</Button>
                  <span className="w-6 text-center text-sm">{s.quantity}</span>
                  <Button size="sm" variant="outline" onClick={() => setSelected(selected.map(x => x.device.id === s.device.id ? { ...x, quantity: x.quantity + 1 } : x))}>+</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(selected.filter(x => x.device.id !== s.device.id))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Add Devices from Catalog</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search devices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
            {filteredCatalog.map(d => {
              const inSelected = selected.find(s => s.device.id === d.id);
              return (
                <div key={d.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${inSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`} onClick={() => addDevice(d)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{CAT_ICONS[d.category] || '📦'} {d.name}</p>
                    <p className="text-xs text-gray-500">{d.brand} | {d.category}</p>
                  </div>
                  {inSelected ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">x{inSelected.quantity}</span> : <Plus className="h-4 w-4 text-gray-400" />}
                </div>
              );
            })}
          </div>
        </div>

        <Button className="w-full" onClick={handleSubmit} disabled={submitting || selected.length === 0}>
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : `Create Prescription (${selected.reduce((s, x) => s + x.quantity, 0)} device${selected.reduce((s, x) => s + x.quantity, 0) !== 1 ? 's' : ''})`}
        </Button>
      </div>
    </DashboardLayout>
  );
}