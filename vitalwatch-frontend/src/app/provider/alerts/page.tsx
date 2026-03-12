'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PageWrapper } from '@/components/ui/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Bell,
  RefreshCw,
  Settings
} from 'lucide-react';
import { cn, extractData } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { alertsApi } from '@/services/api';

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  patient: { id: string; name: string };
  title: string;
  message: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
}

interface AlertApiItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  patient: { id: string; name: string };
  title: string;
  message: string;
  timestamp: string;
  createdAt: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

interface AlertsApiResponse {
  data: {
    results: AlertApiItem[];
    total: number;
  };
}

const severityFilters = [
  { value: 'all', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
];

export default function ProviderAlertsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: alertsResponse,
    isLoading,
    error,
    refetch,
  } = useApiQuery<AlertsApiResponse>(
    () => alertsApi.getAll({ limit: 100 }) as unknown as Promise<AlertsApiResponse>,
  );

  const alerts: Alert[] = useMemo(() => {
    const inner = extractData<{ results: AlertApiItem[]; total: number }>(alertsResponse);
    const items = inner?.results ?? [];
    return items.map((a) => ({
      ...a,
      timestamp: new Date(a.timestamp || a.createdAt),
    }));
  }, [alertsResponse]);

  const filteredAlerts = alerts.filter((alert) => {
    if (activeTab !== 'all' && alert.severity !== activeTab) return false;
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
    return true;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'critical' && a.status === 'active').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning' && a.status === 'active').length;
  const acknowledgedCount = alerts.filter((a) => a.status === 'acknowledged').length;
  const resolvedTodayCount = alerts.filter((a) => a.status === 'resolved').length;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({ title: 'Alerts refreshed', message: 'All alert data is up to date', type: 'success' });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast, refetch]);

  const handleAcknowledge = useCallback(async (id: string) => {
    try {
      await alertsApi.acknowledge(id);
      await refetch();
      toast({ title: 'Alert acknowledged', message: 'You will be reminded if not resolved', type: 'info' });
    } catch {
      toast({ title: 'Error', message: 'Failed to acknowledge alert', type: 'error' });
    }
  }, [toast, refetch]);

  const handleResolve = useCallback(async (id: string) => {
    try {
      await alertsApi.resolve(id, 'Resolved by provider');
      await refetch();
      toast({ title: 'Alert resolved', message: 'Alert has been marked as resolved', type: 'success' });
    } catch {
      toast({ title: 'Error', message: 'Failed to resolve alert', type: 'error' });
    }
  }, [toast, refetch]);

  const handleViewPatient = useCallback((patientId: string) => {
    router.push(`/provider/patients/${patientId}`);
  }, [router]);

  const handleContactPatient = useCallback((patientName: string) => {
    toast({ title: 'Initiating contact', message: `Opening communication with ${patientName}`, type: 'info' });
  }, [toast]);

  const handleAlertSettings = () => {
    router.push('/provider/settings?tab=alerts');
  };

  return (
    <DashboardLayout>
      <PageWrapper
        isLoading={isLoading}
        error={error}
        isEmpty={alerts.length === 0 && !isLoading && !error}
        emptyProps={{
          icon: Bell,
          title: 'No alerts',
          description: 'All clear! There are no patient alerts to display at this time.',
        }}
        loadingMessage="Loading alerts..."
      >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alerts</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Monitor and respond to patient alerts
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleAlertSettings}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Critical Alerts"
            value={criticalCount}
            icon={<AlertTriangle className="h-5 w-5" />}
            className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
          />
          <MetricCard
            title="Warnings"
            value={warningCount}
            icon={<AlertCircle className="h-5 w-5" />}
            className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20"
          />
          <MetricCard
            title="Acknowledged"
            value={acknowledgedCount}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <MetricCard
            title="Resolved Today"
            value={resolvedTodayCount}
            icon={<CheckCircle2 className="h-5 w-5" />}
            className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
            {(['all', 'critical', 'warning', 'info'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                )}
              >
                {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'critical' && criticalCount > 0 && (
                  <Badge variant="danger" className="ml-2">{criticalCount}</Badge>
                )}
              </button>
            ))}
          </div>

          <Select
            options={statusFilters}
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-36"
          />
        </div>

        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                No alerts to display
              </h3>
              <p className="mt-2 text-gray-500">
                All alerts have been addressed or there are no alerts matching your filters.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div key={alert.id} className="relative">
                <AlertCard
                  id={alert.id}
                  severity={alert.severity}
                  patient={alert.patient}
                  title={alert.title}
                  message={alert.message}
                  timestamp={alert.timestamp}
                  onView={() => handleViewPatient(alert.patient.id)}
                  onContact={() => handleContactPatient(alert.patient.name)}
                />
                {alert.status === 'active' && (
                  <div className="absolute right-4 top-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResolve(alert.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                )}
                {alert.status === 'acknowledged' && (
                  <div className="absolute right-4 top-4">
                    <Badge variant="warning">Acknowledged</Badge>
                  </div>
                )}
                {alert.status === 'resolved' && (
                  <div className="absolute right-4 top-4">
                    <Badge variant="success">Resolved</Badge>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      </PageWrapper>
    </DashboardLayout>
  );
}
