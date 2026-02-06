/**
 * Patient Store
 *
 * Zustand store for patient-related state management.
 * @module stores/patientStore
 */

'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  status: 'active' | 'inactive' | 'discharged';
  riskScore?: number;
  lastVisit?: string;
  nextAppointment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vital {
  id: string;
  patientId: string;
  type: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  timestamp: string;
  deviceId?: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  instructions?: string;
  prescribedBy: string;
  adherenceRate?: number;
  active: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  providerName: string;
  type: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt: string;
  duration: number;
  notes?: string;
  location?: string;
}

export interface Task {
  id: string;
  patientId: string;
  title: string;
  description?: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

interface PatientState {
  // Current patient
  currentPatient: Patient | null;

  // Lists
  patients: Patient[];
  vitals: Vital[];
  medications: Medication[];
  appointments: Appointment[];
  tasks: Task[];

  // Loading states
  loading: boolean;
  loadingVitals: boolean;
  loadingMedications: boolean;
  loadingAppointments: boolean;

  // Actions
  setCurrentPatient: (patient: Patient | null) => void;
  setPatients: (patients: Patient[]) => void;
  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  removePatient: (id: string) => void;

  setVitals: (vitals: Vital[]) => void;
  addVital: (vital: Vital) => void;

  setMedications: (medications: Medication[]) => void;
  addMedication: (medication: Medication) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  removeMedication: (id: string) => void;

  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  cancelAppointment: (id: string) => void;

  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  toggleTaskComplete: (id: string) => void;
  removeTask: (id: string) => void;

  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  currentPatient: null,
  patients: [],
  vitals: [],
  medications: [],
  appointments: [],
  tasks: [],
  loading: false,
  loadingVitals: false,
  loadingMedications: false,
  loadingAppointments: false,
};

export const usePatientStore = create<PatientState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setCurrentPatient: (patient) =>
          set({ currentPatient: patient }, false, 'setCurrentPatient'),

        setPatients: (patients) =>
          set({ patients }, false, 'setPatients'),

        addPatient: (patient) =>
          set((state) => ({
            patients: [patient, ...state.patients],
          }), false, 'addPatient'),

        updatePatient: (id, updates) =>
          set((state) => ({
            patients: state.patients.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
            currentPatient:
              state.currentPatient?.id === id
                ? { ...state.currentPatient, ...updates }
                : state.currentPatient,
          }), false, 'updatePatient'),

        removePatient: (id) =>
          set((state) => ({
            patients: state.patients.filter((p) => p.id !== id),
            currentPatient:
              state.currentPatient?.id === id ? null : state.currentPatient,
          }), false, 'removePatient'),

        setVitals: (vitals) =>
          set({ vitals }, false, 'setVitals'),

        addVital: (vital) =>
          set((state) => ({
            vitals: [vital, ...state.vitals],
          }), false, 'addVital'),

        setMedications: (medications) =>
          set({ medications }, false, 'setMedications'),

        addMedication: (medication) =>
          set((state) => ({
            medications: [medication, ...state.medications],
          }), false, 'addMedication'),

        updateMedication: (id, updates) =>
          set((state) => ({
            medications: state.medications.map((m) =>
              m.id === id ? { ...m, ...updates } : m
            ),
          }), false, 'updateMedication'),

        removeMedication: (id) =>
          set((state) => ({
            medications: state.medications.filter((m) => m.id !== id),
          }), false, 'removeMedication'),

        setAppointments: (appointments) =>
          set({ appointments }, false, 'setAppointments'),

        addAppointment: (appointment) =>
          set((state) => ({
            appointments: [appointment, ...state.appointments],
          }), false, 'addAppointment'),

        updateAppointment: (id, updates) =>
          set((state) => ({
            appointments: state.appointments.map((a) =>
              a.id === id ? { ...a, ...updates } : a
            ),
          }), false, 'updateAppointment'),

        cancelAppointment: (id) =>
          set((state) => ({
            appointments: state.appointments.map((a) =>
              a.id === id ? { ...a, status: 'cancelled' as const } : a
            ),
          }), false, 'cancelAppointment'),

        setTasks: (tasks) =>
          set({ tasks }, false, 'setTasks'),

        addTask: (task) =>
          set((state) => ({
            tasks: [task, ...state.tasks],
          }), false, 'addTask'),

        updateTask: (id, updates) =>
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          }), false, 'updateTask'),

        toggleTaskComplete: (id) =>
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id
                ? {
                    ...t,
                    completed: !t.completed,
                    completedAt: !t.completed ? new Date().toISOString() : undefined,
                  }
                : t
            ),
          }), false, 'toggleTaskComplete'),

        removeTask: (id) =>
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
          }), false, 'removeTask'),

        setLoading: (loading) =>
          set({ loading }, false, 'setLoading'),

        reset: () =>
          set(initialState, false, 'reset'),
      }),
      {
        name: 'patient-storage',
        partialize: (state) => ({
          currentPatient: state.currentPatient,
        }),
      }
    )
  )
);

export default usePatientStore;
