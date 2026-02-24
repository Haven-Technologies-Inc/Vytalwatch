'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { reportsApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import type { Report as ReportType } from '@/types';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Modal } from '@/components/ui/Modal';
import { FileText, Download, Plus, Calendar, Clock, RefreshCw, Trash2 } from 'lucide-react';

interface Report {
  id: string;
  name: string;
  type: string;
  frequency: 'one-time' | 'daily' | 'weekly' | 'monthly';
  status: 'completed' | 'processing' | 'scheduled' | 'failed';
  createdAt: string;
  completedAt?: string;
  size?: string;
  createdBy: string;
}

const mockReports: Report[] = [
  { id: '1', name: 'Monthly Revenue Report', type: 'Financial', frequency: 'monthly', status: 'completed', createdAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:05:00Z', size: '2.4 MB', createdBy: 'System' },
  { id: '2', name: 'Patient Outcomes Q4 2025', type: 'Clinical', frequency: 'one-time', status: 'completed', createdAt: '2026-01-10T14:00:00Z', completedAt: '2026-01-10T14:12:00Z', size: '5.1 MB', createdBy: 'Admin' },
  { id: '3', name: 'Weekly Alert Summary', type: 'Operations', frequency: 'weekly', status: 'scheduled', createdAt: '2026-01-15T00:00:00Z', createdBy: 'System' },
  { id: '4', name: 'Device Utilization Report', type: 'Operations', frequency: 'one-time', status: 'processing', createdAt: '2026-01-15T10:30:00Z', createdBy: 'Admin' },
  { id: '5', name: 'Billing Reconciliation', type: 'Financial', frequency: 'monthly', status: 'completed', createdAt: '2025-12-31T00:00:00Z', completedAt: '2025-12-31T00:08:00Z', size: '1.8 MB', createdBy: 'System' },
  { id: '6', name: 'Population Health Analysis', type: 'Clinical', frequency: 'one-time', status: 'failed', createdAt: '2026-01-14T09:00:00Z', createdBy: 'Admin' },
];

const reportTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'Financial', label: 'Financial' },
  { value: 'Clinical', label: 'Clinical' },
  { value: 'Operations', label: 'Operations' },
];

const reportTemplates = [
  { value: 'revenue', label: 'Revenue Report' },
  { value: 'patient-outcomes', label: 'Patient Outcomes' },
  { value: 'alert-summary', label: 'Alert Summary' },
  { value: 'device-utilization', label: 'Device Utilization' },
  { value: 'billing', label: 'Billing Reconciliation' },
  { value: 'population-health', label: 'Population Health' },
  { value: 'adherence', label: 'Medication Adherence' },
  { value: 'provider-performance', label: 'Provider Performance' },
];

