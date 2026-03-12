'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { patientsApi } from '@/services/api';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { RiskScoreGauge } from '@/components/dashboard/Charts';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  Plus,
  User,
  Activity,
  AlertTriangle,
  MessageSquare,
  Phone,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { extractData } from '@/lib/utils';

interface Patient {
  id: string;
  name: string;
  age: number;
  conditions: string[];
  riskScore: number;
  riskCategory: 'low' | 'moderate' | 'high';
  latestVitals: {
    bp?: string;
    glucose?: string;
    spo2?: string;
  };
  deviceStatus: 'connected' | 'disconnected';
  lastReading: string;
  alertCount: number;
}

interface PatientsApiResponse {
  data: {
    results: Patient[];
    total: number;
  };
}

const riskFilters = [
  { value: 'all', label: 'All Risk Levels' },
  { value: 'high', label: 'High Risk' },
  { value: 'moderate', label: 'Moderate Risk' },
  { value: 'low', label: 'Low Risk' },
];

const conditionFilters = [
  { value: 'all', label: 'All Conditions' },
  { value: 'hypertension', label: 'Hypertension' },
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'chf', label: 'CHF' },
  { value: 'copd', label: 'COPD' },
];

export default function ProviderPatientsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [riskFilter, setRiskFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  const {
    data: patientsResponse,
    isLoading,
    error,
    refetch,
  } = useApiQuery<PatientsApiResponse>(
    () => patientsApi.getAll({ limit: 100 }) as unknown as Promise<PatientsApiResponse>,
  );

  const patients: Patient[] = useMemo(() => {
    const inner = extractData<{ results?: Patient[]; data?: Patient[] }>(patientsResponse);
    return inner?.results ?? inner?.data ?? (Array.isArray(inner) ? inner : []);
  }, [patientsResponse]);

  const handleMessagePatient = useCallback((patientId: string, patientName: string) => {
    router.push(`/provider/messages?patient=${patientId}&name=${encodeURIComponent(patientName)}`);
  }, [router]);

  const handleCallPatient = useCallback((patientName: string) => {
    toast({ title: 'Initiating call', description: `Calling ${patientName}...` });
  }, [toast]);

  const handleEnrollSubmit = useCallback(() => {
    toast({ title: 'Enrollment started', description: 'Proceeding to device selection', type: 'success' });
    setShowEnrollModal(false);
    router.push('/provider/patients/enroll');
  }, [router, toast]);

  const filteredPatients = patients.filter((p) => {
    if (riskFilter !== 'all' && p.riskCategory !== riskFilter) return false;
    if (conditionFilter !== 'all') {
      const hasCondition = p.conditions.some((c) =>
        c.toLowerCase().includes(conditionFilter)
      );
      if (!hasCondition) return false;
    }
    return true;
  });

  const columns: Column<Patient>[] = [
    {
      key: 'name',
      header: 'Patient',
      render: (_, patient) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{patient.name}</p>
            <p className="text-sm text-gray-500">{patient.age} years old</p>
          </div>
        </div>
      ),
    },
    {
      key: 'conditions',
      header: 'Conditions',
      render: (conditions: string[]) => (
        <div className="flex flex-wrap gap-1">
          {conditions.map((c) => (
            <Badge key={c} variant="secondary" className="text-xs">
              {c}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'riskScore',
      header: 'Risk Score',
      render: (_, patient) => (
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700`}
          >
            <div
              className={`h-full rounded-full ${
                patient.riskCategory === 'high'
                  ? 'bg-red-500'
                  : patient.riskCategory === 'moderate'
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${patient.riskScore}%` }}
            />
          </div>
          <span className="text-sm font-medium">{patient.riskScore}</span>
        </div>
      ),
    },
    {
      key: 'latestVitals',
      header: 'Latest Vitals',
      render: (vitals: Patient['latestVitals']) => (
        <div className="text-sm">
          {vitals.bp && <span className="mr-3">BP: {vitals.bp}</span>}
          {vitals.glucose && <span className="mr-3">Glucose: {vitals.glucose}</span>}
          {vitals.spo2 && <span>SpO2: {vitals.spo2}</span>}
        </div>
      ),
    },
    {
      key: 'deviceStatus',
      header: 'Device',
      render: (status: string) => (
        <Badge variant={status === 'connected' ? 'success' : 'danger'}>
          {status}
        </Badge>
      ),
    },
    {
      key: 'lastReading',
      header: 'Last Reading',
    },
    {
      key: 'alertCount',
      header: 'Alerts',
      render: (count: number) =>
        count > 0 ? (
          <Badge variant="danger" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {count}
          </Badge>
        ) : (
          <span className="text-gray-400">&mdash;</span>
        ),
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading patients..." />
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

  if (patients.length === 0) {
    return (
      <DashboardLayout>
        <EmptyState
          icon={Users}
          title="No patients found"
          description="Enroll your first patient to get started with remote patient monitoring."
          action={{ label: 'Enroll Patient', onClick: () => setShowEnrollModal(true) }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patients</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage and monitor your patient population
            </p>
          </div>
          <Button onClick={() => setShowEnrollModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Enroll Patient
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500">Total Patients</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{patients.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500">High Risk</p>
            <p className="mt-1 text-3xl font-bold text-red-600">
              {patients.filter((p) => p.riskCategory === 'high').length}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500">Active Alerts</p>
            <p className="mt-1 text-3xl font-bold text-yellow-600">
              {patients.reduce((sum, p) => sum + p.alertCount, 0)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500">Devices Offline</p>
            <p className="mt-1 text-3xl font-bold text-gray-600">
              {patients.filter((p) => p.deviceStatus === 'disconnected').length}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select
            options={riskFilters}
            value={riskFilter}
            onChange={setRiskFilter}
            className="w-40"
          />
          <Select
            options={conditionFilters}
            value={conditionFilter}
            onChange={setConditionFilter}
            className="w-40"
          />
        </div>

        <DataTable
          data={filteredPatients}
          columns={columns}
          onRowClick={(patient) => setSelectedPatient(patient)}
          actions={[
            {
              label: 'View',
              icon: <Activity className="h-4 w-4" />,
              onClick: (patient) => setSelectedPatient(patient),
            },
            {
              label: 'Message',
              icon: <MessageSquare className="h-4 w-4" />,
              onClick: (patient) => handleMessagePatient(patient.id, patient.name),
            },
            {
              label: 'Call',
              icon: <Phone className="h-4 w-4" />,
              onClick: (patient) => handleCallPatient(patient.name),
            },
          ]}
        />

        <Modal
          isOpen={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
          title={selectedPatient?.name || 'Patient Details'}
          size="lg"
        >
          {selectedPatient && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedPatient.name}</h3>
                    <p className="text-gray-500">{selectedPatient.age} years old</p>
                    <div className="mt-1 flex gap-1">
                      {selectedPatient.conditions.map((c) => (
                        <Badge key={c} variant="secondary">{c}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <RiskScoreGauge score={selectedPatient.riskScore} size={120} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs text-gray-500">Blood Pressure</p>
                  <p className="text-lg font-semibold">{selectedPatient.latestVitals.bp || '\u2014'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs text-gray-500">Glucose</p>
                  <p className="text-lg font-semibold">{selectedPatient.latestVitals.glucose || '\u2014'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs text-gray-500">SpO2</p>
                  <p className="text-lg font-semibold">{selectedPatient.latestVitals.spo2 || '\u2014'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Link href={`/provider/patients/${selectedPatient.id}`} className="flex-1">
                  <Button className="w-full">View Full Profile</Button>
                </Link>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleMessagePatient(selectedPatient.id, selectedPatient.name)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCallPatient(selectedPatient.name)}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          title="Enroll New Patient"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-gray-500">
              Enter patient information to begin the enrollment process.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">First Name</label>
                <input className="w-full rounded-lg border px-3 py-2" placeholder="First name" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Last Name</label>
                <input className="w-full rounded-lg border px-3 py-2" placeholder="Last name" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <input className="w-full rounded-lg border px-3 py-2" type="email" placeholder="Email" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phone</label>
                <input className="w-full rounded-lg border px-3 py-2" placeholder="Phone number" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEnrollModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleEnrollSubmit}>Continue to Device Selection</Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
