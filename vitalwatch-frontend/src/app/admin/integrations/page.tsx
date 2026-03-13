'use client';

import { useState, useCallback, useEffect } from 'react';
import { integrationsApi } from '@/services/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Check, X, Settings, RefreshCw, Eye, EyeOff, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'connected' | 'disconnected' | 'error';
  icon: string;
  lastSync?: string;
}

interface FD { key: string; label: string; secret?: boolean; ph: string }

const FIELDS: Record<string, FD[]> = {
  stripe: [
    { key: 'apiKey', label: 'Secret Key', secret: true, ph: 'sk_live_...' },
    { key: 'webhookSecret', label: 'Webhook Secret', secret: true, ph: 'whsec_...' },
  ],
  zoho: [
    { key: 'smtpHost', label: 'SMTP Host', ph: 'smtp.zeptomail.com' },
    { key: 'smtpUser', label: 'SMTP Username', ph: 'emailapikey' },
    { key: 'smtpPass', label: 'SMTP Password', secret: true, ph: 'password' },
    { key: 'fromEmail', label: 'From Email', ph: 'noreply@vytalwatch.com' },
  ],
  twilio: [
    { key: 'accountSid', label: 'Account SID', ph: 'AC...' },
    { key: 'authToken', label: 'Auth Token', secret: true, ph: 'token' },
    { key: 'phoneNumber', label: 'Phone Number', ph: '+1...' },
  ],
  openai: [{ key: 'apiKey', label: 'API Key', secret: true, ph: 'sk-...' }],
  grok: [{ key: 'apiKey', label: 'API Key', secret: true, ph: 'xai-...' }],
  tenovi: [
    { key: 'apiKey', label: 'API Key', secret: true, ph: 'Tenovi API key' },
    { key: 'apiUrl', label: 'API URL', ph: 'https://api2.tenovi.com' },
    { key: 'clientDomain', label: 'Client Domain', ph: 'your-domain' },
  ],
  google: [
    { key: 'clientId', label: 'Client ID', ph: 'xxx.apps.googleusercontent.com' },
    { key: 'clientSecret', label: 'Client Secret', secret: true, ph: 'secret' },
  ],
  microsoft: [
    { key: 'clientId', label: 'Client ID', ph: 'Application ID' },
    { key: 'clientSecret', label: 'Client Secret', secret: true, ph: 'secret' },
  ],
  apple: [
    { key: 'clientId', label: 'Service ID', ph: 'com.your.app' },
    { key: 'teamId', label: 'Team ID', ph: 'Team ID' },
  ],
};

const WHOOKS: Record<string, string> = {
  stripe: 'https://vytalwatch.com/api/v1/webhooks/stripe',
  tenovi: 'https://vytalwatch.com/api/v1/webhooks/tenovi',
};

const cats = ['All', 'Payments', 'Communications', 'AI/ML', 'Devices', 'Authentication'];

