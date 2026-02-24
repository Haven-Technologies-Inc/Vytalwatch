'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { organizationsApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import type { Organization as OrgType } from '@/types';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { 
  Building2, 
  Plus, 
  Users, 
  CreditCard,
  Edit,
  Eye
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  type: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'trial' | 'suspended';
  userCount: number;
  patientCount: number;
  deviceCount: number;
  monthlyRevenue: number;
  createdAt: string;
}

const mockOrganizations: Organization[] = [
  { id: '1', name: 'City Clinic', type: 'Clinic', plan: 'professional', status: 'active', userCount: 5, patientCount: 120, deviceCount: 85, monthlyRevenue: 15000, createdAt: '2025-06-01' },
  { id: '2', name: 'General Hospital', type: 'Hospital', plan: 'enterprise', status: 'active', userCount: 25, patientCount: 450, deviceCount: 320, monthlyRevenue: 56250, createdAt: '2025-03-15' },
  { id: '3', name: 'Heart Care Center', type: 'Specialty', plan: 'professional', status: 'active', userCount: 8, patientCount: 180, deviceCount: 140, monthlyRevenue: 22500, createdAt: '2025-08-01' },
  { id: '4', name: 'Family Practice', type: 'Practice', plan: 'starter', status: 'trial', userCount: 2, patientCount: 35, deviceCount: 25, monthlyRevenue: 0, createdAt: '2026-01-01' },
  { id: '5', name: 'Senior Care Network', type: 'Agency', plan: 'enterprise', status: 'active', userCount: 15, patientCount: 280, deviceCount: 200, monthlyRevenue: 35000, createdAt: '2025-05-01' },
];

