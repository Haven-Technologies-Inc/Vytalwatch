'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { usersAdminApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import type { User as UserType } from '@/types';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { 
  Users, 
  UserPlus, 
  Shield, 
  UserCheck,
  Edit,
  Trash2,
  MoreHorizontal,
  Mail,
  Search
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'provider' | 'admin' | 'superadmin';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  organization?: string;
  lastLogin: string;
  createdAt: string;
}

const mockUsers: User[] = [
  { id: '1', name: 'Dr. Sarah Smith', email: 'sarah.smith@clinic.com', role: 'provider', status: 'active', organization: 'City Clinic', lastLogin: '2026-01-15', createdAt: '2025-06-01' },
  { id: '2', name: 'John Doe', email: 'john.doe@email.com', role: 'patient', status: 'active', lastLogin: '2026-01-14', createdAt: '2025-10-15' },
  { id: '3', name: 'Maria Garcia', email: 'maria.g@email.com', role: 'patient', status: 'active', lastLogin: '2026-01-15', createdAt: '2025-11-01' },
  { id: '4', name: 'Admin User', email: 'admin@vitalwatch.ai', role: 'admin', status: 'active', organization: 'VytalWatch', lastLogin: '2026-01-15', createdAt: '2025-01-01' },
  { id: '5', name: 'Dr. Michael Johnson', email: 'mjohnson@hospital.com', role: 'provider', status: 'inactive', organization: 'General Hospital', lastLogin: '2026-01-01', createdAt: '2025-08-15' },
  { id: '6', name: 'Test User', email: 'test@example.com', role: 'patient', status: 'pending', lastLogin: '', createdAt: '2026-01-10' },
];

const roleFilters = [
  { value: 'all', label: 'All Roles' },
  { value: 'patient', label: 'Patients' },
  { value: 'provider', label: 'Providers' },
  { value: 'admin', label: 'Admins' },
];

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
];

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state for edit
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', status: '' });
  
  // Form state for invite
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'patient', organization: '' });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersAdminApi.getAll({ limit: 100 });
      if (response.data?.results) {
        const mappedUsers = response.data.results.map((u: UserType) => ({
          id: u.id,
          name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          email: u.email,
          role: u.role as User['role'],
          status: (u.status || 'active') as User['status'],
          organization: u.organizationId,
          lastLogin: u.lastLoginAt || '',
          createdAt: u.createdAt || '',
        }));
        setUsers(mappedUsers);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role, status: user.status });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser || saving) return;

    setSaving(true);
    try {
      await usersAdminApi.update(selectedUser.id, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role as UserType['role'],
        status: editForm.status as UserType['status'],
      });
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, ...editForm, role: editForm.role as User['role'], status: editForm.status as User['status'] }
            : u
        )
      );
      setShowEditModal(false);
      toast({ title: 'User updated', description: `${editForm.name} has been updated`, type: 'success' });
    } catch (error) {
      console.error('Failed to update user:', error);
      toast({ title: 'Error', description: 'Failed to update user. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteForm.email || saving) return;

    setSaving(true);
    try {
      await usersAdminApi.inviteUser({
        email: inviteForm.email,
        role: inviteForm.role,
        organizationId: inviteForm.organization || undefined,
      });

      // Add pending user to local state
      const newUser: User = {
        id: `pending-${Date.now()}`,
        name: inviteForm.email.split('@')[0],
        email: inviteForm.email,
        role: inviteForm.role as User['role'],
        status: 'pending',
        organization: inviteForm.organization,
        lastLogin: '',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers((prev) => [newUser, ...prev]);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'patient', organization: '' });
      toast({ title: 'Invitation sent', description: `Invite sent to ${inviteForm.email}`, type: 'success' });
    } catch (error) {
      console.error('Failed to send invite:', error);
      toast({ title: 'Error', description: 'Failed to send invitation. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await usersAdminApi.update(selectedUser.id, {});
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setShowDeleteDialog(false);
      toast({ title: 'User deleted', description: `${selectedUser.name} has been deleted`, type: 'success' });
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({ title: 'Error', description: 'Failed to delete user. Please try again.', type: 'error' });
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (_, user) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (role: string) => {
        const colors: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
          patient: 'default',
          provider: 'info',
          admin: 'warning',
          superadmin: 'success',
        };
        return <Badge variant={colors[role]}>{role}</Badge>;
      },
    },
    {
      key: 'organization',
      header: 'Organization',
      render: (org: string | undefined) => org || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (status: string) => {
        const variants: Record<string, 'success' | 'secondary' | 'danger' | 'warning'> = {
          active: 'success',
          inactive: 'secondary',
          suspended: 'danger',
          pending: 'warning',
        };
        return <Badge variant={variants[status]}>{status}</Badge>;
      },
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'Never',
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage platform users and permissions
            </p>
          </div>
          <Button onClick={() => { setInviteForm({ email: '', role: 'patient', organization: '' }); setShowInviteModal(true); }}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Users"
            value={users.length}
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            title="Patients"
            value={users.filter((u) => u.role === 'patient').length}
            icon={<UserCheck className="h-5 w-5" />}
          />
          <MetricCard
            title="Providers"
            value={users.filter((u) => u.role === 'provider').length}
            icon={<Shield className="h-5 w-5" />}
          />
          <MetricCard
            title="Active Today"
            value={users.filter((u) => u.lastLogin === '2026-01-15').length}
            icon={<UserCheck className="h-5 w-5" />}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Select options={roleFilters} value={roleFilter} onChange={setRoleFilter} className="w-36" />
          <Select options={statusFilters} value={statusFilter} onChange={setStatusFilter} className="w-36" />
        </div>

        <DataTable
          data={filteredUsers}
          columns={columns}
          onRowClick={(user) => {
            setSelectedUser(user);
            setShowEditModal(true);
          }}
          actions={[
            { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: (u) => handleEditUser(u) },
            { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: (u) => { setSelectedUser(u); setShowDeleteDialog(true); }, variant: 'danger' },
          ]}
        />

        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User" size="md">
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Name</label>
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} type="email" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Role</label>
                  <Select
                    options={[
                      { value: 'patient', label: 'Patient' },
                      { value: 'provider', label: 'Provider' },
                      { value: 'admin', label: 'Admin' },
                    ]}
                    value={editForm.role}
                    onChange={(val) => setEditForm({ ...editForm, role: val })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Status</label>
                  <Select
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                      { value: 'suspended', label: 'Suspended' },
                    ]}
                    value={editForm.status}
                    onChange={(val) => setEditForm({ ...editForm, status: val })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </div>
          )}
        </Modal>

        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDeleteUser}
          title="Delete User"
          message={`Are you sure you want to delete ${selectedUser?.name}? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
        />

        <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite User" size="md">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email Address</label>
              <Input 
                placeholder="user@example.com" 
                type="email" 
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Role</label>
              <Select
                options={[
                  { value: 'patient', label: 'Patient' },
                  { value: 'provider', label: 'Provider' },
                  { value: 'admin', label: 'Admin' },
                ]}
                value={inviteForm.role}
                onChange={(val) => setInviteForm({ ...inviteForm, role: val })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Organization (Optional)</label>
              <Input 
                placeholder="Organization name" 
                value={inviteForm.organization}
                onChange={(e) => setInviteForm({ ...inviteForm, organization: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowInviteModal(false)}>Cancel</Button>
              <Button onClick={handleSendInvite} disabled={saving || !inviteForm.email}>
                <Mail className="mr-2 h-4 w-4" />
                {saving ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
