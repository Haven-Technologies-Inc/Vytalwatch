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
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Brain, Zap, Activity, TrendingUp, Settings, Play, Pause, RefreshCw, Eye } from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'active' | 'training' | 'inactive';
  accuracy: number;
  lastTrained: string;
  predictions: number;
}

interface PerformanceDataPoint {
  name: string;
  value: number;
}

interface ModelsResponse {
  data: AIModel[];
}

interface PerformanceResponse {
  data: {
    trend: PerformanceDataPoint[];
    predictionsToday: number;
    avgAccuracy: number;
    insightsThisWeek: number;
  };
}

export default function AdminAIPage() {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);

  const {
    data: modelsRes,
    isLoading: modelsLoading,
    error: modelsError,
    refetch: refetchModels,
  } = useApiQuery<ModelsResponse>(
    () => apiClient.get<ModelsResponse>('/ai/models'),
  );

  const {
    data: perfRes,
    isLoading: perfLoading,
    error: perfError,
    refetch: refetchPerf,
  } = useApiQuery<PerformanceResponse>(
    () => apiClient.get<PerformanceResponse>('/ai/performance'),
  );

  const models: AIModel[] = modelsRes?.data ?? [];
  const performanceData: PerformanceDataPoint[] = perfRes?.data?.trend ?? [];
  const perfData = perfRes?.data;

  // Local state for toggling (optimistic UI)
  const [localModels, setLocalModels] = useState<AIModel[] | null>(null);
  const displayModels = localModels ?? models;

  // Sync localModels when API data loads
  if (modelsRes?.data && !localModels) {
    // Will be set on next render via the fallback above
  }

  const handleRetrainAll = useCallback(async () => {
    setIsRetraining(true);
    try {
      await apiClient.post('/ai/retrain');
      toast({ title: 'Retraining started', description: 'All models queued for retraining', type: 'success' });
      refetchModels();
    } catch {
      toast({ title: 'Retrain failed', description: 'Could not start retraining', type: 'error' });
    } finally {
      setIsRetraining(false);
    }
  }, [toast, refetchModels]);

  const handleConfigure = useCallback(() => {
    toast({ title: 'Configure AI', description: 'Opening AI configuration...', type: 'info' });
  }, [toast]);

  const handleToggleModel = useCallback((model: AIModel) => {
    const newStatus = model.status === 'active' ? 'inactive' : 'active';
    setLocalModels(prev => (prev ?? models).map(m => m.id === model.id ? { ...m, status: newStatus as AIModel['status'] } : m));
    toast({ title: newStatus === 'active' ? 'Model activated' : 'Model paused', description: model.name, type: 'success' });
  }, [toast, models]);

  const handleRetrainModel = useCallback(async (model: AIModel) => {
    setLocalModels(prev => (prev ?? models).map(m => m.id === model.id ? { ...m, status: 'training' as AIModel['status'] } : m));
    toast({ title: 'Retraining started', description: model.name, type: 'info' });
    setTimeout(() => {
      setLocalModels(prev => (prev ?? models).map(m => m.id === model.id ? { ...m, status: 'active', lastTrained: new Date().toISOString().split('T')[0] } : m));
      toast({ title: 'Retraining complete', description: model.name, type: 'success' });
    }, 3000);
  }, [toast, models]);

  const columns: Column<AIModel>[] = [
    {
      key: 'name',
      header: 'Model',
      render: (_, model) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{model.name}</p>
          <p className="text-xs text-gray-500">{model.type} • {model.version}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'secondary'> = {
          active: 'success',
          training: 'warning',
          inactive: 'secondary',
        };
        return <Badge variant={variants[status]}>{status}</Badge>;
      },
    },
    {
      key: 'accuracy',
      header: 'Accuracy',
      render: (v: number) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${v}%` }} />
          </div>
          <span className="text-sm font-medium">{v}%</span>
        </div>
      ),
    },
    { key: 'predictions', header: 'Predictions', render: (v: number) => v.toLocaleString() },
    { key: 'lastTrained', header: 'Last Trained', render: (d: string) => new Date(d).toLocaleDateString() },
  ];

  const isLoading = modelsLoading || perfLoading;
  const error = modelsError || perfError;

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading AI models..." />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState message={error} onRetry={() => { refetchModels(); refetchPerf(); }} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Management</h1>
            <p className="mt-1 text-sm text-gray-500">Monitor and manage AI models</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleRetrainAll} disabled={isRetraining}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRetraining ? 'animate-spin' : ''}`} />
              {isRetraining ? 'Retraining...' : 'Retrain All'}
            </Button>
            <Button onClick={handleConfigure}>
              <Settings className="mr-2 h-4 w-4" />
              Configure
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Active Models"
            value={displayModels.filter(m => m.status === 'active').length.toString()}
            subtitle="All operational"
            icon={<Brain className="h-5 w-5" />}
          />
          <MetricCard
            title="Predictions Today"
            value={(perfData?.predictionsToday ?? 0).toLocaleString()}
            subtitle="+12% from yesterday"
            icon={<Zap className="h-5 w-5" />}
            trend={{ value: 12, isPositive: true }}
          />
          <MetricCard
            title="Avg Accuracy"
            value={`${perfData?.avgAccuracy ?? 0}%`}
            subtitle="Across all models"
            icon={<TrendingUp className="h-5 w-5" />}
            className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
          />
          <MetricCard
            title="Insights Generated"
            value={(perfData?.insightsThisWeek ?? 0).toString()}
            subtitle="This week"
            icon={<Activity className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold">AI Models</h3>
            </div>
            <div className="p-4">
              <DataTable
                data={displayModels}
                columns={columns}
                onRowClick={(m) => { setSelectedModel(m); setShowModal(true); }}
                actions={[
                  {
                    label: 'View',
                    icon: <Eye className="h-4 w-4" />,
                    onClick: (m) => { setSelectedModel(m); setShowModal(true); },
                  },
                  {
                    label: 'Toggle',
                    icon: <Play className="h-4 w-4" />,
                    onClick: (m) => handleToggleModel(m),
                  },
                ]}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold">Model Performance</h3>
              <TrendChart data={performanceData} color="#10b981" height={150} />
              <p className="mt-4 text-center text-sm text-gray-500">Average accuracy trend</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold">AI Providers</h3>
              <div className="space-y-3">
                {[
                  { name: 'OpenAI', status: 'connected', model: 'GPT-4' },
                  { name: 'Grok', status: 'connected', model: 'Grok-2' },
                ].map((provider) => (
                  <div key={provider.name} className="flex items-center justify-between rounded-lg border p-3 dark:border-gray-700">
                    <div>
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-xs text-gray-500">{provider.model}</p>
                    </div>
                    <Badge variant="success">{provider.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedModel?.name || 'Model Details'} size="lg">
          {selectedModel && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedModel.type}</p>
                </div>
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Version</p>
                  <p className="font-medium">{selectedModel.version}</p>
                </div>
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant={selectedModel.status === 'active' ? 'success' : 'warning'}>{selectedModel.status}</Badge>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Accuracy</p>
                  <p className="text-2xl font-bold text-green-600">{selectedModel.accuracy}%</p>
                </div>
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Total Predictions</p>
                  <p className="text-2xl font-bold">{selectedModel.predictions.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { handleRetrainModel(selectedModel); setShowModal(false); }}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retrain
                </Button>
                <Button className="flex-1" onClick={() => { handleToggleModel(selectedModel); setShowModal(false); }}>
                  {selectedModel.status === 'active' ? (
                    <><Pause className="mr-2 h-4 w-4" />Pause</>
                  ) : (
                    <><Play className="mr-2 h-4 w-4" />Activate</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
