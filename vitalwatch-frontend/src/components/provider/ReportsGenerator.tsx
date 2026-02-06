/**
 * ReportsGenerator Component - Generate patient reports
 */

'use client';

import React, { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReportsGeneratorProps {
  patientId: string;
  onGenerate?: (type: string) => void;
  className?: string;
}

export function ReportsGenerator({ patientId, onGenerate, className }: ReportsGeneratorProps) {
  const [reportType, setReportType] = useState('summary');

  const reportTypes = [
    { value: 'summary', label: 'Patient Summary' },
    { value: 'vitals', label: 'Vitals Report' },
    { value: 'medications', label: 'Medication List' },
    { value: 'progress', label: 'Progress Notes' },
  ];

  return (
    <div className={cn('rounded-lg border bg-white p-6', className)}>
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <FileText className="h-5 w-5" />
        Generate Report
      </h3>
      <div className="space-y-4">
        <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full rounded-lg border px-3 py-2">
          {reportTypes.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        <button
          onClick={() => onGenerate?.(reportType)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Generate & Download
        </button>
      </div>
    </div>
  );
}

export default ReportsGenerator;
