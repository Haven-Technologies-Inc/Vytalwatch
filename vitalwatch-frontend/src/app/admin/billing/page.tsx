'use client';

import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { useToast } from '@/hooks/useToast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { apiClient } from '@/services/api/client';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { TrendChart } from '@/components/dashboard/Charts';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  DollarSign,
  CreditCard,
  FileText,
  Download,
  Eye,
  TrendingUp,
  Users,
  Building2
} from 'lucide-react';

interface Invoice {
  id: string;
  organization: string;
  plan: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
  dueDate: string;
}

interface RevenueDataPoint {
  name: string;
  value: number;
}

interface InvoicesResponse {
  data: Invoice[];
}

interface RevenueResponse {
  data: {
    trend: RevenueDataPoint[];
    totalRevenue: number;
    mrrGrowth: number;
  };
}

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
];

export default function AdminBillingPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const {
    data: invoicesRes,
    isLoading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useApiQuery<InvoicesResponse>(
    () => apiClient.get<InvoicesResponse>('/billing/invoices'),
  );

  const {
    data: revenueRes,
    isLoading: revenueLoading,
    error: revenueError,
    refetch: refetchRevenue,
  } = useApiQuery<RevenueResponse>(
    () => apiClient.get<RevenueResponse>('/analytics/revenue'),
  );

  const invoices: Invoice[] = invoicesRes?.data ?? [];
  const revenueData: RevenueDataPoint[] = revenueRes?.data?.trend ?? [];

  const handleExportReport = useCallback(async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({ title: 'Export complete', description: 'Billing report downloaded', type: 'success' });
    } finally {
      setIsExporting(false);
    }
  }, [toast]);

  const handleDownloadInvoice = useCallback((invoice: Invoice) => {
    toast({ title: 'Downloading', description: `Invoice ${invoice.id} downloading...`, type: 'info' });
  }, [toast]);

  const handleSendReminder = useCallback((invoice: Invoice) => {
    toast({ title: 'Reminder sent', description: `Payment reminder sent for ${invoice.id}`, type: 'success' });
  }, [toast]);

  const filteredInvoices = invoices.filter((i) => statusFilter === 'all' || i.status === statusFilter);

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const pendingRevenue = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);
  const pendingCount = invoices.filter(i => i.status === 'pending').length;

  const columns: Column<Invoice>[] = [
    { key: 'id', header: 'Invoice #', render: (id: string) => <span className="font-mono text-sm">{id}</span> },
    {
      key: 'organization',
      header: 'Organization',
      render: (_, inv) => (
        <div>
          <p className="font-medium">{inv.organization}</p>
          <p className="text-xs text-gray-500">{inv.plan}</p>
        </div>
      )
    },
    { key: 'amount', header: 'Amount', render: (v: number) => `$${v.toLocaleString()}` },
    {
      key: 'status',
      header: 'Status',
      render: (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'danger'> = {
          paid: 'success',
          pending: 'warning',
          overdue: 'danger',
        };
        return <Badge variant={variants[status]}>{status}</Badge>;
      }
    },
    { key: 'date', header: 'Date', render: (d: string) => new Date(d).toLocaleDateString() },
    { key: 'dueDate', header: 'Due Date', render: (d: string) => new Date(d).toLocaleDateString() },
  ];

  const isLoading = invoicesLoading || revenueLoading;
  const error = invoicesError || revenueError;

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading billing data..." />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState message={error} onRetry={() => { refetchInvoices(); refetchRevenue(); }} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage invoices and subscriptions</p>
          </div>
          <Button variant="outline" onClick={handleExportReport} disabled={isExporting}>
            <Download className={`mr-2 h-4 w-4 ${isExporting ? 'animate-pulse' : ''}`} />
            {isExporting ? 'Exporting...' : 'Export Report'}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Revenue (MTD)"
            value={`$${totalRevenue.toLocaleString()}`}
            icon={<DollarSign className="h-5 w-5" />}
            trend={{ value: revenueRes?.data?.mrrGrowth ?? 0, isPositive: true }}
            className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
          />
          <MetricCard
            title="Pending"
            value={`$${pendingRevenue.toLocaleString()}`}
            subtitle={`${pendingCount} invoices`}
            icon={<FileText className="h-5 w-5" />}
            className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20"
          />
          <MetricCard
            title="Active Subscriptions"
            value={invoices.length.toString()}
            subtitle="All organizations"
            icon={<Building2 className="h-5 w-5" />}
          />
          <MetricCard
            title="MRR Growth"
            value={`+${revenueRes?.data?.mrrGrowth ?? 0}%`}
            subtitle="vs last month"
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold">Revenue Trend</h3>
          <TrendChart data={revenueData} color="#10b981" height={200} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold">Invoices</h3>
            <Select options={statusFilters} value={statusFilter} onChange={setStatusFilter} className="w-36" />
          </div>
          <div className="p-4">
            <DataTable
              data={filteredInvoices}
              columns={columns}
              onRowClick={(inv) => { setSelectedInvoice(inv); setShowModal(true); }}
              actions={[
                { label: 'View', icon: <Eye className="h-4 w-4" />, onClick: (inv) => { setSelectedInvoice(inv); setShowModal(true); } },
                { label: 'Download', icon: <Download className="h-4 w-4" />, onClick: (inv) => handleDownloadInvoice(inv) },
              ]}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold">Subscription Plans</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { name: 'Starter', price: '$299/mo', orgs: 1, patients: 35 },
              { name: 'Professional', price: '$799/mo', orgs: 2, patients: 300 },
              { name: 'Enterprise', price: 'Custom', orgs: 2, patients: 730 },
            ].map((plan) => (
              <div key={plan.name} className="rounded-lg border p-4 dark:border-gray-700">
                <p className="font-semibold text-gray-900 dark:text-white">{plan.name}</p>
                <p className="text-2xl font-bold text-primary">{plan.price}</p>
                <p className="mt-2 text-sm text-gray-500">{plan.orgs} orgs • {plan.patients} patients</p>
              </div>
            ))}
          </div>
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Invoice ${selectedInvoice?.id}`} size="md">
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-sm text-gray-500">Organization</p><p className="font-medium">{selectedInvoice.organization}</p></div>
                <div><p className="text-sm text-gray-500">Plan</p><p className="font-medium">{selectedInvoice.plan}</p></div>
                <div><p className="text-sm text-gray-500">Amount</p><p className="font-medium">${selectedInvoice.amount.toLocaleString()}</p></div>
                <div><p className="text-sm text-gray-500">Status</p><Badge variant={selectedInvoice.status === 'paid' ? 'success' : 'warning'}>{selectedInvoice.status}</Badge></div>
                <div><p className="text-sm text-gray-500">Invoice Date</p><p className="font-medium">{new Date(selectedInvoice.date).toLocaleDateString()}</p></div>
                <div><p className="text-sm text-gray-500">Due Date</p><p className="font-medium">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p></div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => handleDownloadInvoice(selectedInvoice)}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
                {selectedInvoice.status === 'pending' && <Button className="flex-1" onClick={() => handleSendReminder(selectedInvoice)}>Send Reminder</Button>}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
