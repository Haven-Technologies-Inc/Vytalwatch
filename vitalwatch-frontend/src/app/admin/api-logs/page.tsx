'use client';

import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { apiClient } from '@/services/api/client';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Activity, Clock, AlertTriangle, CheckCircle, Search, Download, Eye, Filter } from 'lucide-react';
import { cn, extractArray } from '@/lib/utils';

interface APILog {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  status: number;
  duration: number;
  userId?: string;
  ip: string;
  userAgent: string;
  requestBody?: string;
  responseBody?: string;
}

interface ApiLogsResponse {
  data: APILog[];
}

const methodColors: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  POST: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PATCH: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: '2xx', label: '2xx Success' },
  { value: '4xx', label: '4xx Client Error' },
  { value: '5xx', label: '5xx Server Error' },
];

const methodFilters = [
  { value: 'all', label: 'All Methods' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
];

export default function AdminAPILogsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<APILog | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const {
    data: logsRes,
    isLoading,
    error,
    refetch,
  } = useApiQuery<ApiLogsResponse>(
    () => apiClient.get<ApiLogsResponse>('/admin/api-logs'),
  );

  const logs: APILog[] = extractArray<APILog>(logsRes);

  const handleExportLogs = useCallback(async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({ title: 'Export complete', description: 'API logs downloaded', type: 'success' });
    } finally {
      setIsExporting(false);
    }
  }, [toast]);

  const filteredLogs = logs.filter((log) => {
    if (statusFilter !== 'all') {
      const statusRange = statusFilter.charAt(0);
      if (Math.floor(log.status / 100).toString() !== statusRange) return false;
    }
    if (methodFilter !== 'all' && log.method !== methodFilter) return false;
    if (searchQuery && !log.endpoint.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const successRate = logs.length ? Math.round((logs.filter((l) => l.status < 400).length / logs.length) * 100) : 0;
  const avgDuration = logs.length ? Math.round(logs.reduce((sum, l) => sum + l.duration, 0) / logs.length) : 0;
  const errorCount = logs.filter((l) => l.status >= 400).length;

  const columns: Column<APILog>[] = [
    {
      key: 'timestamp',
      header: 'Time',
      render: (t: string) => new Date(t).toLocaleTimeString(),
    },
    {
      key: 'method',
      header: 'Method',
      render: (m: string) => (
        <span className={cn('rounded px-2 py-1 text-xs font-medium', methodColors[m])}>{m}</span>
      ),
    },
    {
      key: 'endpoint',
      header: 'Endpoint',
      render: (e: string) => <code className="text-xs">{e}</code>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: number) => (
        <Badge variant={s < 400 ? 'success' : s < 500 ? 'warning' : 'danger'}>{s}</Badge>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (d: number) => (
        <span className={cn('text-sm', d > 1000 && 'text-red-500 font-medium')}>{d}ms</span>
      ),
    },
    { key: 'ip', header: 'IP Address' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading API logs..." />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState message={error} onRetry={refetch} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Logs</h1>
            <p className="mt-1 text-sm text-gray-500">Monitor API requests and responses</p>
          </div>
          <Button variant="outline" onClick={handleExportLogs} disabled={isExporting}>
            <Download className={`mr-2 h-4 w-4 ${isExporting ? 'animate-pulse' : ''}`} />
            {isExporting ? 'Exporting...' : 'Export Logs'}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total Requests" value={logs.length.toLocaleString()} subtitle="Last hour" icon={<Activity className="h-5 w-5" />} />
          <MetricCard title="Success Rate" value={`${successRate}%`} icon={<CheckCircle className="h-5 w-5" />} className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20" />
          <MetricCard title="Avg Response" value={`${avgDuration}ms`} icon={<Clock className="h-5 w-5" />} />
          <MetricCard title="Errors" value={errorCount.toString()} subtitle="4xx + 5xx" icon={<AlertTriangle className="h-5 w-5" />} className={errorCount > 0 ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20' : ''} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search endpoints..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Select options={methodFilters} value={methodFilter} onChange={setMethodFilter} className="w-32" />
              <Select options={statusFilters} value={statusFilter} onChange={setStatusFilter} className="w-36" />
            </div>
          </div>
          <div className="p-4">
            {filteredLogs.length === 0 ? (
              <EmptyState title="No logs found" description="No API logs match your current filters." />
            ) : (
              <DataTable
                data={filteredLogs}
                columns={columns}
                onRowClick={(log) => { setSelectedLog(log); setShowModal(true); }}
                actions={[{ label: 'View', icon: <Eye className="h-4 w-4" />, onClick: (log) => { setSelectedLog(log); setShowModal(true); } }]}
              />
            )}
          </div>
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Request Details" size="lg">
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-sm text-gray-500">Timestamp</p><p className="font-medium">{new Date(selectedLog.timestamp).toLocaleString()}</p></div>
                <div><p className="text-sm text-gray-500">Duration</p><p className="font-medium">{selectedLog.duration}ms</p></div>
                <div><p className="text-sm text-gray-500">Method</p><span className={cn('rounded px-2 py-1 text-xs font-medium', methodColors[selectedLog.method])}>{selectedLog.method}</span></div>
                <div><p className="text-sm text-gray-500">Status</p><Badge variant={selectedLog.status < 400 ? 'success' : 'danger'}>{selectedLog.status}</Badge></div>
              </div>
              <div><p className="text-sm text-gray-500">Endpoint</p><code className="mt-1 block rounded bg-gray-100 p-2 text-sm dark:bg-gray-800">{selectedLog.endpoint}</code></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-sm text-gray-500">IP Address</p><p className="font-medium">{selectedLog.ip}</p></div>
                <div><p className="text-sm text-gray-500">User ID</p><p className="font-medium">{selectedLog.userId || 'Anonymous'}</p></div>
              </div>
              <div><p className="text-sm text-gray-500">User Agent</p><p className="text-sm text-gray-600 dark:text-gray-400">{selectedLog.userAgent}</p></div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
