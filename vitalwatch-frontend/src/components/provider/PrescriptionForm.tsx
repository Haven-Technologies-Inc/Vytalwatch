/**
 * PrescriptionForm Component - Medication prescription form
 * @module components/provider/PrescriptionForm
 */

'use client';

import React, { useState } from 'react';
import { Pill } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation } from '@/hooks/useApi';
import { api } from '@/utils/api';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export interface PrescriptionFormProps {
  patientId: string;
  onSuccess?: () => void;
  className?: string;
}

export function PrescriptionForm({ patientId, onSuccess, className }: PrescriptionFormProps) {
  const [form, setForm] = useState({ medication: '', dosage: '', frequency: '', duration: '', quantity: '', refills: '' });
  const { mutate, loading } = useMutation((data: any) => api.medications.create(data));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutate({ patientId, ...form });
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className={cn('rounded-lg border bg-white p-6', className)}>
      <div className="mb-4 flex items-center gap-2">
        <Pill className="h-5 w-5" />
        <h3 className="text-lg font-semibold">New Prescription</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <input
          type="text"
          placeholder="Medication name"
          value={form.medication}
          onChange={(e) => setForm({ ...form, medication: e.target.value })}
          className="rounded-lg border px-3 py-2"
          required
        />
        <input
          type="text"
          placeholder="Dosage"
          value={form.dosage}
          onChange={(e) => setForm({ ...form, dosage: e.target.value })}
          className="rounded-lg border px-3 py-2"
          required
        />
        <input
          type="text"
          placeholder="Frequency"
          value={form.frequency}
          onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          className="rounded-lg border px-3 py-2"
          required
        />
        <input
          type="text"
          placeholder="Duration"
          value={form.duration}
          onChange={(e) => setForm({ ...form, duration: e.target.value })}
          className="rounded-lg border px-3 py-2"
        />
        <input
          type="number"
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          className="rounded-lg border px-3 py-2"
        />
        <input
          type="number"
          placeholder="Refills"
          value={form.refills}
          onChange={(e) => setForm({ ...form, refills: e.target.value })}
          className="rounded-lg border px-3 py-2"
        />
      </div>
      <button type="submit" disabled={loading} className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
        {loading ? <LoadingSpinner size="sm" variant="white" /> : 'Submit Prescription'}
      </button>
    </form>
  );
}

export default PrescriptionForm;
