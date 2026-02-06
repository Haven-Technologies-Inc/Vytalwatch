/**
 * BillingRecordsTable Component - Billing and claims
 */

'use client';

import React from 'react';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/utils/formatters';

export interface BillingRecord {
  id: string;
  patientName: string;
  service: string;
  amount: number;
  status: string;
  date: string;
}

export interface BillingRecordsTableProps {
  records: BillingRecord[];
  className?: string;
}

export function BillingRecordsTable({ records, className }: BillingRecordsTableProps) {
  return (
    <div className={cn('rounded-lg border bg-white overflow-hidden', className)}>
      <div className="p-4 border-b">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <DollarSign className="h-5 w-5" />
          Billing Records
        </h3>
      </div>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Patient</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Service</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">{record.patientName}</td>
              <td className="px-4 py-3 text-sm">{record.service}</td>
              <td className="px-4 py-3 text-sm font-medium">{formatCurrency(record.amount)}</td>
              <td className="px-4 py-3 text-sm">
                <span className={cn('rounded-full px-2 py-1 text-xs', record.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                  {record.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">{formatDate(record.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BillingRecordsTable;
