/**
 * VitalsEntryForm Component
 *
 * Manual vital entry form with validation.
 * @module components/patient/VitalsEntryForm
 */

'use client';

import React, { useState } from 'react';
import { Activity, Heart, Thermometer, Droplet } from 'lucide-react';
import { useMutation } from '@/hooks/useApi';
import { api } from '@/utils/api';
import { usePatientStore } from '@/stores/patientStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils';

interface VitalData {
  heartRate: string;
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  temperature: string;
  oxygenSaturation: string;
  respiratoryRate: string;
  notes: string;
}

export interface VitalsEntryFormProps {
  /**
   * Patient ID
   */
  patientId: string;

  /**
   * Callback when vitals are submitted
   */
  onSuccess?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * VitalsEntryForm - Manual vital entry with validation
 *
 * @example
 * ```tsx
 * <VitalsEntryForm patientId="123" onSuccess={() => console.log('Saved')} />
 * ```
 */
export function VitalsEntryForm({
  patientId,
  onSuccess,
  className,
}: VitalsEntryFormProps) {
  const [formData, setFormData] = useState<VitalData>({
    heartRate: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    temperature: '',
    oxygenSaturation: '',
    respiratoryRate: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<VitalData>>({});
  const addVital = usePatientStore((state) => state.addVital);
  const showSuccess = useNotificationStore((state) => state.showSuccess);
  const showError = useNotificationStore((state) => state.showError);

  const { mutate, loading } = useMutation(
    (data: any) => api.vitals.create(patientId, data),
    {
      onSuccess: (data) => {
        if (data) {
          addVital(data);
          showSuccess('Vitals recorded successfully');
          setFormData({
            heartRate: '',
            bloodPressureSystolic: '',
            bloodPressureDiastolic: '',
            temperature: '',
            oxygenSaturation: '',
            respiratoryRate: '',
            notes: '',
          });
          setErrors({});
          onSuccess?.();
        }
      },
      onError: (error) => {
        showError(error.message || 'Failed to record vitals');
      },
    }
  );

  const validateForm = (): boolean => {
    const newErrors: Partial<VitalData> = {};

    if (formData.heartRate) {
      const hr = parseInt(formData.heartRate);
      if (hr < 40 || hr > 200) {
        newErrors.heartRate = 'Heart rate must be between 40-200 bpm';
      }
    }

    if (formData.bloodPressureSystolic && formData.bloodPressureDiastolic) {
      const sys = parseInt(formData.bloodPressureSystolic);
      const dia = parseInt(formData.bloodPressureDiastolic);
      if (sys < 70 || sys > 250) {
        newErrors.bloodPressureSystolic = 'Systolic must be between 70-250';
      }
      if (dia < 40 || dia > 150) {
        newErrors.bloodPressureDiastolic = 'Diastolic must be between 40-150';
      }
      if (sys <= dia) {
        newErrors.bloodPressureSystolic = 'Systolic must be higher than diastolic';
      }
    }

    if (formData.temperature) {
      const temp = parseFloat(formData.temperature);
      if (temp < 95 || temp > 106) {
        newErrors.temperature = 'Temperature must be between 95-106°F';
      }
    }

    if (formData.oxygenSaturation) {
      const o2 = parseInt(formData.oxygenSaturation);
      if (o2 < 70 || o2 > 100) {
        newErrors.oxygenSaturation = 'Oxygen saturation must be between 70-100%';
      }
    }

    if (formData.respiratoryRate) {
      const rr = parseInt(formData.respiratoryRate);
      if (rr < 8 || rr > 40) {
        newErrors.respiratoryRate = 'Respiratory rate must be between 8-40/min';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const vitalData = {
      heartRate: formData.heartRate ? parseInt(formData.heartRate) : undefined,
      bloodPressure: formData.bloodPressureSystolic && formData.bloodPressureDiastolic
        ? `${formData.bloodPressureSystolic}/${formData.bloodPressureDiastolic}`
        : undefined,
      temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
      oxygenSaturation: formData.oxygenSaturation ? parseInt(formData.oxygenSaturation) : undefined,
      respiratoryRate: formData.respiratoryRate ? parseInt(formData.respiratoryRate) : undefined,
      notes: formData.notes || undefined,
    };

    await mutate(vitalData);
  };

  const handleChange = (field: keyof VitalData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}
    >
      <h3 className="mb-6 text-lg font-semibold text-gray-900">
        Record Vitals
      </h3>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Heart Rate */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Heart className="h-4 w-4 text-red-500" />
            Heart Rate (bpm)
          </label>
          <input
            type="number"
            value={formData.heartRate}
            onChange={(e) => handleChange('heartRate', e.target.value)}
            placeholder="72"
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
              errors.heartRate ? 'border-red-500' : 'border-gray-300'
            )}
          />
          {errors.heartRate && (
            <p className="mt-1 text-xs text-red-500">{errors.heartRate}</p>
          )}
        </div>

        {/* Blood Pressure */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Activity className="h-4 w-4 text-blue-500" />
            Blood Pressure (mmHg)
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                value={formData.bloodPressureSystolic}
                onChange={(e) => handleChange('bloodPressureSystolic', e.target.value)}
                placeholder="120"
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.bloodPressureSystolic ? 'border-red-500' : 'border-gray-300'
                )}
              />
            </div>
            <span className="flex items-center text-gray-500">/</span>
            <div className="flex-1">
              <input
                type="number"
                value={formData.bloodPressureDiastolic}
                onChange={(e) => handleChange('bloodPressureDiastolic', e.target.value)}
                placeholder="80"
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.bloodPressureDiastolic ? 'border-red-500' : 'border-gray-300'
                )}
              />
            </div>
          </div>
          {(errors.bloodPressureSystolic || errors.bloodPressureDiastolic) && (
            <p className="mt-1 text-xs text-red-500">
              {errors.bloodPressureSystolic || errors.bloodPressureDiastolic}
            </p>
          )}
        </div>

