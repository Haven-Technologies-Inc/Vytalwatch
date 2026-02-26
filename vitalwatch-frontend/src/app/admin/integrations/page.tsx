'use client';

import { useState, useCallback, useEffect } from 'react';
import { integrationsApi } from '@/services/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Zap, Check, X, Settings, ExternalLink, RefreshCw, Key, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'connected' | 'disconnected' | 'error';
  icon: string;
  lastSync?: string;
  config?: Record<string, string>;
}

const mockIntegrations: Integration[] = [
  { id: 'stripe', name: 'Stripe', description: 'Payment processing and subscriptions', category: 'Payments', status: 'connected', icon: '💳', lastSync: '2026-01-15T10:30:00Z' },
  { id: 'twilio', name: 'Twilio', description: 'SMS notifications and 2FA', category: 'Communications', status: 'connected', icon: '📱', lastSync: '2026-01-15T10:25:00Z' },
  { id: 'openai', name: 'OpenAI', description: 'AI-powered clinical insights', category: 'AI/ML', status: 'connected', icon: '🤖', lastSync: '2026-01-15T10:28:00Z' },
  { id: 'grok', name: 'Grok AI', description: 'Real-time AI analysis', category: 'AI/ML', status: 'connected', icon: '🧠', lastSync: '2026-01-15T10:29:00Z' },
  { id: 'tenovi', name: 'Tenovi', description: 'Medical device data integration', category: 'Devices', status: 'connected', icon: '📊', lastSync: '2026-01-15T10:20:00Z' },
  { id: 'zoho', name: 'Zoho Mail', description: 'Transactional email delivery', category: 'Communications', status: 'connected', icon: '✉️', lastSync: '2026-01-15T10:15:00Z' },
  { id: 'google', name: 'Google OAuth', description: 'Social sign-in provider', category: 'Authentication', status: 'connected', icon: '🔐' },
  { id: 'microsoft', name: 'Microsoft OAuth', description: 'Social sign-in provider', category: 'Authentication', status: 'disconnected', icon: '🪟' },
  { id: 'apple', name: 'Apple Sign-In', description: 'Social sign-in provider', category: 'Authentication', status: 'disconnected', icon: '🍎' },
];

const categories = ['All', 'Payments', 'Communications', 'AI/ML', 'Devices', 'Authentication'];

export default function AdminIntegrationsPage() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await integrationsApi.list();
      setIntegrations(response.data.data || response.data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load integrations', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await integrationsApi.syncTenoviDevices();
      await fetchIntegrations();
      toast({ title: 'Sync complete', description: 'All integrations synced successfully', type: 'success' });
    } catch (error) {
      toast({ title: 'Sync failed', description: 'Some integrations failed to sync', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = async (integration: Integration) => {
    setConnecting(integration.id);
    try {
      await integrationsApi.enable(integration.id);
      await fetchIntegrations();
      toast({ title: 'Connected', description: `${integration.name} connected successfully`, type: 'success' });
    } catch (error) {
      toast({ title: 'Connection failed', description: `Failed to connect ${integration.name}`, type: 'error' });
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = useCallback(async (integration: Integration) => {
    setConnecting(integration.id);
    try {
      await integrationsApi.disable(integration.id);
      await fetchIntegrations();
      toast({ title: 'Disconnected', description: `${integration.name} has been disconnected`, type: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: `Failed to disconnect ${integration.name}`, type: 'error' });
    } finally {
      setConnecting(null);
    }
  }, [toast, fetchIntegrations]);

  const handleSaveConfig = async () => {
    if (!selectedIntegration) return;
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 500));
    setShowModal(false);
    toast({ title: 'Configuration saved', description: `${selectedIntegration.name} settings updated`, type: 'success' });
  };

  const handleCopyWebhook = useCallback((integration: Integration) => {
    navigator.clipboard.writeText(`https://api.vVytalWatch.ai/webhooks/${integration.id}`);
    toast({ title: 'Copied', description: 'Webhook URL copied to clipboard', type: 'success' });
  }, [toast]);

  const filteredIntegrations = integrations.filter(
    (i) => selectedCategory === 'All' || i.category === selectedCategory
  );

  const connectedCount = integrations.filter((i) => i.status === 'connected').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h1>
            <p className="mt-1 text-sm text-gray-500">
              {connectedCount} of {integrations.length} integrations connected
            </p>
          </div>
          <Button variant="outline" onClick={handleSyncAll} disabled={syncing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                selectedCategory === cat
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredIntegrations.map((integration) => (
            <div
              key={integration.id}
              className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{integration.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{integration.name}</h3>
                    <p className="text-xs text-gray-500">{integration.category}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    integration.status === 'connected' ? 'success' :
                    integration.status === 'error' ? 'danger' : 'secondary'
                  }
                >
                  {integration.status}
                </Badge>
              </div>

              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{integration.description}</p>

              {integration.lastSync && (
                <p className="mt-2 text-xs text-gray-400">
                  Last synced: {new Date(integration.lastSync).toLocaleString()}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => { setSelectedIntegration(integration); setShowModal(true); }}
                >
                  <Settings className="mr-1 h-4 w-4" />
                  Configure
                </Button>
                {integration.status === 'connected' ? (
                  <Button variant="outline" size="sm" onClick={() => handleDisconnect(integration)} disabled={connecting === integration.id}>
                    <X className="mr-1 h-4 w-4" />
                    {connecting === integration.id ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleConnect(integration)} disabled={connecting === integration.id}>
                    <Check className="mr-1 h-4 w-4" />
                    {connecting === integration.id ? 'Connecting...' : 'Connect'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Configure ${selectedIntegration?.name}`} size="md">
          {selectedIntegration && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border p-4 dark:border-gray-700">
                <span className="text-3xl">{selectedIntegration.icon}</span>
                <div>
                  <p className="font-semibold">{selectedIntegration.name}</p>
                  <Badge variant={selectedIntegration.status === 'connected' ? 'success' : 'secondary'}>
                    {selectedIntegration.status}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">API Key</label>
                <div className="flex gap-2">
                  <Input type="password" value="sk_live_•••••••••••••••••" readOnly className="flex-1" />
                  <Button variant="outline" size="sm">
                    <Key className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Webhook URL</label>
                <div className="flex gap-2">
                  <Input value={`https://api.vVytalWatch.ai/webhooks/${selectedIntegration.id}`} readOnly className="flex-1" />
                  <Button variant="outline" size="sm" onClick={() => handleCopyWebhook(selectedIntegration)}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedIntegration.status === 'connected' && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/20">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-sm">Disconnecting will disable all related features.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSaveConfig}>Save Changes</Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