export default function AdminIntegrationsPage() {
  const { toast } = useToast();
  const [its, setIts] = useState<Integration[]>([]);
  const [, setLoading] = useState(true);
  const [cat, setCat] = useState('All');
  const [sel, setSel] = useState<Integration | null>(null);
  const [modal, setModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [vis, setVis] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const r = await integrationsApi.list();
      const raw = (r as any)?.data ?? r;
      const l = raw?.data ?? raw?.results ?? (Array.isArray(raw) ? raw : []);
      setIts(Array.isArray(l) ? l : []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load integrations', type: 'error' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const doConnect = async (i: Integration) => {
    setBusy(i.id);
    try {
      await integrationsApi.enable(i.id); await load();
      toast({ title: 'Connected', description: `${i.name} connected`, type: 'success' });
    } catch (e) {
      const m = e instanceof Error && e.message.includes('configured')
        ? `Configure ${i.name} first` : `Failed to connect ${i.name}`;
      toast({ title: 'Failed', description: m, type: 'error' });
    } finally { setBusy(null); }
  };

  const doDisconnect = async (i: Integration) => {
    setBusy(i.id);
    try {
      await integrationsApi.disable(i.id); await load();
      toast({ title: 'Disconnected', description: `${i.name} disconnected`, type: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to disconnect', type: 'error' });
    } finally { setBusy(null); }
  };

  const openCfg = (i: Integration) => { setSel(i); setVals({}); setVis({}); setModal(true); };

  const doSave = async () => {
    if (!sel) return;
    if (!Object.values(vals).some((v) => v.trim())) {
      toast({ title: 'Error', description: 'Fill in at least one field', type: 'error' }); return;
    }
    setSaving(true);
    try {
      await integrationsApi.configure(sel.id, { settings: vals });
      await load(); setModal(false);
      toast({ title: 'Saved', description: `${sel.name} configuration updated`, type: 'success' });
    } catch {
      toast({ title: 'Failed', description: 'Could not save configuration', type: 'error' });
    } finally { setSaving(false); }
  };

  const doSync = async () => {
    setSyncing(true);
    try {
      await integrationsApi.syncTenoviDevices(); await load();
      toast({ title: 'Synced', description: 'All integrations synced', type: 'success' });
    } catch {
      toast({ title: 'Sync failed', description: 'Some integrations failed', type: 'error' });
    } finally { setSyncing(false); }
  };

  const copyWh = (id: string) => {
    const u = WHOOKS[id];
    if (u) { navigator.clipboard.writeText(u); toast({ title: 'Copied', description: 'Webhook URL copied', type: 'success' }); }
  };

  const filtered = its.filter((i) => cat === 'All' || i.category === cat);
  const connCt = its.filter((i) => i.status === 'connected').length;
  const fields = sel ? FIELDS[sel.id] ?? [{ key: 'apiKey', label: 'API Key', secret: true, ph: 'Enter API key' }] : [];
  const whUrl = sel ? WHOOKS[sel.id] : undefined;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h1>
            <p className="mt-1 text-sm text-gray-500">{connCt} of {its.length} connected</p>
          </div>
          <Button variant="outline" onClick={doSync} disabled={syncing}>
            <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              cat === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
            )}>{c}</button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <div key={i.id} className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{i.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{i.name}</h3>
                    <p className="text-xs text-gray-500">{i.category}</p>
                  </div>
                </div>
                <Badge variant={i.status === 'connected' ? 'success' : i.status === 'error' ? 'danger' : 'secondary'}>{i.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{i.description}</p>
              {i.lastSync && <p className="mt-2 text-xs text-gray-400">Last synced: {new Date(i.lastSync).toLocaleString()}</p>}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openCfg(i)}>
                  <Settings className="mr-1 h-4 w-4" /> Configure
                </Button>
                {i.status === 'connected' ? (
                  <Button variant="outline" size="sm" onClick={() => doDisconnect(i)} disabled={busy === i.id}>
                    <X className="mr-1 h-4 w-4" /> {busy === i.id ? '...' : 'Disconnect'}
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => doConnect(i)} disabled={busy === i.id}>
                    <Check className="mr-1 h-4 w-4" /> {busy === i.id ? '...' : 'Connect'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Modal isOpen={modal} onClose={() => setModal(false)} title={`Configure ${sel?.name ?? ''}`} size="md">
          {sel && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border p-4 dark:border-gray-700">
                <span className="text-3xl">{sel.icon}</span>
                <div>
                  <p className="font-semibold">{sel.name}</p>
                  <Badge variant={sel.status === 'connected' ? 'success' : 'secondary'}>{sel.status}</Badge>
                </div>
              </div>

              {fields.map((fd) => (
                <div key={fd.key}>
                  <label className="mb-1.5 block text-sm font-medium">{fd.label}</label>
                  <div className="flex gap-2">
                    <Input
                      type={fd.secret && !vis[fd.key] ? 'password' : 'text'}
                      placeholder={fd.ph}
                      value={vals[fd.key] ?? ''}
                      onChange={(e) => setVals((p) => ({ ...p, [fd.key]: e.target.value }))}
                      className="flex-1"
                    />
                    {fd.secret && (
                      <Button variant="outline" size="sm" onClick={() => setVis((p) => ({ ...p, [fd.key]: !p[fd.key] }))}>
                        {vis[fd.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {whUrl && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Webhook URL</label>
                  <div className="flex gap-2">
                    <Input value={whUrl} readOnly className="flex-1" />
                    <Button variant="outline" size="sm" onClick={() => copyWh(sel.id)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {sel.status === 'connected' && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/20">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-sm">Changing keys on a connected integration may cause temporary disruption.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
                <Button className="flex-1" onClick={doSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