        {/* Temperature */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Thermometer className="h-4 w-4 text-orange-500" />
            Temperature (°F)
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.temperature}
            onChange={(e) => handleChange('temperature', e.target.value)}
            placeholder="98.6"
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
              errors.temperature ? 'border-red-500' : 'border-gray-300'
            )}
          />
          {errors.temperature && (
            <p className="mt-1 text-xs text-red-500">{errors.temperature}</p>
          )}
        </div>

        {/* Oxygen Saturation */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Droplet className="h-4 w-4 text-cyan-500" />
            Oxygen Saturation (%)
          </label>
          <input
            type="number"
            value={formData.oxygenSaturation}
            onChange={(e) => handleChange('oxygenSaturation', e.target.value)}
            placeholder="98"
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
              errors.oxygenSaturation ? 'border-red-500' : 'border-gray-300'
            )}
          />
          {errors.oxygenSaturation && (
            <p className="mt-1 text-xs text-red-500">{errors.oxygenSaturation}</p>
          )}
        </div>

        {/* Respiratory Rate */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Activity className="h-4 w-4 text-green-500" />
            Respiratory Rate (/min)
          </label>
          <input
            type="number"
            value={formData.respiratoryRate}
            onChange={(e) => handleChange('respiratoryRate', e.target.value)}
            placeholder="16"
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
              errors.respiratoryRate ? 'border-red-500' : 'border-gray-300'
            )}
          />
          {errors.respiratoryRate && (
            <p className="mt-1 text-xs text-red-500">{errors.respiratoryRate}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Notes (Optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          placeholder="Any additional notes..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submit Button */}
      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading && <LoadingSpinner size="sm" variant="white" />}
          {loading ? 'Recording...' : 'Record Vitals'}
        </button>
      </div>
    </form>
  );
}

export default VitalsEntryForm;
