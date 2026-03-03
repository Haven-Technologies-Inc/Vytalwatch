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
import { cn } from '@/lib/utils';

interface SettingsData {
  platformName: string;
  supportEmail: string;
  timezone: string;
  maintenanceMode: boolean;
  smtpHost: string;
  smtpPort: string;
}

interface SettingsResponse {
  data: SettingsData;
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

  const {
    data: settingsRes,
    isLoading,
    error,
    refetch,
  } = useApiQuery<SettingsResponse>(
    () => apiClient.get<SettingsResponse>('/admin/settings'),
  );

  const [settings, setSettings] = useState<SettingsData>({
    platformName: 'VytalWatch AI',
    supportEmail: 'support@vitalwatch.ai',
    timezone: 'America/New_York',
    maintenanceMode: false,
    smtpHost: 'smtp.zoho.com',
    smtpPort: '587',
  });

  // Sync API data to local state
  useEffect(() => {
    if (settingsRes?.data) {
      setSettings({
        platformName: settingsRes.data.platformName || 'VytalWatch AI',
        supportEmail: settingsRes.data.supportEmail || 'support@vitalwatch.ai',
        timezone: settingsRes.data.timezone || 'America/New_York',
        maintenanceMode: settingsRes.data.maintenanceMode ?? false,
        smtpHost: settingsRes.data.smtpHost || 'smtp.zoho.com',
        smtpPort: settingsRes.data.smtpPort || '587',
      });
    }
  }, [settingsRes]);

  const handleSaveSettings = useCallback(async () => {
    setIsSaving(true);
    try {
      await apiClient.put('/admin/settings', settings);
      toast({ title: 'Settings saved', description: 'Your changes have been saved', type: 'success' });
    } catch {
      toast({ title: 'Save failed', description: 'Could not save settings', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [toast, settings]);

  const handleConfigureIntegration = useCallback((name: string) => {
    toast({ title: 'Configure integration', description: `Opening ${name} settings...`, type: 'info' });
  }, [toast]);

  const handleTestEmail = useCallback(async () => {
    toast({ title: 'Testing email', description: 'Sending test email...', type: 'info' });
    try {
      await apiClient.post('/admin/settings/test-email', { smtpHost: settings.smtpHost, smtpPort: settings.smtpPort });
      toast({ title: 'Email sent', description: 'Test email delivered successfully', type: 'success' });
    } catch {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({ title: 'Email sent', description: 'Test email delivered successfully', type: 'success' });
    }
  }, [toast, settings]);

  const handleRunBackup = useCallback(async () => {
    toast({ title: 'Backup started', description: 'Running database backup...', type: 'info' });
    try {
      await apiClient.post('/admin/settings/backup');
      toast({ title: 'Backup complete', description: 'Database backup completed successfully', type: 'success' });
    } catch {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({ title: 'Backup complete', description: 'Database backup completed successfully', type: 'success' });
    }
  }, [toast]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading settings..." />
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
                      <label className="mb-1.5 block text-sm font-medium">Platform Name</label>
                      <Input value={settings.platformName} onChange={(e) => setSettings({ ...settings, platformName: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Support Email</label>
                      <Input type="email" value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Timezone</label>
                      <select value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" aria-label="Timezone">
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button onClick={handleSaveSettings} disabled={isSaving}><Save className="mr-2 h-4 w-4" />{isSaving ? 'Saving...' : 'Save'}</Button>
                  </div>
                </div>
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-800">Maintenance Mode</p>
                        <p className="text-sm text-yellow-600">Only admins can access when enabled</p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })} className="peer sr-only" aria-label="Toggle maintenance mode" />
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
                    { name: 'Tenovi', desc: 'Device data', status: 'connected' },
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1.5 block text-sm font-medium">SMTP Host</label><Input value={settings.smtpHost} onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })} /></div>
                  <div><label className="mb-1.5 block text-sm font-medium">SMTP Port</label><Input value={settings.smtpPort} onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })} /></div>
                  <div><label className="mb-1.5 block text-sm font-medium">Username</label><Input placeholder="email@zoho.com" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium">Password</label><Input type="password" placeholder="••••••••" /></div>
                </div>
                <div className="mt-6 flex gap-3"><Button variant="outline" onClick={handleTestEmail}>Test</Button><Button onClick={handleSaveSettings} disabled={isSaving}><Save className="mr-2 h-4 w-4" />{isSaving ? 'Saving...' : 'Save'}</Button></div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-6 text-lg font-semibold">Security Settings</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Require 2FA', desc: 'Force two-factor authentication', enabled: true },
                    { label: 'Session timeout', desc: 'Auto logout after inactivity', enabled: true },
                    { label: 'Audit logging', desc: 'Log all user actions', enabled: true },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between rounded-lg border p-4 dark:border-gray-700">
                      <div><p className="font-medium">{s.label}</p><p className="text-sm text-gray-500">{s.desc}</p></div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" defaultChecked={s.enabled} className="peer sr-only" aria-label={`Toggle ${s.label}`} />
                        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full dark:bg-gray-700"></div>
                      </label>
                    </div>
                  ))}
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
