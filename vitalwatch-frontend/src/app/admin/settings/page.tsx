'use client';

import { useState, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { apiClient } from '@/services/api/client';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Settings, Bell, Shield, Database, Mail, Save, Zap, AlertTriangle, Server } from 'lucide-react';
import { cn, extractData } from '@/lib/utils';

// Backend returns a flat key-value map from Redis
interface SystemSettings {
  maxPatientsPerProvider: number;
  defaultAlertThreshold: string;
  sessionTimeout: number;
  enableTwoFactor: boolean;
  retentionDays: number;
  [key: string]: unknown;
}

interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  startedAt: string | null;
}

const tabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Zap },
  { id: 'email', label: 'Email (SMTP)', icon: Mail },
  { id: 'database', label: 'Database', icon: Database },
];

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch system settings (flat key-value map from Redis)
  const {
    data: settingsRaw,
    isLoading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useApiQuery<SystemSettings>(
    () => apiClient.get<SystemSettings>('/admin/settings'),
  );

  // Fetch maintenance mode status (separate endpoint)
  const {
    data: maintenanceRaw,
    refetch: refetchMaintenance,
  } = useApiQuery<MaintenanceStatus>(
    () => apiClient.get<MaintenanceStatus>('/admin/maintenance/status'),
  );

  const [settings, setSettings] = useState<SystemSettings>({
    maxPatientsPerProvider: 100,
    defaultAlertThreshold: 'medium',
    sessionTimeout: 3600,
    enableTwoFactor: true,
    retentionDays: 365,
  });

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);

  // Sync API data to local state
  useEffect(() => {
    const extracted = extractData<SystemSettings>(settingsRaw);
    if (extracted && typeof extracted === 'object') {
      setSettings((prev) => ({ ...prev, ...extracted }));
    }
  }, [settingsRaw]);

  useEffect(() => {
    const maint = extractData<MaintenanceStatus>(maintenanceRaw);
    if (maint) {
      setMaintenanceEnabled(maint.enabled ?? false);
    }
  }, [maintenanceRaw]);

  const handleSaveSettings = useCallback(async () => {
    setIsSaving(true);
    try {
      await apiClient.put('/admin/settings/bulk', settings);
      toast({ title: 'Settings saved', description: 'Your changes have been saved', type: 'success' });
      refetchSettings();
    } catch {
      toast({ title: 'Save failed', description: 'Could not save settings', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [toast, settings, refetchSettings]);

  const handleToggleMaintenance = useCallback(async (enabled: boolean) => {
    try {
      if (enabled) {
        await apiClient.post('/admin/maintenance/enable', { message: 'System maintenance in progress' });
      } else {
        await apiClient.post('/admin/maintenance/disable');
      }
      setMaintenanceEnabled(enabled);
      refetchMaintenance();
      toast({
        title: enabled ? 'Maintenance enabled' : 'Maintenance disabled',
        description: enabled ? 'Only admins can access the platform' : 'Platform is back online',
        type: enabled ? 'warning' : 'success',
      });
    } catch {
      toast({ title: 'Failed', description: 'Could not toggle maintenance mode', type: 'error' });
    }
  }, [toast, refetchMaintenance]);

  const handleConfigureIntegration = useCallback((name: string) => {
    toast({ title: 'Configure integration', description: `Opening ${name} settings...`, type: 'info' });
  }, [toast]);

  const handleTestEmail = useCallback(async () => {
    toast({ title: 'Testing email', description: 'Sending test email...', type: 'info' });
    try {
      await apiClient.post('/integrations/email/send', {
        to: 'admin@vytalwatch.ai',
        subject: 'VytalWatch SMTP Test',
        body: 'This is a test email from VytalWatch.',
      });
      toast({ title: 'Email sent', description: 'Test email delivered successfully', type: 'success' });
    } catch {
      toast({ title: 'Email failed', description: 'Could not send test email. Check SMTP configuration.', type: 'error' });
    }
  }, [toast]);

  const handleRunBackup = useCallback(async () => {
    toast({ title: 'Backup started', description: 'Running database backup...', type: 'info' });
    try {
      await apiClient.post('/admin/settings/backup');
      toast({ title: 'Backup complete', description: 'Database backup completed successfully', type: 'success' });
    } catch {
      toast({ title: 'Backup failed', description: 'Could not complete database backup', type: 'error' });
    }
  }, [toast]);

  if (settingsLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading settings..." />
      </DashboardLayout>
    );
  }

  if (settingsError) {
    return (
      <DashboardLayout>
        <ErrorState message={settingsError} onRetry={refetchSettings} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Configure platform-wide settings</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <nav className="w-full lg:w-64 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex-1">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <h2 className="mb-6 text-lg font-semibold">General Settings</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Max Patients Per Provider</label>
                      <Input
                        type="number"
                        value={settings.maxPatientsPerProvider}
                        onChange={(e) => setSettings({ ...settings, maxPatientsPerProvider: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Default Alert Threshold</label>
                      <select
                        value={settings.defaultAlertThreshold}
                        onChange={(e) => setSettings({ ...settings, defaultAlertThreshold: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                        aria-label="Default alert threshold"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Session Timeout (seconds)</label>
                      <Input
                        type="number"
                        value={settings.sessionTimeout}
                        onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 3600 })}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Data Retention (days)</label>
                      <Input
                        type="number"
                        value={settings.retentionDays}
                        onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value) || 365 })}
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button onClick={handleSaveSettings} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </div>
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-800">Maintenance Mode</p>
                        <p className="text-sm text-yellow-600">
                          {maintenanceEnabled ? 'Platform is in maintenance — only admins can access' : 'Only admins can access when enabled'}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={maintenanceEnabled}
                        onChange={(e) => handleToggleMaintenance(e.target.checked)}
                        className="peer sr-only"
                        aria-label="Toggle maintenance mode"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-yellow-500 peer-checked:after:translate-x-full dark:bg-gray-700"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-6 text-lg font-semibold">Third-Party Integrations</h2>
                <div className="space-y-4">
                  {[
                    { name: 'Stripe', desc: 'Payment processing', status: 'connected' },
                    { name: 'Twilio', desc: 'SMS notifications', status: 'connected' },
                    { name: 'OpenAI', desc: 'AI insights', status: 'connected' },
                    { name: 'Grok', desc: 'Real-time vital analysis', status: 'connected' },
                    { name: 'Tenovi', desc: 'Medical device data', status: 'connected' },
                    { name: 'ZeptoMail', desc: 'Zoho SMTP email delivery', status: 'connected' },
                  ].map((i) => (
                    <div key={i.name} className="flex items-center justify-between rounded-lg border p-4 dark:border-gray-700">
                      <div>
                        <p className="font-medium">{i.name}</p>
                        <p className="text-sm text-gray-500">{i.desc}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="success">{i.status}</Badge>
                        <Button variant="outline" size="sm" onClick={() => handleConfigureIntegration(i.name)}>Configure</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-6 text-lg font-semibold">Zoho SMTP Settings</h2>
                <p className="mb-4 text-sm text-gray-500">Email is handled via ZeptoMail (Zoho). SMTP settings are configured via environment variables on the server.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4 dark:border-gray-700">
                    <p className="text-sm text-gray-500">SMTP Host</p>
                    <p className="font-medium">smtp.zeptomail.com</p>
                  </div>
                  <div className="rounded-lg border p-4 dark:border-gray-700">
                    <p className="text-sm text-gray-500">Port</p>
                    <p className="font-medium">587 (TLS)</p>
                  </div>
                </div>
                <div className="mt-6">
                  <Button variant="outline" onClick={handleTestEmail}>Send Test Email</Button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-6 text-lg font-semibold">Security Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4 dark:border-gray-700">
                    <div>
                      <p className="font-medium">Require 2FA</p>
                      <p className="text-sm text-gray-500">Force two-factor authentication for all users</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={!!settings.enableTwoFactor}
                        onChange={(e) => setSettings({ ...settings, enableTwoFactor: e.target.checked })}
                        className="peer sr-only"
                        aria-label="Toggle Require 2FA"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full dark:bg-gray-700"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4 dark:border-gray-700">
                    <div>
                      <p className="font-medium">Session Timeout</p>
                      <p className="text-sm text-gray-500">Auto logout after {settings.sessionTimeout}s of inactivity</p>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4 dark:border-gray-700">
                    <div>
                      <p className="font-medium">Audit Logging</p>
                      <p className="text-sm text-gray-500">All user actions are logged via AuditService</p>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Security Settings'}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-6 text-lg font-semibold">System Notifications</h2>
                <div className="space-y-4">
                  {['System alerts', 'New registrations', 'Payment events', 'Weekly reports'].map((n) => (
                    <div key={n} className="flex items-center justify-between rounded-lg border p-4 dark:border-gray-700">
                      <p className="font-medium">{n}</p>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" defaultChecked className="peer sr-only" aria-label={`Toggle ${n}`} />
                        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full dark:bg-gray-700"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-6 text-lg font-semibold">Database Status</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4 dark:border-gray-700">
                    <div className="flex items-center gap-2"><Server className="h-5 w-5 text-green-500" /><span className="font-medium">PostgreSQL</span></div>
                    <p className="mt-2 text-sm text-gray-500">Status: <Badge variant="success">Connected</Badge></p>
                  </div>
                  <div className="rounded-lg border p-4 dark:border-gray-700">
                    <div className="flex items-center gap-2"><Database className="h-5 w-5 text-green-500" /><span className="font-medium">InfluxDB</span></div>
                    <p className="mt-2 text-sm text-gray-500">Status: <Badge variant="success">Connected</Badge></p>
                  </div>
                  <div className="rounded-lg border p-4 dark:border-gray-700">
                    <div className="flex items-center gap-2"><Database className="h-5 w-5 text-green-500" /><span className="font-medium">Redis</span></div>
                    <p className="mt-2 text-sm text-gray-500">Status: <Badge variant="success">Connected</Badge></p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500">Data Retention: <span className="font-medium">{settings.retentionDays} days</span></p>
                </div>
                <div className="mt-6"><Button variant="outline" onClick={handleRunBackup}>Run Backup</Button></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
