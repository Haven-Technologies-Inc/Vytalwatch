/**
 * Provider Store
 *
 * Zustand store for provider-related state management.
 * @module stores/providerStore
 */

'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
  resolvedBy?: string;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  providerId: string;
  type: 'soap' | 'progress' | 'consult' | 'discharge';
  subject?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  providerId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  instructions?: string;
  status: 'pending' | 'approved' | 'dispensed' | 'cancelled';
  createdAt: string;
}

export interface ProviderSchedule {
  id: string;
  providerId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'available' | 'busy' | 'off';
  appointmentId?: string;
}

interface ProviderState {
  // Alerts
  alerts: Alert[];
  activeAlertsCount: number;
  criticalAlertsCount: number;

  // Clinical notes
  clinicalNotes: ClinicalNote[];

  // Prescriptions
  prescriptions: Prescription[];

  // Schedule
  schedule: ProviderSchedule[];

  // Filters
  alertFilters: {
    severity?: string;
    status?: string;
    patientId?: string;
  };

  // Loading states
  loadingAlerts: boolean;
  loadingNotes: boolean;
  loadingSchedule: boolean;

  // Actions - Alerts
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (id: string, updates: Partial<Alert>) => void;
  acknowledgeAlert: (id: string, acknowledgedBy: string) => void;
  resolveAlert: (id: string, resolvedBy: string) => void;
  setAlertFilters: (filters: Partial<ProviderState['alertFilters']>) => void;
  clearAlertFilters: () => void;

  // Actions - Clinical Notes
  setClinicalNotes: (notes: ClinicalNote[]) => void;
  addClinicalNote: (note: ClinicalNote) => void;
  updateClinicalNote: (id: string, updates: Partial<ClinicalNote>) => void;
  removeClinicalNote: (id: string) => void;

  // Actions - Prescriptions
  setPrescriptions: (prescriptions: Prescription[]) => void;
  addPrescription: (prescription: Prescription) => void;
  updatePrescription: (id: string, updates: Partial<Prescription>) => void;
  cancelPrescription: (id: string) => void;

  // Actions - Schedule
  setSchedule: (schedule: ProviderSchedule[]) => void;
  addScheduleBlock: (block: ProviderSchedule) => void;
  updateScheduleBlock: (id: string, updates: Partial<ProviderSchedule>) => void;
  removeScheduleBlock: (id: string) => void;

  reset: () => void;
}

const initialState = {
  alerts: [],
  activeAlertsCount: 0,
  criticalAlertsCount: 0,
  clinicalNotes: [],
  prescriptions: [],
  schedule: [],
  alertFilters: {},
  loadingAlerts: false,
  loadingNotes: false,
  loadingSchedule: false,
};

export const useProviderStore = create<ProviderState>()(
  devtools((set) => ({
    ...initialState,

    setAlerts: (alerts) =>
      set({
        alerts,
        activeAlertsCount: alerts.filter((a) => a.status === 'active').length,
        criticalAlertsCount: alerts.filter(
          (a) => a.severity === 'critical' && a.status === 'active'
        ).length,
      }, false, 'setAlerts'),

    addAlert: (alert) =>
      set((state) => {
        const newAlerts = [alert, ...state.alerts];
        return {
          alerts: newAlerts,
          activeAlertsCount: newAlerts.filter((a) => a.status === 'active').length,
          criticalAlertsCount: newAlerts.filter(
            (a) => a.severity === 'critical' && a.status === 'active'
          ).length,
        };
      }, false, 'addAlert'),

    updateAlert: (id, updates) =>
      set((state) => {
        const newAlerts = state.alerts.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        );
        return {
          alerts: newAlerts,
          activeAlertsCount: newAlerts.filter((a) => a.status === 'active').length,
          criticalAlertsCount: newAlerts.filter(
            (a) => a.severity === 'critical' && a.status === 'active'
          ).length,
        };
      }, false, 'updateAlert'),

    acknowledgeAlert: (id, acknowledgedBy) =>
      set((state) => {
        const newAlerts = state.alerts.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'acknowledged' as const,
                acknowledgedAt: new Date().toISOString(),
                acknowledgedBy,
              }
            : a
        );
        return {
          alerts: newAlerts,
          activeAlertsCount: newAlerts.filter((a) => a.status === 'active').length,
          criticalAlertsCount: newAlerts.filter(
            (a) => a.severity === 'critical' && a.status === 'active'
          ).length,
        };
      }, false, 'acknowledgeAlert'),

    resolveAlert: (id, resolvedBy) =>
      set((state) => {
        const newAlerts = state.alerts.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'resolved' as const,
                resolvedAt: new Date().toISOString(),
                resolvedBy,
              }
            : a
        );
        return {
          alerts: newAlerts,
          activeAlertsCount: newAlerts.filter((a) => a.status === 'active').length,
          criticalAlertsCount: newAlerts.filter(
            (a) => a.severity === 'critical' && a.status === 'active'
          ).length,
        };
      }, false, 'resolveAlert'),

    setAlertFilters: (filters) =>
      set((state) => ({
        alertFilters: { ...state.alertFilters, ...filters },
      }), false, 'setAlertFilters'),

    clearAlertFilters: () =>
      set({ alertFilters: {} }, false, 'clearAlertFilters'),

    setClinicalNotes: (clinicalNotes) =>
      set({ clinicalNotes }, false, 'setClinicalNotes'),

    addClinicalNote: (note) =>
      set((state) => ({
        clinicalNotes: [note, ...state.clinicalNotes],
      }), false, 'addClinicalNote'),

    updateClinicalNote: (id, updates) =>
      set((state) => ({
        clinicalNotes: state.clinicalNotes.map((n) =>
          n.id === id ? { ...n, ...updates } : n
        ),
      }), false, 'updateClinicalNote'),

    removeClinicalNote: (id) =>
      set((state) => ({
        clinicalNotes: state.clinicalNotes.filter((n) => n.id !== id),
      }), false, 'removeClinicalNote'),

    setPrescriptions: (prescriptions) =>
      set({ prescriptions }, false, 'setPrescriptions'),

    addPrescription: (prescription) =>
      set((state) => ({
        prescriptions: [prescription, ...state.prescriptions],
      }), false, 'addPrescription'),

    updatePrescription: (id, updates) =>
      set((state) => ({
        prescriptions: state.prescriptions.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      }), false, 'updatePrescription'),

    cancelPrescription: (id) =>
      set((state) => ({
        prescriptions: state.prescriptions.map((p) =>
          p.id === id ? { ...p, status: 'cancelled' as const } : p
        ),
      }), false, 'cancelPrescription'),

    setSchedule: (schedule) =>
      set({ schedule }, false, 'setSchedule'),

    addScheduleBlock: (block) =>
      set((state) => ({
        schedule: [...state.schedule, block],
      }), false, 'addScheduleBlock'),

    updateScheduleBlock: (id, updates) =>
      set((state) => ({
        schedule: state.schedule.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      }), false, 'updateScheduleBlock'),

    removeScheduleBlock: (id) =>
      set((state) => ({
        schedule: state.schedule.filter((s) => s.id !== id),
      }), false, 'removeScheduleBlock'),

    reset: () =>
      set(initialState, false, 'reset'),
  }))
);

export default useProviderStore;
