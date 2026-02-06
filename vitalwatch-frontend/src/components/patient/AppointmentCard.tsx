/**
 * AppointmentCard Component
 *
 * Upcoming appointment display card.
 * @module components/patient/AppointmentCard
 */

'use client';

import React from 'react';
import { Calendar, Clock, MapPin, User, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatTime, formatAppointmentStatus } from '@/utils/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';

export interface Appointment {
  id: string;
  type: string;
  status: string;
  scheduledAt: string;
  duration: number;
  providerName: string;
  providerAvatar?: string;
  location?: string;
  isVirtual?: boolean;
  notes?: string;
}

export interface AppointmentCardProps {
  appointment: Appointment;
  onJoinVideo?: (id: string) => void;
  onReschedule?: (id: string) => void;
  onCancel?: (id: string) => void;
  className?: string;
}

/**
 * AppointmentCard - Display upcoming appointment
 *
 * @example
 * ```tsx
 * <AppointmentCard appointment={appt} onJoinVideo={handleJoin} />
 * ```
 */
export function AppointmentCard({
  appointment,
  onJoinVideo,
  onReschedule,
  onCancel,
  className,
}: AppointmentCardProps) {
  const statusInfo = formatAppointmentStatus(appointment.status);
  const appointmentDate = new Date(appointment.scheduledAt);
  const now = new Date();
  const canJoinVideo = appointment.isVirtual &&
    appointment.status === 'confirmed' &&
    appointmentDate <= now;

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6 shadow-sm', className)}>
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar name={appointment.providerName} src={appointment.providerAvatar} size="lg" />
          <div>
            <h3 className="font-semibold text-gray-900">{appointment.type}</h3>
            <p className="text-sm text-gray-600">with {appointment.providerName}</p>
          </div>
        </div>
        <StatusBadge variant={statusInfo.color.includes('green') ? 'success' : 'default'}>
          {statusInfo.label}
        </StatusBadge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(appointment.scheduledAt, 'EEEE, MMMM dd, yyyy')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>{formatTime(appointmentDate.toTimeString().slice(0, 5))} ({appointment.duration} min)</span>
        </div>
        {appointment.isVirtual ? (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Video className="h-4 w-4" />
            <span>Virtual Appointment</span>
          </div>
        ) : appointment.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{appointment.location}</span>
          </div>
        )}
      </div>

      {appointment.notes && (
        <div className="mt-4 rounded-md bg-blue-50 p-3">
          <p className="text-sm text-gray-700">{appointment.notes}</p>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        {canJoinVideo && onJoinVideo && (
          <button
            onClick={() => onJoinVideo(appointment.id)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <Video className="h-4 w-4" />
            Join Video Call
          </button>
        )}
        {onReschedule && appointment.status !== 'cancelled' && (
          <button
            onClick={() => onReschedule(appointment.id)}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Reschedule
          </button>
        )}
        {onCancel && appointment.status !== 'cancelled' && (
          <button
            onClick={() => onCancel(appointment.id)}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default AppointmentCard;
