/**
 * MedicationSchedule Component
 *
 * Daily medication schedule with time slots.
 * @module components/patient/MedicationSchedule
 */

'use client';

import React from 'react';
import { Calendar, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/utils/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';

export interface MedicationDose {
  id: string;
  medicationName: string;
  dosage: string;
  time: string;
  taken: boolean;
  takenAt?: string;
}

export interface MedicationScheduleProps {
  doses: MedicationDose[];
  date?: Date;
  onMarkTaken?: (id: string) => void;
  className?: string;
}

/**
 * MedicationSchedule - Daily medication schedule
 *
 * @example
 * ```tsx
 * <MedicationSchedule doses={todayDoses} onMarkTaken={handleMark} />
 * ```
 */
export function MedicationSchedule({
  doses,
  date = new Date(),
  onMarkTaken,
  className,
}: MedicationScheduleProps) {
  const sortedDoses = [...doses].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Calendar className="h-5 w-5" />
          Medication Schedule
        </h3>
        <span className="text-sm text-gray-500">
          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="space-y-3">
        {sortedDoses.map((dose) => (
          <div
            key={dose.id}
            className={cn(
              'flex items-center justify-between rounded-lg border p-4 transition-all',
              dose.taken
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-white hover:shadow-md'
            )}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                {dose.taken ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{dose.medicationName}</p>
                <p className="text-sm text-gray-600">{dose.dosage}</p>
                {dose.taken && dose.takenAt && (
                  <p className="mt-1 text-xs text-green-600">
                    Taken at {formatTime(dose.takenAt)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge
                variant={dose.taken ? 'success' : 'default'}
                size="sm"
              >
                {formatTime(dose.time)}
              </StatusBadge>
              {!dose.taken && onMarkTaken && (
                <button
                  onClick={() => onMarkTaken(dose.id)}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                >
                  Mark Taken
                </button>
              )}
            </div>
          </div>
        ))}

        {doses.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            No medications scheduled for today
          </p>
        )}
      </div>
    </div>
  );
}

export default MedicationSchedule;
