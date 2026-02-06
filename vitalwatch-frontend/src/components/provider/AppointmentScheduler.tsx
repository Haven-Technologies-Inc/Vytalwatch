/**
 * AppointmentScheduler Component - Calendar with availability
 * @module components/provider/AppointmentScheduler
 */

'use client';

import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppointmentSchedulerProps {
  providerId: string;
  onSchedule?: (data: any) => void;
  className?: string;
}

export function AppointmentScheduler({ providerId, onSchedule, className }: AppointmentSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

  return (
    <div className={cn('rounded-lg border bg-white p-6', className)}>
      <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        Schedule Appointment
      </h3>
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Time</label>
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm',
                  selectedTime === time ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'
                )}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => onSchedule?.({ date: selectedDate, time: selectedTime })}
          disabled={!selectedDate || !selectedTime}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Schedule
        </button>
      </div>
    </div>
  );
}

export default AppointmentScheduler;
