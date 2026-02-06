/**
 * ClinicalNoteEditor Component - SOAP note editor
 * @module components/provider/ClinicalNoteEditor
 */

'use client';

import React, { useState } from 'react';
import { FileText, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation } from '@/hooks/useApi';
import { api } from '@/utils/api';
import { useNotificationStore } from '@/stores/notificationStore';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export interface ClinicalNoteEditorProps {
  patientId: string;
  onSave?: (note: any) => void;
  className?: string;
}

export function ClinicalNoteEditor({ patientId, onSave, className }: ClinicalNoteEditorProps) {
  const [note, setNote] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const showSuccess = useNotificationStore((state) => state.showSuccess);
  const showError = useNotificationStore((state) => state.showError);

  const { mutate, loading } = useMutation(
    (data: any) => api.notes.create(patientId, data),
    {
      onSuccess: (data) => {
        showSuccess('Note saved successfully');
        setNote({ subjective: '', objective: '', assessment: '', plan: '' });
        onSave?.(data);
      },
      onError: () => showError('Failed to save note'),
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutate({ ...note, type: 'soap' });
  };

  return (
    <form onSubmit={handleSubmit} className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Clinical Note (SOAP)</h3>
      </div>

      <div className="space-y-4">
        {['subjective', 'objective', 'assessment', 'plan'].map((field) => (
          <div key={field}>
            <label className="mb-2 block text-sm font-medium capitalize text-gray-700">{field}</label>
            <textarea
              value={note[field as keyof typeof note]}
              onChange={(e) => setNote({ ...note, [field]: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={`Enter ${field}...`}
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? <LoadingSpinner size="sm" variant="white" /> : <Save className="h-4 w-4" />}
        {loading ? 'Saving...' : 'Save Note'}
      </button>
    </form>
  );
}

export default ClinicalNoteEditor;
