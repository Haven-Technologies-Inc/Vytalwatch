/**
 * PatientCard Component
 *
 * Patient summary card for quick view.
 * @module components/provider/PatientCard
 */

'use client';

import React from 'react';
import { Calendar, Phone, Mail, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatPhoneNumber } from '@/utils/formatters';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { RiskScoreCircle } from '@/components/shared/RiskScoreCircle';
import { StatusBadge } from '@/components/shared/StatusBadge';

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  status: string;
  riskScore?: number;
  address?: { city: string; state: string };
}

export interface PatientCardProps {
  patient: Patient;
  onViewDetails?: () => void;
  onMessage?: () => void;
  className?: string;
}

/**
 * PatientCard - Patient summary card
 */
export function PatientCard({ patient, onViewDetails, onMessage, className }: PatientCardProps) {
  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
      <div className="flex items-start gap-4">
        <UserAvatar
          name={`${patient.firstName} ${patient.lastName}`}
          size="lg"
        />

        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h3>
              <p className="text-sm text-gray-600">MRN: {patient.mrn}</p>
            </div>
            {patient.riskScore !== undefined && (
              <RiskScoreCircle score={patient.riskScore} size="sm" />
            )}
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{age} years old • {patient.gender}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <a href={`tel:${patient.phone}`} className="hover:text-blue-600">
                {formatPhoneNumber(patient.phone)}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${patient.email}`} className="hover:text-blue-600">
                {patient.email}
              </a>
            </div>
            {patient.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{patient.address.city}, {patient.address.state}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                View Details
              </button>
            )}
            {onMessage && (
              <button
                onClick={onMessage}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Message
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientCard;
