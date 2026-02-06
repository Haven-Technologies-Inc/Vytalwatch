/**
 * EmergencyContactCard Component
 *
 * Quick access to emergency contacts.
 * @module components/patient/EmergencyContactCard
 */

'use client';

import React from 'react';
import { Phone, Mail, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPhoneNumber } from '@/utils/formatters';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary?: boolean;
}

export interface EmergencyContactCardProps {
  contacts: EmergencyContact[];
  onCall?: (phone: string) => void;
  className?: string;
}

/**
 * EmergencyContactCard - Quick access to emergency contacts
 */
export function EmergencyContactCard({
  contacts,
  onCall,
  className,
}: EmergencyContactCardProps) {
  return (
    <div className={cn('rounded-lg border border-red-200 bg-red-50 p-6', className)}>
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <h3 className="text-lg font-semibold text-red-900">Emergency Contacts</h3>
      </div>

      <div className="space-y-3">
        {contacts.map((contact, index) => (
          <div
            key={index}
            className="rounded-lg border border-red-200 bg-white p-4"
          >
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{contact.name}</h4>
                <p className="text-sm text-gray-600">{contact.relationship}</p>
              </div>
              {contact.isPrimary && (
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                  Primary
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="h-4 w-4" />
                  <span>{formatPhoneNumber(contact.phone)}</span>
                </div>
                <a
                  href={`tel:${contact.phone}`}
                  onClick={(e) => {
                    if (onCall) {
                      e.preventDefault();
                      onCall(contact.phone);
                    }
                  }}
                  className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  Call
                </a>
              </div>

              {contact.email && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail className="h-4 w-4" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}

        {contacts.length === 0 && (
          <p className="py-4 text-center text-sm text-red-700">
            No emergency contacts configured
          </p>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-white p-3 text-center">
        <p className="text-sm font-medium text-red-900">Emergency: 911</p>
      </div>
    </div>
  );
}

export default EmergencyContactCard;