export default function AdminReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('revenue');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await reportsApi.getAll({ limit: 100 });
      if (response.data?.results) {
        const mapped: Report[] = response.data.results.map((r: ReportType) => ({
          id: r.id,
          name: r.title || r.name || 'Untitled Report',
          type: r.type || 'Operations',
          frequency: 'one-time' as const,
          status: (r.status || 'completed') as Report['status'],
          createdAt: r.createdAt || '',
          completedAt: r.completedAt,
          size: r.size,
          createdBy: r.createdBy || 'Admin',
        }));
        setReports(mapped);
      }
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerateReport = async () => {
    if (generating) return;

    setGenerating(true);
    try {
      const templateNames: Record<string, string> = {
        revenue: 'Revenue Report',
        'patient-outcomes': 'Patient Outcomes Report',
        'alert-summary': 'Alert Summary Report',
        'device-utilization': 'Device Utilization Report',
        billing: 'Billing Reconciliation Report',
        'population-health': 'Population Health Report',
        adherence: 'Medication Adherence Report',
        'provider-performance': 'Provider Performance Report',
      };

      await reportsApi.generate({
        type: selectedTemplate,
        title: templateNames[selectedTemplate],
        startDate: startDate?.toISOString().split('T')[0],
        endDate: endDate?.toISOString().split('T')[0],
      });

      // Add new report to list
      const newReport: Report = {
        id: `new-${Date.now()}`,
        name: templateNames[selectedTemplate] || 'Custom Report',
        type: selectedTemplate.includes('revenue') || selectedTemplate.includes('billing') ? 'Financial' : 'Operations',
        frequency: 'one-time',
        status: 'processing',
        createdAt: new Date().toISOString(),
        createdBy: 'Admin',
      };
      setReports((prev) => [newReport, ...prev]);
      setShowCreateModal(false);

      // Simulate completion after 3 seconds
      setTimeout(() => {
        setReports((prev) =>
          prev.map((r) =>
            r.id === newReport.id
              ? { ...r, status: 'completed', completedAt: new Date().toISOString(), size: '1.2 MB' }
              : r
          )
        );
      }, 3000);

      toast({ title: 'Report generating', description: 'It will be ready shortly', type: 'info' });
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast({ title: 'Error', description: 'Failed to generate report. Please try again.', type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (report: Report) => {
    if (report.status !== 'completed') {
      alert('Report is not ready for download yet.');
      return;
    }

    try {
      const blob = await reportsApi.download(report.id);
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download report:', error);
      toast({ title: 'Error', description: 'Failed to download report. Please try again.', type: 'error' });
    }
  };

  const handleRegenerateReport = async (report: Report) => {
    setReports((prev) =>
      prev.map((r) => (r.id === report.id ? { ...r, status: 'processing' } : r))
    );

    setTimeout(() => {
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? { ...r, status: 'completed', completedAt: new Date().toISOString() }
            : r
        )
      );
    }, 2000);

    toast({ title: 'Regenerating', description: report.name, type: 'info' });
  };

  const handleDeleteReport = useCallback(async (report: Report) => {
    try {
      await reportsApi.delete(report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast({ title: 'Report deleted', description: report.name, type: 'success' });
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast({ title: 'Error', description: 'Failed to delete report. Please try again.', type: 'error' });
    }
  }, [toast]);

  const filteredReports = reports.filter((r) => typeFilter === 'all' || r.type === typeFilter);

  const columns: Column<Report>[] = [
    {
      key: 'name',
      header: 'Report Name',
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{r.name}</p>
            <p className="text-xs text-gray-500">{r.type}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'frequency',
      header: 'Frequency',
      render: (f: string) => (
        <Badge variant="secondary">{f}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: string) => {
        const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
          completed: 'success',
          processing: 'warning',
          scheduled: 'info',
          failed: 'danger',
        };
        return <Badge variant={variants[s]}>{s}</Badge>;
      },
    },
    { key: 'size', header: 'Size', render: (s?: string) => s || '-' },
    { key: 'createdAt', header: 'Created', render: (d: string) => new Date(d).toLocaleDateString() },
    { key: 'createdBy', header: 'Created By' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
            <p className="mt-1 text-sm text-gray-500">Generate and download reports</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Reports', value: reports.length, icon: FileText },
            { label: 'Completed', value: reports.filter((r) => r.status === 'completed').length, icon: Download },
            { label: 'Scheduled', value: reports.filter((r) => r.status === 'scheduled').length, icon: Calendar },
            { label: 'Processing', value: reports.filter((r) => r.status === 'processing').length, icon: Clock },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                  <stat.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold">Report History</h3>
            <Select options={reportTypes} value={typeFilter} onChange={setTypeFilter} className="w-36" />
          </div>
          <div className="p-4">
            <DataTable
              data={filteredReports}
              columns={columns}
              actions={[
                {
                  label: 'Download',
                  icon: <Download className="h-4 w-4" />,
                  onClick: (r) => handleDownloadReport(r),
                  disabled: (r) => r.status !== 'completed',
                },
                {
                  label: 'Regenerate',
                  icon: <RefreshCw className="h-4 w-4" />,
                  onClick: (r) => handleRegenerateReport(r),
                },
                {
                  label: 'Delete',
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: (r) => handleDeleteReport(r),
                  variant: 'danger',
                },
              ]}
            />
          </div>
        </div>

        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Generate Report" size="md">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Report Template</label>
              <Select options={reportTemplates} value={selectedTemplate} onChange={setSelectedTemplate} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DatePicker label="Start Date" value={startDate} onChange={setStartDate} />
              <DatePicker label="End Date" value={endDate} onChange={setEndDate} />
            </div>

            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <h4 className="font-medium mb-2">Report Details</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This report will include data from all active organizations and patients within the selected date range.
                Processing typically takes 2-5 minutes depending on data volume.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleGenerateReport} disabled={generating}>
                <FileText className="mr-2 h-4 w-4" />
                {generating ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
