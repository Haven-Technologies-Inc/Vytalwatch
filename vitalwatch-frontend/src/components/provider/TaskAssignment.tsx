/**
 * TaskAssignment Component - Assign tasks to patients
 */

'use client';

import React, { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TaskAssignmentProps {
  patientId: string;
  onAssign?: (task: any) => void;
  className?: string;
}

export function TaskAssignment({ patientId, onAssign, className }: TaskAssignmentProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  return (
    <div className={cn('rounded-lg border bg-white p-6', className)}>
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <CheckSquare className="h-5 w-5" />
        Assign Task
      </h3>
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border px-3 py-2"
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border px-3 py-2">
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
        <button
          onClick={() => onAssign?.({ title, description, priority, patientId })}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Assign Task
        </button>
      </div>
    </div>
  );
}

export default TaskAssignment;
