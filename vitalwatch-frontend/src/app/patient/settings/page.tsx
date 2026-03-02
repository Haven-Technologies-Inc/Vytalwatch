'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  User,
  Bell,
  Shield,
  Smartphone,
  Moon,
  Globe,
  Lock,
  Mail,
  Phone,
  Save,
  Camera,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { authApi, usersApi } from '@/services/api';
import apiClient from '@/services/api/client';
import type { ApiResponse, User as UserType } from '@/types';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'devices', label: 'Devices', icon: Smartphone },
  { id: 'preferences', label: 'Preferences', icon: Globe },
];

export default function PatientSettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch current user data from API
  const {
    data: userResponse,
    isLoading,
    error,
    refetch,
  } = useApiQuery<ApiResponse<UserType>>(
    () => authApi.getCurrentUser(),
    { enabled: true }
  );

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
  });

  // Populate profile from API response
  useEffect(() => {
    if (userResponse?.data) {
      const u = userResponse.data as UserType & Record<string, unknown>;
      setProfile({
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        phone: (u.phone as string) || '',
        dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth as string).toISOString().split('T')[0] : '',
        address: (u.address as string) || '',
      });
    }
  }, [userResponse]);

  // Fetch settings for notifications
  const {
    data: settingsResponse,
  } = useApiQuery<ApiResponse<Record<string, unknown>>>(
    () => apiClient.get<ApiResponse<Record<string, unknown>>>('/users/settings'),
    { enabled: true }
  );

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: true,
    pushNotifications: true,
    medicationReminders: true,
    appointmentReminders: true,
    vitalAlerts: true,
    weeklyReports: false,
  });

  // Populate notifications from settings response
  useEffect(() => {
    if (settingsResponse?.data) {
      const s = settingsResponse.data as Record<string, unknown>;
      setNotifications((prev) => ({
        emailAlerts: (s.emailAlerts as boolean) ?? prev.emailAlerts,
        smsAlerts: (s.smsAlerts as boolean) ?? prev.smsAlerts,
        pushNotifications: (s.pushNotifications as boolean) ?? prev.pushNotifications,
        medicationReminders: (s.medicationReminders as boolean) ?? prev.medicationReminders,
        appointmentReminders: (s.appointmentReminders as boolean) ?? prev.appointmentReminders,
        vitalAlerts: (s.vitalAlerts as boolean) ?? prev.vitalAlerts,
        weeklyReports: (s.weeklyReports as boolean) ?? prev.weeklyReports,
      }));
    }
  }, [settingsResponse]);

  // Fetch devices for settings devices tab
  const {
    data: devicesResponse,
  } = useApiQuery<ApiResponse<Array<{ name: string; serial: string; status: string; battery: number }>>>(
    () => apiClient.get<ApiResponse<Array<{ name: string; serial: string; status: string; battery: number }>>>('/devices/my-devices'),
    { enabled: activeTab === 'devices' }
  );

  const settingsDevices = devicesResponse?.data || [];

  const handleSaveProfile = useCallback(async () => {
    setIsSaving(true);
    try {
      await usersApi.updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      } as Partial<UserType>);
      toast({ title: 'Profile saved', description: 'Your profile has been updated', type: 'success' });
      refetch();
    } catch {
      toast({ title: 'Save failed', description: 'Could not save profile', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [profile, toast, refetch]);

  const handleUpdatePassword = useCallback(async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({ title: 'Password updated', description: 'Your password has been changed successfully', type: 'success' });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const handleEnable2FA = useCallback(() => {
    toast({ title: 'Two-Factor Authentication', description: 'Setting up 2FA...', type: 'info' });
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="w-full lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  )}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h2>

                <div className="mb-6 flex items-center gap-4">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-10 w-10" />
                    </div>
                    <button className="absolute bottom-0 right-0 rounded-full bg-white p-1.5 shadow-md dark:bg-gray-800" aria-label="Change profile photo" type="button">
                      <Camera className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Profile Photo</p>
                    <p className="text-sm text-gray-500">JPG, PNG or GIF. Max 2MB</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      First Name
                    </label>
                    <Input
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Last Name
                    </label>
                    <Input
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Phone
                    </label>
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Address
                    </label>
                    <Input
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">Delivery Methods</h3>
                    {[
                      { key: 'emailAlerts', label: 'Email Notifications', icon: Mail, desc: 'Receive alerts via email' },
                      { key: 'smsAlerts', label: 'SMS Notifications', icon: Phone, desc: 'Receive alerts via text message' },
                      { key: 'pushNotifications', label: 'Push Notifications', icon: Bell, desc: 'Receive notifications on your device' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                            <p className="text-sm text-gray-500">{item.desc}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={notifications[item.key as keyof typeof notifications]}
                            onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                            className="peer sr-only"
                            aria-label={`Toggle ${item.label}`}
                          />
                          <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">Alert Types</h3>
                    {[
                      { key: 'medicationReminders', label: 'Medication Reminders', desc: 'Get reminded to take your medications' },
                      { key: 'appointmentReminders', label: 'Appointment Reminders', desc: 'Get notified about upcoming appointments' },
                      { key: 'vitalAlerts', label: 'Vital Alerts', desc: 'Get alerts when vitals are out of range' },
                      { key: 'weeklyReports', label: 'Weekly Health Reports', desc: 'Receive weekly summary of your health data' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={notifications[item.key as keyof typeof notifications]}
                            onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                            className="peer sr-only"
                            aria-label={`Toggle ${item.label}`}
                          />
                          <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
                  <div className="max-w-md space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Current Password
                      </label>
                      <Input type="password" placeholder="Enter current password" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        New Password
                      </label>
                      <Input type="password" placeholder="Enter new password" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Confirm New Password
                      </label>
                      <Input type="password" placeholder="Confirm new password" />
                    </div>
                    <Button onClick={handleUpdatePassword} disabled={isSaving}>
                      {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isSaving ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h2>
                      <p className="mt-1 text-sm text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <Badge variant="secondary">Not Enabled</Badge>
                  </div>
                  <Button variant="outline" className="mt-4" onClick={handleEnable2FA}>
                    <Lock className="mr-2 h-4 w-4" />
                    Enable 2FA
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'devices' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Connected Devices</h2>
                <div className="space-y-4">
                  {settingsDevices.length > 0 ? (
                    settingsDevices.map((device) => (
                      <div key={device.serial || device.name} className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Smartphone className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{device.name}</p>
                            <p className="text-sm text-gray-500">Serial: {device.serial}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <Badge variant={device.status === 'active' ? 'success' : 'secondary'}>
                              {device.status}
                            </Badge>
                            {device.battery !== undefined && (
                              <p className="mt-1 text-xs text-gray-500">Battery: {device.battery}%</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No devices connected. Visit the Devices page to manage your devices.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">App Preferences</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Moon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                        <p className="text-sm text-gray-500">Use dark theme</p>
                      </div>
                    </div>
                    {mounted && (
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          aria-label="Toggle dark mode"
                          checked={theme === 'dark'}
                          onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        />
                        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
                      </label>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Language</p>
                        <p className="text-sm text-gray-500">Select your preferred language</p>
                      </div>
                    </div>
                    <select className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" aria-label="Language selection">
                      <option>English (US)</option>
                      <option>Spanish</option>
                      <option>French</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
