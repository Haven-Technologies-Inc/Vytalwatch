/**
 * PatientDetailModal Component
 *
 * Full patient details modal.
 * @module components/provider/PatientDetailModal
 */

'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X, User, Activity, Pill, FileText } from 'lucide-react';
import { formatDate, formatPhoneNumber } from '@/utils/formatters';
import { UserAvatar } from '@/components/shared/UserAvatar';

export interface PatientDetailModalProps {
  patient: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * PatientDetailModal - Full patient details
 */
export function PatientDetailModal({ patient, open, onOpenChange }: PatientDetailModalProps) {
  if (!patient) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <UserAvatar name={`${patient.firstName} ${patient.lastName}`} size="xl" />
              <div>
                <Dialog.Title className="text-2xl font-bold text-gray-900">
                  {patient.firstName} {patient.lastName}
                </Dialog.Title>
                <p className="text-gray-600">MRN: {patient.mrn}</p>
              </div>
            </div>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </Dialog.Close>
          </div>

          <Tabs.Root defaultValue="overview">
            <Tabs.List className="flex gap-4 border-b border-gray-200 mb-6">
              {['overview', 'vitals', 'medications', 'history'].map((tab) => (
                <Tabs.Trigger
                  key={tab}
                  value={tab}
                  className="pb-2 text-sm font-medium capitalize text-gray-600 transition-colors hover:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                >
                  {tab}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <Tabs.Content value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
                <InfoItem label="Gender" value={patient.gender} />
                <InfoItem label="Phone" value={formatPhoneNumber(patient.phone)} />
                <InfoItem label="Email" value={patient.email} />
              </div>
            </Tabs.Content>

            <Tabs.Content value="vitals">
              <p className="text-gray-600">Recent vitals data would appear here</p>
            </Tabs.Content>

            <Tabs.Content value="medications">
              <p className="text-gray-600">Current medications would appear here</p>
            </Tabs.Content>

            <Tabs.Content value="history">
              <p className="text-gray-600">Medical history would appear here</p>
            </Tabs.Content>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-gray-900">{value}</p>
    </div>
  );
}

export default PatientDetailModal;
