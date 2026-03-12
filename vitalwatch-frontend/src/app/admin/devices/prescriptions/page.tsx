'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { tenoviApi } from '@/services/api';
import { ClipboardList, Loader2, Eye, CheckCircle, XCircle, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { safeArray } from '@/lib/utils';

interface Prescription {
  id: string;
  patientId: string;
  patientName?: string;
  providerId: string;
  providerName?: string;
  status: string;
  devices: Array<{ catalogId: string; name: string; quantity: number; category: string; brand: string }>;
  clinicalReason?: string;
  icdCode?: string;
  notes?: string;
  orderId?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  ordered: 'bg-blue-100 text-blue-800',
  fulfilled: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function PrescriptionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPrescriptions = async () => {
    try {
      const res = await tenoviApi.listPrescriptions(statusFilter ? { status: statusFilter } : {});
      const data = (res.data as any)?.data || res.data;
      setPrescriptions(data.results || []);
    } catch { toast({ title: 'Failed to load prescriptions', type: 'error' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPrescriptions(); }, [statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      await tenoviApi.approvePrescription(id);
      toast({ title: 'Prescription approved', type: 'success' });
      fetchPrescriptions();
    } catch { toast({ title: 'Failed to approve', type: 'error' }); }
  };

  const handleCancel = async (id: string) => {
    try {
      await tenoviApi.cancelPrescription(id);
      toast({ title: 'Prescription cancelled', type: 'success' });
      fetchPrescriptions();
    } catch { toast({ title: 'Failed to cancel', type: 'error' }); }
  };
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/devices"><Button variant="ghost" size="sm">← Back</Button></Link>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6" />Device Prescriptions</h1>
          </div>
          <Link href="/admin/devices/prescriptions/new"><Button className="gap-2">+ New Prescription</Button></Link>
        </div>

        <div className="flex gap-2">
          {['', 'pending', 'approved', 'ordered', 'fulfilled', 'cancelled'].map(s => (
            <Button key={s} size="sm" variant={statusFilter === s ? 'primary' : 'outline'} onClick={() => setStatusFilter(s)}>
              {s || 'All'}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No prescriptions found.</div>
        ) : (
          <div className="space-y-4">
            {prescriptions.map(rx => (
              <div key={rx.id} className="bg-white dark:bg-gray-800 rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{rx.patientName || rx.patientId}</p>
                    <p className="text-xs text-gray-500">By {rx.providerName || rx.providerId} | {new Date(rx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[rx.status] || 'bg-gray-100 text-gray-800'}`}>{rx.status}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {safeArray<{ name: string; quantity: number }>(rx.devices).map((d, i) => (
                    <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{d.name} x{d.quantity}</span>
                  ))}
                </div>
                {rx.clinicalReason && <p className="text-xs text-gray-600 dark:text-gray-400">Reason: {rx.clinicalReason}</p>}
                {rx.icdCode && <p className="text-xs text-gray-600 dark:text-gray-400">ICD: {rx.icdCode}</p>}
                <div className="flex gap-2 pt-2 border-t">
                  {rx.status === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => handleApprove(rx.id)} className="gap-1"><CheckCircle className="h-3 w-3" />Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleCancel(rx.id)} className="gap-1 text-red-600"><XCircle className="h-3 w-3" />Cancel</Button>
                    </>
                  )}
                  {rx.status === 'approved' && (
                    <Link href={`/admin/devices/order?prescriptionId=${rx.id}`}>
                      <Button size="sm" className="gap-1"><ShoppingCart className="h-3 w-3" />Place Order</Button>
                    </Link>
                  )}
                  {rx.orderId && <span className="text-xs text-gray-500">Order: {rx.orderId}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}