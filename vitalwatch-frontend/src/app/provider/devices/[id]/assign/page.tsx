'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { patientsApi, tenoviApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import type { TenoviHwiDevice } from '@/types';
import {
  User,
  Search,
  ChevronLeft,
  Check,
  Smartphone,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  conditions?: string[];
  status?: string;
}

const sensorCodeToType: Record<string, { name: string; icon: string }> = {
  'BP': { name: 'Blood Pressure Monitor', icon: '🩺' },
  'WS': { name: 'Weight Scale', icon: '⚖️' },
  'PO': { name: 'Pulse Oximeter', icon: '💓' },
  'GM': { name: 'Glucose Meter', icon: '🩸' },
  'TH': { name: 'Thermometer', icon: '🌡️' },
};

export default function AssignDevicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const deviceId = params.id as string;

  const [device, setDevice] = useState<TenoviHwiDevice | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const fetchDevice = useCallback(async () => {
    try {
      const response = await tenoviApi.getDevice(deviceId);
      if (response.data) {
        setDevice(response.data);
      }
    } catch (error) {
      console.error('Error fetching device:', error);
      toast({ title: 'Error', description: 'Failed to load device details', type: 'error' });
    }
  }, [deviceId, toast]);

  const fetchPatients = useCallback(async () => {
    try {
      const response = await patientsApi.getAll({ page: 1, limit: 100 });
      if (response.data?.data) {
        setPatients(response.data.data);
        setFilteredPatients(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({ title: 'Error', description: 'Failed to load patients', type: 'error' });
    }
  }, [toast]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDevice(), fetchPatients()]);
      setLoading(false);
    };
    loadData();
  }, [fetchDevice, fetchPatients]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = patients.filter(
        (p) =>
          p.firstName.toLowerCase().includes(query) ||
          p.lastName.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query)
      );
      setFilteredPatients(filtered);
    }
  }, [searchQuery, patients]);

  const handleAssign = async () => {
    if (!selectedPatient || !device) return;

    try {
      setAssigning(true);
      await tenoviApi.assignDevice(device.hwiDeviceId, selectedPatient.id);
      toast({ title: 'Success', description: `Device assigned to ${selectedPatient.firstName} ${selectedPatient.lastName}`, type: 'success' });
      router.push(`/provider/patients/${selectedPatient.id}`);
    } catch (error) {
      console.error('Assignment error:', error);
      toast({ title: 'Error', description: 'Failed to assign device', type: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <span className="ml-3 text-lg text-gray-600">Loading...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!device) {
    return (
      <DashboardLayout>
        <div className="flex h-96 flex-col items-center justify-center">
          <Smartphone className="h-16 w-16 text-gray-400" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Device Not Found</h2>
          <p className="mt-2 text-gray-500">The requested device could not be found.</p>
          <Link href="/provider/devices">
            <Button className="mt-4">Back to Devices</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const deviceInfo = sensorCodeToType[device.sensorCode || ''] || { name: device.deviceName || 'Device', icon: '📱' };
  const isConnected = device.status === 'connected' || device.status === 'active';

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/provider/devices">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Devices
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assign Device</h1>
        </div>

        {/* Device Info Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{deviceInfo.icon}</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{deviceInfo.name}</h2>
                <p className="text-sm text-gray-500">ID: {device.hwiDeviceId}</p>
                {device.modelNumber && (
                  <p className="text-sm text-gray-500">Model: {device.modelNumber}</p>
                )}
              </div>
            </div>
            <Badge variant={isConnected ? 'success' : 'secondary'}>
              {isConnected ? (
                <>
                  <Wifi className="mr-1 h-3 w-3" />
                  Active
                </>
              ) : (
                <>
                  <WifiOff className="mr-1 h-3 w-3" />
                  Offline
                </>
              )}
            </Badge>
          </div>

          {device.patientId && (
            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-400">
                    Device Already Assigned
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-500">
                    This device is currently assigned to another patient. Reassigning will remove it from the previous patient.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Patient Selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Select Patient</h3>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search patients by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Patient List */}
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {filteredPatients.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">No patients found</p>
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => setSelectedPatient(patient)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all',
                    selectedPatient?.id === patient.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{patient.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {patient.conditions?.slice(0, 2).map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                    {selectedPatient?.id === patient.id && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Link href="/provider/devices">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={handleAssign}
            disabled={!selectedPatient || assigning}
          >
            {assigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Assign Device
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
