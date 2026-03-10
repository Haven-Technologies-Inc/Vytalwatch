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
import { Brain, Zap, Activity, TrendingUp, Play, Pause, RefreshCw, Eye } from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'active' | 'training' | 'inactive' | 'failed';
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1Score: number | null;
  auc: number | null;
  totalPredictions: number;
  lastTrainedAt: string | null;
  description: string | null;
  trainingHistory: Array<{ version: string; date: string; accuracy: number }> | null;
}

interface PerformanceMetrics {
  overall: {
    accuracy: number;
    totalPredictions: number;
    activeModels: number;
    totalModels: number;
  };
  byModel: Array<{
    modelId: string;
    name: string;
    accuracy: number;
    predictions: number;
    status: string;
  }>;
}

interface AIProviderStatus {
  providers: Array<{ name: string; model: string; status: string; configured: boolean }>;
  activeProvider: string | null;
}

// Normalize backend 0-1 decimal accuracy to 0-100 percentage
function toPercent(v: number | null): number {
  if (v === null || v === undefined) return 0;
  return v <= 1 ? Math.round(v * 10000) / 100 : Math.round(v * 100) / 100;
}

export default function AdminAIPage() {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);

  const {
    data: modelsRaw,
    isLoading: modelsLoading,
    error: modelsError,
    refetch: refetchModels,
  } = useApiQuery<AIModel[]>(
    () => apiClient.get<AIModel[]>('/ai/models'),
  );

  const {
    data: perfRaw,
    isLoading: perfLoading,
    error: perfError,
    refetch: refetchPerf,
  } = useApiQuery<PerformanceMetrics>(
    () => apiClient.get<PerformanceMetrics>('/ai/performance-metrics'),
  );

  const {
    data: providerStatus,
  } = useApiQuery<AIProviderStatus>(
    () => apiClient.get<AIProviderStatus>('/ai/status'),
  );

  const models: AIModel[] = Array.isArray(modelsRaw) ? modelsRaw : [];
  const perfData = perfRaw?.overall;

  // Build trend from training history of all models
  const performanceData = models
    .flatMap((m) => (m.trainingHistory || []).map((h) => ({ name: h.date, value: toPercent(h.accuracy) })))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleRetrainAll = useCallback(async () => {
    setIsRetraining(true);
    try {
      await apiClient.post('/ai/train', { modelType: 'all' });
      toast({ title: 'Retraining started', description: 'All models queued for retraining', type: 'success' });
      refetchModels();
    } catch {
      toast({ title: 'Retrain failed', description: 'Could not start retraining', type: 'error' });
    } finally {
      setIsRetraining(false);
    }
  }, [toast, refetchModels]);

  const handleToggleModel = useCallback(async (model: AIModel) => {
    const endpoint = model.status === 'active'
      ? `/ai/models/${model.id}/deactivate`
      : `/ai/models/${model.id}/activate`;
    try {
      await apiClient.post(endpoint);
      toast({
        title: model.status === 'active' ? 'Model paused' : 'Model activated',
        description: model.name,
        type: 'success',
      });
      refetchModels();
    } catch {
      toast({ title: 'Toggle failed', description: `Could not update ${model.name}`, type: 'error' });
    }
  }, [toast, refetchModels]);

  const handleRetrainModel = useCallback(async (model: AIModel) => {
    try {
      await apiClient.post('/ai/train', { modelType: model.type });
      toast({ title: 'Retraining started', description: model.name, type: 'info' });
      refetchModels();
    } catch {
      toast({ title: 'Retrain failed', description: `Could not retrain ${model.name}`, type: 'error' });
    }
  }, [toast, refetchModels]);

  const columns: Column<AIModel>[] = [
    {
      key: 'name',
      header: 'Model',
      render: (_, model) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{model.name}</p>
          <p className="text-xs text-gray-500">{model.type.replace(/_/g, ' ')} • v{model.version}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'secondary' | 'danger'> = {
          active: 'success',
          training: 'warning',
          inactive: 'secondary',
          failed: 'danger',
        };
        return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
      },
    },
    {
      key: 'accuracy',
      header: 'Accuracy',
      render: (_: number | null, model: AIModel) => {
        const pct = toPercent(model.accuracy);
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-medium">{pct}%</span>
          </div>
        );
      },
    },
    {
      key: 'totalPredictions',
      header: 'Predictions',
      render: (v: number) => (v || 0).toLocaleString(),
    },
    {
      key: 'lastTrainedAt',
      header: 'Last Trained',
      render: (d: string | null) => d ? new Date(d).toLocaleDateString() : 'Never',
    },
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
            <Button variant="outline" onClick={() => { refetchModels(); refetchPerf(); }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleRetrainAll} disabled={isRetraining}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRetraining ? 'animate-spin' : ''}`} />
              {isRetraining ? 'Retraining...' : 'Retrain All'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Active Models"
            value={models.filter((m) => m.status === 'active').length.toString()}
            subtitle={`${perfData?.totalModels ?? models.length} total`}
            icon={<Brain className="h-5 w-5" />}
          />
          <MetricCard
            title="Total Predictions"
            value={(perfData?.totalPredictions ?? models.reduce((s, m) => s + (m.totalPredictions || 0), 0)).toLocaleString()}
            subtitle="Across all models"
            icon={<Zap className="h-5 w-5" />}
          />
          <MetricCard
            title="Avg Accuracy"
            value={`${toPercent(perfData?.accuracy ?? null)}%`}
            subtitle="Active models"
            icon={<TrendingUp className="h-5 w-5" />}
            className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
          />
          <MetricCard
            title="Model Types"
            value={new Set(models.map((m) => m.type)).size.toString()}
            subtitle="Distinct model types"
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
                data={models}
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
              <h3 className="mb-4 text-lg font-semibold">Accuracy Trend</h3>
              {performanceData.length > 0 ? (
                <TrendChart data={performanceData} color="#10b981" height={150} />
              ) : (
                <p className="text-center text-sm text-gray-500 py-8">No training history available</p>
              )}
              <p className="mt-4 text-center text-sm text-gray-500">From training history</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold">AI Providers</h3>
              <div className="space-y-3">
                {(providerStatus?.providers ?? [{ name: 'OpenAI', model: 'GPT-4', status: 'loading', configured: false }, { name: 'Grok', model: 'Grok-2', status: 'loading', configured: false }]).map((provider) => (
                  <div key={provider.name} className="flex items-center justify-between rounded-lg border p-3 dark:border-gray-700">
                    <div>
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-xs text-gray-500">{provider.model}</p>
                    </div>
                    <Badge variant={provider.configured ? 'success' : 'secondary'}>{provider.configured ? 'Connected' : 'Not Configured'}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedModel?.name || 'Model Details'} size="lg">
          {selectedModel && (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">{selectedModel.description || 'No description available'}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedModel.type.replace(/_/g, ' ')}</p>
                </div>
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Version</p>
                  <p className="font-medium">v{selectedModel.version}</p>
                </div>
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant={selectedModel.status === 'active' ? 'success' : selectedModel.status === 'training' ? 'warning' : 'secondary'}>{selectedModel.status}</Badge>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Accuracy</p>
                  <p className="text-2xl font-bold text-green-600">{toPercent(selectedModel.accuracy)}%</p>
                </div>
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Precision</p>
                  <p className="text-2xl font-bold">{toPercent(selectedModel.precision)}%</p>
                </div>
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Recall</p>
                  <p className="text-2xl font-bold">{toPercent(selectedModel.recall)}%</p>
                </div>
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">F1 Score</p>
                  <p className="text-2xl font-bold">{toPercent(selectedModel.f1Score)}%</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Total Predictions</p>
                  <p className="text-2xl font-bold">{(selectedModel.totalPredictions || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Last Trained</p>
                  <p className="text-2xl font-bold">{selectedModel.lastTrainedAt ? new Date(selectedModel.lastTrainedAt).toLocaleDateString() : 'Never'}</p>
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
