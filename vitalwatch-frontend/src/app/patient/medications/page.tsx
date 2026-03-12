'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill, Clock, CheckCircle2, Bell, Plus, Calendar, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useAuthStore } from '@/stores/authStore';
import { patientsApi } from '@/services/api';
import { extractArray, safeArray } from '@/lib/utils';
import type { ApiResponse, Medication as ApiMedication } from '@/types';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  schedule: string[];
  prescribedBy: string;
  refillDate: string;
  instructions?: string;
  takenToday: boolean[];
}

function mapApiMedication(med: ApiMedication): Medication {
  const scheduleItems = safeArray<{ time: string; taken?: boolean }>(med.schedule);
  return {
    id: med.id,
    name: med.name,
    dosage: med.dosage,
    frequency: med.frequency,
    schedule: scheduleItems.map((s) => s.time),
    prescribedBy: med.prescribedBy || 'Provider',
    refillDate: med.refillDate ? new Date(med.refillDate).toISOString().split('T')[0] : '',
    instructions: med.notes,
    takenToday: scheduleItems.map((s) => s.taken ?? false),
  };
}

export default function PatientMedicationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const patientId = user?.id || '';

  // Fetch medications from API
  const {
    data: medicationsResponse,
    isLoading,
    error,
    refetch,
  } = useApiQuery<ApiResponse<ApiMedication[]>>(
    () => patientsApi.getMedications(patientId),
    { enabled: !!patientId }
  );

  // Local taken state overrides
  const [takenOverrides, setTakenOverrides] = useState<Record<string, boolean[]>>({});

  const medications = useMemo(() => {
    const apiMeds = extractArray<ApiMedication>(medicationsResponse).map(mapApiMedication);
    return apiMeds.map((med) => {
      if (takenOverrides[med.id]) {
        return {
          ...med,
          takenToday: med.takenToday.map((taken, idx) =>
            takenOverrides[med.id]?.[idx] !== undefined ? takenOverrides[med.id][idx] : taken
          ),
        };
      }
      return med;
    });
  }, [medicationsResponse, takenOverrides]);

  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleMarkAsTaken = useCallback((medId: string, doseIndex: number, medName: string) => {
    setTakenOverrides((prev) => {
      const existing = prev[medId] || [];
      const updated = [...existing];
      updated[doseIndex] = true;
      return { ...prev, [medId]: updated };
    });
    toast({ title: 'Medication taken', description: `${medName} marked as taken`, type: 'success' });
  }, [toast]);

  const handleSetReminder = useCallback((med: Medication) => {
    toast({ title: 'Reminder set', description: `Reminder for ${med.name} at ${med.schedule.join(', ')}`, type: 'success' });
  }, [toast]);

  const handleRequestRefill = useCallback((med: Medication) => {
    toast({ title: 'Refill requested', description: `Request sent to ${med.prescribedBy} for ${med.name}`, type: 'success' });
  }, [toast]);

  const handleAddMedication = useCallback(() => {
    toast({ title: 'Add medication', description: 'Opening medication form', type: 'info' });
    setShowAddModal(false);
    router.push('/patient/medications/add');
  }, [router, toast]);

  const totalDoses = medications.reduce((sum, m) => sum + safeArray(m.schedule).length, 0);
  const takenDoses = medications.reduce(
    (sum, m) => sum + safeArray<boolean>(m.takenToday).filter(Boolean).length,
    0
  );
  const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  const needsRefillSoon = medications.filter((m) => {
    if (!m.refillDate) return false;
    const refillDate = new Date(m.refillDate);
    const daysUntilRefill = Math.ceil((refillDate.getTime() - Date.now()) / 86400000);
    return daysUntilRefill <= 14;
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading medications..." />
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

  if (!isLoading && medications.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Medications</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Track your medications and reminders
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Medication
            </Button>
          </div>
          <EmptyState
            icon={Pill}
            title="No medications found"
            description="Your medications will appear here once they are added by your care team."
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Medications</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Track your medications and reminders
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Medication
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Medications</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{medications.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Today&apos;s Adherence</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{adherenceRate}%</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Doses Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{takenDoses}/{totalDoses}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Needs Refill</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{needsRefillSoon.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Today&apos;s Schedule</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {medications.map((med) =>
              safeArray<string>(med.schedule).map((time, index) => (
                <div
                  key={`${med.id}-${index}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-full p-2 ${
                      med.takenToday[index]
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                    }`}>
                      {med.takenToday[index] ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {med.name} - {med.dosage}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {time} &bull; {med.instructions || 'No special instructions'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={med.takenToday[index] ? 'success' : 'secondary'}>
                      {med.takenToday[index] ? 'Taken' : 'Pending'}
                    </Badge>
                    {!med.takenToday[index] && (
                      <Button size="sm" onClick={() => handleMarkAsTaken(med.id, index, med.name)}>Mark as Taken</Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Medications</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {medications.map((med) => (
              <div
                key={med.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                onClick={() => {
                  setSelectedMed(med);
                  setShowDetails(true);
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{med.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {med.dosage} &bull; {med.frequency}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Refill by</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {med.refillDate ? new Date(med.refillDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Modal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title={selectedMed?.name || 'Medication Details'}
          size="md"
        >
          {selectedMed && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Dosage</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedMed.dosage}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Frequency</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedMed.frequency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prescribed By</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedMed.prescribedBy}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Refill Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedMed.refillDate ? new Date(selectedMed.refillDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              {selectedMed.instructions && (
                <div>
                  <p className="text-sm text-gray-500">Instructions</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedMed.instructions}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => handleSetReminder(selectedMed)}>
                  <Bell className="mr-2 h-4 w-4" />
                  Set Reminder
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => handleRequestRefill(selectedMed)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Request Refill
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
