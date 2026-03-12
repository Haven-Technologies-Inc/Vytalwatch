'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import { staffApi } from '@/services/api';
import { apiClient } from '@/services/api/client';
import { Users, Shield, Plus, Edit2, Trash2, Loader2, Search, UserPlus, Settings, Check, X } from 'lucide-react';
import { safeArray } from '@/lib/utils';

interface StaffRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  status: string;
  isSystem: boolean;
  createdAt: string;
}

interface StaffMember {
  id: string;
  userId: string;
  staffRoleId: string;
  staffRole: StaffRole;
  status: string;
  department?: string;
  title?: string;
  employeeId?: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export default function StaffManagementPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [permissions, setPermissions] = useState<{ permissions: Record<string, string>; groups: Record<string, string[]>; categories: string[] } | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, membersRes, permsRes, usersRes] = await Promise.all([
        staffApi.getRoles(),
        staffApi.getMembers(),
        staffApi.getPermissions(),
        apiClient.get('/admin/users/pending', { params: { limit: 200 } }).catch(() => ({ data: [] })),
      ]) as any[];
      const rRaw = rolesRes?.data ?? rolesRes;
      setRoles(rRaw?.data ?? (Array.isArray(rRaw) ? rRaw : []));
      const mRaw = membersRes?.data ?? membersRes;
      setMembers(mRaw?.data ?? (Array.isArray(mRaw) ? mRaw : []));
      const pRaw = permsRes?.data ?? permsRes;
      setPermissions(pRaw ?? null);
      const uRaw = usersRes?.data ?? usersRes;
      setUsers(uRaw?.data ?? (Array.isArray(uRaw) ? uRaw : []));
    } catch (err) {
      toast({ title: 'Failed to load staff data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredMembers = members.filter(m => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.department?.toLowerCase().includes(q) || m.title?.toLowerCase().includes(q) || m.staffRole?.name.toLowerCase().includes(q);
    }
    return true;
  });

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Delete this role?')) return;
    try {
      await staffApi.deleteRole(id);
      toast({ title: 'Role deleted', type: 'success' });
      fetchData();
    } catch { toast({ title: 'Failed to delete role', type: 'error' }); }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Remove this staff member?')) return;
    try {
      await staffApi.deleteMember(id);
      toast({ title: 'Staff member removed', type: 'success' });
      fetchData();
    } catch { toast({ title: 'Failed to remove member', type: 'error' }); }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Staff Management</h1>
            <p className="text-sm text-gray-500">Manage staff roles and permissions</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'roles' && (
              <Button onClick={() => { setEditingRole(null); setShowRoleModal(true); }}><Plus className="h-4 w-4 mr-1" />New Role</Button>
            )}
            {activeTab === 'members' && (
              <Button onClick={() => { setEditingMember(null); setShowMemberModal(true); }}><UserPlus className="h-4 w-4 mr-1" />Add Staff</Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-sm text-gray-500">Staff Members</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><Shield className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{roles.length}</p>
                <p className="text-sm text-gray-500">Roles</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><Check className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{members.filter(m => m.status === 'active').length}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg"><Settings className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{permissions?.categories?.length || 0}</p>
                <p className="text-sm text-gray-500">Permission Categories</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-b">
          <button onClick={() => setActiveTab('members')} className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'members' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Staff Members</button>
          <button onClick={() => setActiveTab('roles')} className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'roles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Roles & Permissions</button>
        </div>

        {activeTab === 'members' && (
          <>
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search staff..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} className="w-40" />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Permissions</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(m => (
                    <tr key={m.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{m.title || 'Staff'}</p>
                          <p className="text-xs text-gray-500">{m.employeeId || m.userId.slice(0, 8)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant="secondary">{m.staffRole?.name}</Badge></td>
                      <td className="px-4 py-3">{m.department || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={m.status === 'active' ? 'success' : m.status === 'suspended' ? 'danger' : 'secondary'}>{m.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{m.staffRole?.permissions?.length || 0} perms</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingMember(m); setShowMemberModal(true); }}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteMember(m.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMembers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No staff members found</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'roles' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map(role => (
              <div key={role.id} className="bg-white dark:bg-gray-800 rounded-xl border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{role.name}</h3>
                      {role.isSystem && <Badge variant="secondary">System</Badge>}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{role.description || 'No description'}</p>
                  </div>
                  {!role.isSystem && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingRole(role); setShowRoleModal(true); }}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{safeArray(role.permissions).length} permissions</span>
                  <Badge variant={role.status === 'active' ? 'success' : 'secondary'}>{role.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {safeArray<string>(role.permissions).slice(0, 5).map(p => (
                    <span key={p} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{p.split(':')[0]}</span>
                  ))}
                  {safeArray(role.permissions).length > 5 && <span className="text-xs text-gray-500">+{safeArray(role.permissions).length - 5} more</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <RoleModal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} role={editingRole} permissions={permissions} onSave={fetchData} />
        <MemberModal isOpen={showMemberModal} onClose={() => setShowMemberModal(false)} member={editingMember} roles={roles} users={users} onSave={fetchData} />
      </div>
    </DashboardLayout>
  );
}

function RoleModal({ isOpen, onClose, role, permissions, onSave }: { isOpen: boolean; onClose: () => void; role: StaffRole | null; permissions: any; onSave: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  useEffect(() => {
    if (role) { setName(role.name); setDescription(role.description || ''); setSelectedPerms(role.permissions); }
    else { setName(''); setDescription(''); setSelectedPerms([]); }
  }, [role]);

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: 'Name is required', type: 'error' }); return; }
    setSaving(true);
    try {
      if (role) await staffApi.updateRole(role.id, { name, description, permissions: selectedPerms });
      else await staffApi.createRole({ name, description, permissions: selectedPerms });
      toast({ title: role ? 'Role updated' : 'Role created', type: 'success' });
      onSave();
      onClose();
    } catch { toast({ title: 'Failed to save role', type: 'error' }); }
    setSaving(false);
  };

  const togglePerm = (p: string) => setSelectedPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleCategory = (cat: string) => {
    const catPerms = permissions?.groups?.[cat] || [];
    const allSelected = catPerms.every((p: string) => selectedPerms.includes(p));
    setSelectedPerms(prev => allSelected ? prev.filter(p => !catPerms.includes(p)) : [...new Set([...prev, ...catPerms])]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={role ? 'Edit Role' : 'Create Role'} size="lg">
      <div className="space-y-4">
        <Input label="Role Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Billing Manager" />
        <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" />
        
        <div>
          <p className="text-sm font-medium mb-2">Permissions ({selectedPerms.length} selected)</p>
          <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-3">
            {permissions?.categories?.map((cat: string) => (
              <div key={cat}>
                <label className="flex items-center gap-2 font-medium text-sm cursor-pointer">
                  <input type="checkbox" checked={permissions?.groups?.[cat]?.every((p: string) => selectedPerms.includes(p))} onChange={() => toggleCategory(cat)} className="rounded" />
                  {cat.replace('_', ' ').toUpperCase()}
                </label>
                <div className="ml-6 mt-1 flex flex-wrap gap-1">
                  {permissions?.groups?.[cat]?.map((p: string) => (
                    <label key={p} className={`text-xs px-2 py-1 rounded cursor-pointer ${selectedPerms.includes(p) ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <input type="checkbox" checked={selectedPerms.includes(p)} onChange={() => togglePerm(p)} className="sr-only" />
                      {p.split(':')[1]}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}{role ? 'Update' : 'Create'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function MemberModal({ isOpen, onClose, member, roles, users, onSave }: { isOpen: boolean; onClose: () => void; member: StaffMember | null; roles: StaffRole[]; users: any[]; onSave: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [department, setDepartment] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (member) { setUserId(member.userId); setRoleId(member.staffRoleId); setDepartment(member.department || ''); setTitle(member.title || ''); setStatus(member.status); }
    else { setUserId(''); setRoleId(roles[0]?.id || ''); setDepartment(''); setTitle(''); setStatus('active'); }
  }, [member, roles]);

  const handleSave = async () => {
    if (!userId || !roleId) { toast({ title: 'User and role are required', type: 'error' }); return; }
    setSaving(true);
    try {
      if (member) await staffApi.updateMember(member.id, { staffRoleId: roleId, department, title, status });
      else await staffApi.createMember({ userId, staffRoleId: roleId, department, title });
      toast({ title: member ? 'Staff updated' : 'Staff added', type: 'success' });
      onSave();
      onClose();
    } catch { toast({ title: 'Failed to save', type: 'error' }); }
    setSaving(false);
  };

  const userOptions = users.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName} (${u.email})` }));
  const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));
  const statusOptions = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={member ? 'Edit Staff Member' : 'Add Staff Member'} size="md">
      <div className="space-y-4">
        {!member && <Select placeholder="Select user" options={userOptions} value={userId} onChange={setUserId} />}
        <Select placeholder="Select role" options={roleOptions} value={roleId} onChange={setRoleId} />
        <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior Billing Specialist" />
        <Input label="Department" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Finance" />
        {member && <Select placeholder="Select status" options={statusOptions} value={status} onChange={setStatus} />}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}{member ? 'Update' : 'Add'}</Button>
        </div>
      </div>
    </Modal>
  );
}
