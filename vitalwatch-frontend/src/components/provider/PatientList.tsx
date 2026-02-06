/**
 * PatientList Component
 *
 * Searchable, filterable patient list for providers.
 * @module components/provider/PatientList
 */

'use client';

import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/formatters';
import { SearchInput } from '@/components/shared/SearchInput';
import { RiskScoreCircle } from '@/components/shared/RiskScoreCircle';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  status: 'active' | 'inactive';
  riskScore?: number;
  lastVisit?: string;
  nextAppointment?: string;
}

export interface PatientListProps {
  patients: Patient[];
  loading?: boolean;
  onSelectPatient: (patient: Patient) => void;
  className?: string;
}

/**
 * PatientList - Searchable patient list
 */
export function PatientList({
  patients,
  loading = false,
  onSelectPatient,
  className,
}: PatientListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.mrn.includes(searchQuery) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
        <LoadingSpinner center text="Loading patients..." />
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white', className)}>
      <div className="border-b border-gray-200 p-4">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Patients</h2>

        <div className="flex gap-3">
          <SearchInput
            placeholder="Search patients..."
            onSearch={setSearchQuery}
            className="flex-1"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {filteredPatients.length === 0 ? (
          <EmptyState
            icon={<Search className="h-12 w-12" />}
            title="No patients found"
            description={searchQuery ? 'Try adjusting your search' : 'No patients available'}
          />
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className="w-full p-4 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <UserAvatar
                    name={`${patient.firstName} ${patient.lastName}`}
                    size="md"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <StatusBadge
                        variant={patient.status === 'active' ? 'success' : 'default'}
                        size="sm"
                      >
                        {patient.status}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-gray-600">MRN: {patient.mrn}</p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                      {patient.lastVisit && (
                        <span>Last visit: {formatDate(patient.lastVisit)}</span>
                      )}
                      {patient.nextAppointment && (
                        <span>Next: {formatDate(patient.nextAppointment)}</span>
                      )}
                    </div>
                  </div>

                  {patient.riskScore !== undefined && (
                    <RiskScoreCircle score={patient.riskScore} size="sm" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientList;
