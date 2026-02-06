/**
 * ScheduleCalendar Component - Provider schedule view
 */

'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/utils/formatters';

export interface ScheduleEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: string;
}

export interface ScheduleCalendarProps {
  events: ScheduleEvent[];
  date?: Date;
  className?: string;
}

export function ScheduleCalendar({ events, date = new Date(), className }: ScheduleCalendarProps) {
  return (
    <div className={cn('rounded-lg border bg-white p-6', className)}>
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Calendar className="h-5 w-5" />
        Schedule - {date.toLocaleDateString()}
      </h3>
      <div className="space-y-2">
        {events.map((event) => (
          <div key={event.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-gray-50">
            <div className="rounded bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700">
              {formatTime(event.startTime)}
            </div>
            <div className="flex-1">
              <h4 className="font-medium">{event.title}</h4>
              <p className="text-sm text-gray-600">{event.type}</p>
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="py-8 text-center text-gray-500">No events scheduled</p>}
      </div>
    </div>
  );
}

export default ScheduleCalendar;
