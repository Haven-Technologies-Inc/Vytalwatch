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
import { authApi, usersApi } from '@/services/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { User, Mail, Phone, Building2, Stethoscope, Edit2, Save, X, RefreshCw, Award, Calendar, Users } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { extractData } from '@/lib/utils';

interface ProviderProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  specialty: string;
  npi: string;
  licenseNumber: string;
  organization: string;
  department: string;
  credentials: string[];
  yearsOfExperience: number;
  activePatients: number;
  bio: string;
}

interface MeApiResponse {
  data: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    title?: string;
    specialty?: string;
    npi?: string;
    licenseNumber?: string;
    organization?: { name: string };
    organizationName?: string;
    department?: string;
    credentials?: string[];
    yearsOfExperience?: number;
    activePatients?: number;
    bio?: string;
  };
}

export default function ProviderProfilePage() {
  const { toast } = useToast();
  const { user } = useAuthStore();

  const {
    data: meData,
    isLoading,
    error,
    refetch,
  } = useApiQuery<MeApiResponse>(
    () => authApi.getCurrentUser() as unknown as Promise<MeApiResponse>,
  );

  const [profile, setProfile] = useState<ProviderProfile>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: 'Dr.',
    specialty: '',
    npi: '',
    licenseNumber: '',
    organization: '',
    department: '',
    credentials: [],
    yearsOfExperience: 0,
    activePatients: 0,
    bio: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<ProviderProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);

  // Populate profile from API response
  useEffect(() => {
    const d = extractData<MeApiResponse['data']>(meData);
    if (d) {
      const newProfile: ProviderProfile = {
        firstName: d.firstName || user?.firstName || '',
        lastName: d.lastName || user?.lastName || '',
        email: d.email || user?.email || '',
        phone: d.phone || '',
        title: d.title || 'Dr.',
        specialty: d.specialty || '',
        npi: d.npi || '',
        licenseNumber: d.licenseNumber || '',
        organization: d.organization?.name || d.organizationName || '',
        department: d.department || '',
        credentials: d.credentials || [],
        yearsOfExperience: d.yearsOfExperience || 0,
        activePatients: d.activePatients || 0,
        bio: d.bio || '',
      };
      setProfile(newProfile);
      setEditedProfile(newProfile);
    }
  }, [meData, user]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await usersApi.updateProfile({
        firstName: editedProfile.firstName,
        lastName: editedProfile.lastName,
        phone: editedProfile.phone,
        specialty: editedProfile.specialty,
        department: editedProfile.department,
        bio: editedProfile.bio,
      } as Record<string, unknown> & { firstName: string; lastName: string });
      setProfile(editedProfile);
      setIsEditing(false);
      await refetch();
      toast({ title: 'Profile saved', description: 'Your profile has been updated', type: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save profile', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [editedProfile, toast, refetch]);

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
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your provider profile</p>
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
                {profile.title} {profile.firstName} {profile.lastName}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">{profile.specialty}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {profile.credentials.map((cred) => (
                  <Badge key={cred} variant="info">{cred}</Badge>
                ))}
              </div>

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
                <span>{profile.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span>{profile.organization}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <Stethoscope className="h-4 w-4 text-gray-400" />
                <span>NPI: {profile.npi}</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-200 pt-6 dark:border-gray-700">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{profile.activePatients}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Patients</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{profile.yearsOfExperience}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Years Experience</p>
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
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <Award className="h-5 w-5 text-amber-500" />Professional Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Specialty</label>
                  <Input
                    value={isEditing ? editedProfile.specialty : profile.specialty}
                    onChange={(e) => setEditedProfile({ ...editedProfile, specialty: e.target.value })}
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
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">NPI Number</label>
                  <Input value={profile.npi} disabled />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">License Number</label>
                  <Input value={profile.licenseNumber} disabled />
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="provider-bio" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                <textarea
                  id="provider-bio"
                  value={isEditing ? editedProfile.bio : profile.bio}
                  onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                  disabled={!isEditing}
                  rows={3}
                  placeholder="Enter your professional bio"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-blue-500 dark:disabled:bg-gray-900"
                />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <Building2 className="h-5 w-5 text-purple-500" />Organization
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Organization Name</label>
                  <Input value={profile.organization} disabled />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
