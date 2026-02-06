/**
 * MedicationList Component
 *
 * List of current medications with adherence.
 * @module components/patient/MedicationList
 */

'use client';

import React from 'react';
import { Pill, Check, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime, getAdherenceColor } from '@/utils/formatters';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  adherenceRate?: number;
  nextDose?: string;
  active: boolean;
}

export interface MedicationListProps {
  medications: Medication[];
  loading?: boolean;
  onTakeMedication?: (id: string) => void;
  className?: string;
}

/**
 * MedicationList - List of current medications
 *
 * @example
 * ```tsx
 * <MedicationList medications={meds} onTakeMedication={handleTake} />
 * ```
 */
export function MedicationList({
  medications,
  loading = false,
  onTakeMedication,
  className,
}: MedicationListProps) {
  if (loading) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
        <LoadingSpinner center text="Loading medications..." />
      </div>
    );
  }

  if (!medications || medications.length === 0) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
        <EmptyState
          icon={<Pill className="h-12 w-12" />}
          title="No medications"
          description="No active medications found"
        />
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Current Medications</h3>
      <div className="space-y-3">
        {medications.map((med) => (
          <div
            key={med.id}
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-gray-900">{med.name}</h4>
                  {!med.active && (
                    <StatusBadge variant="default" size="sm">Inactive</StatusBadge>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {med.dosage} - {med.frequency}
                </p>
                {med.instructions && (
                  <p className="mt-1 text-xs text-gray-500">{med.instructions}</p>
                )}
                {med.adherenceRate !== undefined && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={cn(
                          'h-full transition-all',
                          getAdherenceColor(med.adherenceRate).replace('text-', 'bg-')
                        )}
                        style={{ width: `${med.adherenceRate}%` }}
                      />
                    </div>
                    <span className={cn('text-xs font-medium', getAdherenceColor(med.adherenceRate))}>
                      {med.adherenceRate}% adherence
                    </span>
                  </div>
                )}
              </div>
              {med.nextDose && onTakeMedication && (
                <div className="ml-4 text-right">
                  <p className="mb-2 text-xs text-gray-500">
                    <Clock className="inline h-3 w-3" /> Next: {formatTime(med.nextDose)}
                  </p>
                  <button
                    onClick={() => onTakeMedication(med.id)}
                    className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    <Check className="h-4 w-4" />
                    Take Now
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MedicationList;
