'use client';

import { useState, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { FileUpload } from '@/components/ui/FileUpload';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuthStore } from '@/stores/authStore';
import { useApiQuery } from '@/hooks/useApiQuery';
import { apiClient } from '@/services/api/client';
import { User, Mail, Phone, Building2, Shield, Edit2, Save, X, RefreshCw, Key, Clock } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface AdminProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  department: string;
  employeeId: string;
  organization: string;
  permissions: string[];
  lastLogin: string;
  accountCreated: string;
  twoFactorEnabled: boolean;
  role?: string;
}

interface ProfileResponse {
  data: AdminProfile;
}

export default function AdminProfilePage() {
  const { toast } = useToast();
  const { user } = useAuthStore();

  const {
    data: profileRes,
    isLoading,
    error,
    refetch,
  } = useApiQuery<ProfileResponse>(
    () => apiClient.get<ProfileResponse>('/auth/me'),
  );

  const [profile, setProfile] = useState<AdminProfile>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    title: 'System Administrator',
    department: 'IT Administration',
    employeeId: '',
    organization: '',
    permissions: [],
    lastLogin: new Date().toISOString(),
    accountCreated: '',
    twoFactorEnabled: false,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<AdminProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);

  // Sync API data to local state
  useEffect(() => {
    if (profileRes?.data) {
      const p = profileRes.data;
      const merged: AdminProfile = {
        firstName: p.firstName || user?.firstName || '',
        lastName: p.lastName || user?.lastName || '',
        email: p.email || user?.email || '',
        phone: p.phone || '',
        title: p.title || 'System Administrator',
        department: p.department || 'IT Administration',
        employeeId: p.employeeId || '',
        organization: p.organization || '',
        permissions: p.permissions || [],
        lastLogin: p.lastLogin || new Date().toISOString(),
        accountCreated: p.accountCreated || '',
        twoFactorEnabled: p.twoFactorEnabled ?? false,
        role: p.role || user?.role,
      };
      setProfile(merged);
      setEditedProfile(merged);
    }
  }, [profileRes, user]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await apiClient.put('/auth/me', {
        firstName: editedProfile.firstName,
        lastName: editedProfile.lastName,
        phone: editedProfile.phone,
        title: editedProfile.title,
        department: editedProfile.department,
      });
      setProfile(editedProfile);
      setIsEditing(false);
      toast({ title: 'Profile saved', description: 'Your profile has been updated', type: 'success' });
    } catch {
      toast({ title: 'Save failed', description: 'Could not update profile', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [editedProfile, toast]);

  const handleCancel = useCallback(() => {
    setEditedProfile(profile);
    setIsEditing(false);
  }, [profile]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading profile..." />
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your administrator account</p>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" />Edit Profile
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col items-center text-center">
              <Avatar
                name={`${profile.firstName} ${profile.lastName}`}
                size="xl"
                className="mb-4"
              />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {profile.firstName} {profile.lastName}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">{profile.title}</p>
              <Badge variant="info" className="mt-2 capitalize">{profile.role || user?.role || 'Admin'}</Badge>

              {isEditing && (
                <div className="mt-4 w-full">
                  <FileUpload
                    accept="image/*"
                    maxSize={5}
                    label="Update Photo"
                    helperText="JPG, PNG up to 5MB"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{profile.phone || 'Not set'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span>{profile.organization || 'Not set'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <Key className="h-4 w-4 text-gray-400" />
                <span>{profile.employeeId || 'Not set'}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <User className="h-5 w-5" />Personal Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                  <Input
                    value={isEditing ? editedProfile.firstName : profile.firstName}
                    onChange={(e) => setEditedProfile({ ...editedProfile, firstName: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                  <Input
                    value={isEditing ? editedProfile.lastName : profile.lastName}
                    onChange={(e) => setEditedProfile({ ...editedProfile, lastName: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <Input value={profile.email} disabled />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <Input
                    value={isEditing ? editedProfile.phone : profile.phone}
                    onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                  <Input
                    value={isEditing ? editedProfile.title : profile.title}
                    onChange={(e) => setEditedProfile({ ...editedProfile, title: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
                  <Input
                    value={isEditing ? editedProfile.department : profile.department}
                    onChange={(e) => setEditedProfile({ ...editedProfile, department: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <Shield className="h-5 w-5 text-blue-500" />Permissions & Access
              </h3>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Active Permissions</label>
                <div className="flex flex-wrap gap-2">
                  {profile.permissions.map((permission) => (
                    <Badge key={permission} variant="success">{permission}</Badge>
                  ))}
                  {profile.permissions.length === 0 && (
                    <span className="text-sm text-gray-400">No permissions assigned</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Extra security for your account</p>
                  </div>
                </div>
                <Badge variant={profile.twoFactorEnabled ? 'success' : 'warning'}>
                  {profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <Clock className="h-5 w-5 text-purple-500" />Account Activity
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Last Login</label>
                  <Input value={profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'N/A'} disabled />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Account Created</label>
                  <Input value={profile.accountCreated ? new Date(profile.accountCreated).toLocaleDateString() : 'N/A'} disabled />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
