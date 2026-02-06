/**
 * SymptomLogger Component
 *
 * Log symptoms with severity and details.
 * @module components/patient/SymptomLogger
 */

'use client';

import React, { useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation } from '@/hooks/useApi';
import { api } from '@/utils/api';
import { useNotificationStore } from '@/stores/notificationStore';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export interface SymptomLoggerProps {
  patientId: string;
  onSuccess?: () => void;
  className?: string;
}

const commonSymptoms = [
  'Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea',
  'Dizziness', 'Chest Pain', 'Shortness of Breath', 'Abdominal Pain'
];

const severityLevels = [
  { value: 1, label: 'Mild', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 2, label: 'Moderate', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 3, label: 'Severe', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 4, label: 'Critical', color: 'bg-red-100 text-red-800 border-red-200' },
];

/**
 * SymptomLogger - Log symptoms with details
 */
export function SymptomLogger({ patientId, onSuccess, className }: SymptomLoggerProps) {
  const [symptom, setSymptom] = useState('');
  const [severity, setSeverity] = useState(1);
  const [notes, setNotes] = useState('');
  const showSuccess = useNotificationStore((state) => state.showSuccess);
  const showError = useNotificationStore((state) => state.showError);

  const { mutate, loading } = useMutation(
    (data: any) => api.post(`/patients/${patientId}/symptoms`, data),
    {
      onSuccess: () => {
        showSuccess('Symptom logged successfully');
        setSymptom('');
        setSeverity(1);
        setNotes('');
        onSuccess?.();
      },
      onError: (error) => {
        showError(error.message || 'Failed to log symptom');
      },
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptom.trim()) return;

    await mutate({
      symptom: symptom.trim(),
      severity,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
      <div className="mb-4 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold text-gray-900">Log Symptom</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Symptom
          </label>
          <input
            type="text"
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            placeholder="Enter symptom..."
            list="common-symptoms"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
          <datalist id="common-symptoms">
            {commonSymptoms.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Severity
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {severityLevels.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setSeverity(level.value)}
                className={cn(
                  'rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all',
                  severity === level.value
                    ? level.color
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Additional Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any additional details..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !symptom.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <LoadingSpinner size="sm" variant="white" />
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Log Symptom
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default SymptomLogger;