const planFilters = [
  { value: 'all', label: 'All Plans' },
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [createForm, setCreateForm] = useState({ name: '', type: 'clinic', plan: 'starter', adminEmail: '' });
  const [editForm, setEditForm] = useState({ name: '', type: '', plan: '', status: '' });

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await organizationsApi.getAll({ limit: 100 });
      if (response.data?.results) {
        const mapped = response.data.results.map((org: OrgType) => ({
          id: org.id,
          name: org.name,
          type: org.type || 'Clinic',
          plan: (org.plan || 'starter') as Organization['plan'],
          status: (org.status || 'active') as Organization['status'],
          userCount: org.userCount || 0,
          patientCount: org.patientCount || 0,
          deviceCount: org.deviceCount || 0,
          monthlyRevenue: org.monthlyRevenue || 0,
          createdAt: typeof org.createdAt === 'string' ? org.createdAt : (org.createdAt ? new Date(org.createdAt).toISOString().split('T')[0] : ''),
        })) as Organization[];
        setOrganizations(mapped);
      }
    } catch {
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleCreateOrg = async () => {
    if (!createForm.name || !createForm.adminEmail || saving) return;

    setSaving(true);
    try {
      await organizationsApi.create({
        name: createForm.name,
        type: createForm.type as OrgType['type'],
        plan: createForm.plan as OrgType['plan'],
      });

      const newOrg: Organization = {
        id: `new-${Date.now()}`,
        name: createForm.name,
        type: createForm.type.charAt(0).toUpperCase() + createForm.type.slice(1),
        plan: createForm.plan as Organization['plan'],
        status: 'trial',
        userCount: 1,
        patientCount: 0,
        deviceCount: 0,
        monthlyRevenue: 0,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setOrganizations((prev) => [newOrg, ...prev]);
      setShowCreateModal(false);
      setCreateForm({ name: '', type: 'clinic', plan: 'starter', adminEmail: '' });
      toast({ title: 'Organization created', description: `${newOrg.name} has been created`, type: 'success' });
    } catch (error) {
      console.error('Failed to create organization:', error);
      toast({ title: 'Error', description: 'Failed to create organization. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditOrg = (org: Organization) => {
    setSelectedOrg(org);
    setEditForm({ name: org.name, type: org.type.toLowerCase(), plan: org.plan, status: org.status });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedOrg || saving) return;

    setSaving(true);
    try {
      await organizationsApi.update(selectedOrg.id, {
        name: editForm.name,
        type: editForm.type as OrgType['type'],
        plan: editForm.plan as OrgType['plan'],
        status: editForm.status as OrgType['status'],
      });

      setOrganizations((prev) =>
        prev.map((o) =>
          o.id === selectedOrg.id
            ? { ...o, name: editForm.name, type: editForm.type.charAt(0).toUpperCase() + editForm.type.slice(1), plan: editForm.plan as Organization['plan'], status: editForm.status as Organization['status'] }
            : o
        )
      );
      setShowEditModal(false);
      setShowDetailsModal(false);
      toast({ title: 'Organization updated', description: `${editForm.name} has been updated`, type: 'success' });
    } catch (error) {
      console.error('Failed to update organization:', error);
      toast({ title: 'Error', description: 'Failed to update organization. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleViewBilling = useCallback((org: Organization) => {
    router.push(`/admin/billing?org=${encodeURIComponent(org.id)}`);
  }, [router]);

  const handleViewUsers = useCallback((org: Organization) => {
    router.push(`/admin/users?org=${encodeURIComponent(org.id)}`);
  }, [router]);

  const filteredOrgs = organizations.filter((o) => {
    if (planFilter !== 'all' && o.plan !== planFilter) return false;
    return true;
  });

  const totalRevenue = organizations.reduce((sum, o) => sum + o.monthlyRevenue, 0);
  const totalPatients = organizations.reduce((sum, o) => sum + o.patientCount, 0);
  const totalDevices = organizations.reduce((sum, o) => sum + o.deviceCount, 0);

  const columns: Column<Organization>[] = [
    {
      key: 'name',
      header: 'Organization',
      render: (_, org) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{org.name}</p>
          <p className="text-sm text-gray-500">{org.type}</p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (plan: string) => {
        const colors: Record<string, 'secondary' | 'info' | 'success'> = {
          starter: 'secondary',
          professional: 'info',
          enterprise: 'success',
        };
        return <Badge variant={colors[plan]}>{plan}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'danger'> = {
          active: 'success',
          trial: 'warning',
          suspended: 'danger',
        };
        return <Badge variant={variants[status]}>{status}</Badge>;
      },
    },
    {
      key: 'userCount',
      header: 'Users',
    },
    {
      key: 'patientCount',
      header: 'Patients',
    },
    {
      key: 'deviceCount',
      header: 'Devices',
    },
    {
      key: 'monthlyRevenue',
      header: 'Monthly Revenue',
      render: (revenue: number) => `$${revenue.toLocaleString()}`,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organizations</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage healthcare organizations and subscriptions
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Organization
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Organizations"
            value={organizations.length}
            icon={<Building2 className="h-5 w-5" />}
          />
          <MetricCard
            title="Total Patients"
            value={totalPatients.toLocaleString()}
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            title="Total Devices"
            value={totalDevices.toLocaleString()}
            icon={<CreditCard className="h-5 w-5" />}
          />
          <MetricCard
            title="Monthly Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            icon={<CreditCard className="h-5 w-5" />}
            className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
          />
        </div>

        <div className="flex gap-3">
          <Select options={planFilters} value={planFilter} onChange={setPlanFilter} className="w-40" />
        </div>

        <DataTable
          data={filteredOrgs}
          columns={columns}
          onRowClick={(org) => {
            setSelectedOrg(org);
            setShowDetailsModal(true);
          }}
          actions={[
            { label: 'View', icon: <Eye className="h-4 w-4" />, onClick: (o) => { setSelectedOrg(o); setShowDetailsModal(true); } },
            { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: (o) => handleEditOrg(o) },
          ]}
        />

        <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title={selectedOrg?.name || 'Organization Details'} size="lg">
          {selectedOrg && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedOrg.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Plan</p>
                  <Badge variant={selectedOrg.plan === 'enterprise' ? 'success' : selectedOrg.plan === 'professional' ? 'info' : 'secondary'}>
                    {selectedOrg.plan}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant={selectedOrg.status === 'active' ? 'success' : 'warning'}>{selectedOrg.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">{new Date(selectedOrg.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedOrg.userCount}</p>
                  <p className="text-xs text-gray-500">Users</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedOrg.patientCount}</p>
                  <p className="text-xs text-gray-500">Patients</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedOrg.deviceCount}</p>
                  <p className="text-xs text-gray-500">Devices</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">${selectedOrg.monthlyRevenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Monthly Revenue</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => handleViewBilling(selectedOrg)}>View Billing</Button>
                <Button variant="outline" className="flex-1" onClick={() => handleViewUsers(selectedOrg)}>View Users</Button>
                <Button className="flex-1" onClick={() => handleEditOrg(selectedOrg)}>Edit Organization</Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add Organization" size="md">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Organization Name</label>
              <Input 
                placeholder="Enter organization name" 
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <Select
                options={[
                  { value: 'clinic', label: 'Clinic' },
                  { value: 'hospital', label: 'Hospital' },
                  { value: 'practice', label: 'Practice' },
                  { value: 'agency', label: 'Home Health Agency' },
                ]}
                value={createForm.type}
                onChange={(val) => setCreateForm({ ...createForm, type: val })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Plan</label>
              <Select
                options={[
                  { value: 'starter', label: 'Starter - $299/mo' },
                  { value: 'professional', label: 'Professional - $799/mo' },
                  { value: 'enterprise', label: 'Enterprise - Custom' },
                ]}
                value={createForm.plan}
                onChange={(val) => setCreateForm({ ...createForm, plan: val })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Admin Email</label>
              <Input 
                placeholder="admin@organization.com" 
                type="email" 
                value={createForm.adminEmail}
                onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleCreateOrg} disabled={saving || !createForm.name || !createForm.adminEmail}>
                {saving ? 'Creating...' : 'Create Organization'}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Organization" size="md">
          {selectedOrg && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Organization Name</label>
                <Input 
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Type</label>
                  <Select
                    options={[
                      { value: 'clinic', label: 'Clinic' },
                      { value: 'hospital', label: 'Hospital' },
                      { value: 'practice', label: 'Practice' },
                      { value: 'agency', label: 'Home Health Agency' },
                    ]}
                    value={editForm.type}
                    onChange={(val) => setEditForm({ ...editForm, type: val })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Plan</label>
                  <Select
                    options={[
                      { value: 'starter', label: 'Starter' },
                      { value: 'professional', label: 'Professional' },
                      { value: 'enterprise', label: 'Enterprise' },
                    ]}
                    value={editForm.plan}
                    onChange={(val) => setEditForm({ ...editForm, plan: val })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Status</label>
                <Select
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'trial', label: 'Trial' },
                    { value: 'suspended', label: 'Suspended' },
                  ]}
                  value={editForm.status}
                  onChange={(val) => setEditForm({ ...editForm, status: val })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
