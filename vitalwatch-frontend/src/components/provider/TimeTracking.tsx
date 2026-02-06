/**
 * TimeTracking Component - CPT time tracking widget
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimeTrackingProps {
  appointmentId: string;
  onSave?: (duration: number) => void;
  className?: string;
}

export function TimeTracking({ appointmentId, onSave, className }: TimeTrackingProps) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('rounded-lg border bg-white p-6', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Time Tracking</h3>
      </div>
      <div className="text-center">
        <div className="text-4xl font-bold mb-4">{formatTime(seconds)}</div>
        <div className="flex justify-center gap-2">
          <button onClick={() => setIsRunning(!isRunning)} className="rounded-lg bg-blue-600 p-3 text-white hover:bg-blue-700">
            {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button onClick={() => { setIsRunning(false); setSeconds(0); }} className="rounded-lg bg-gray-600 p-3 text-white hover:bg-gray-700">
            <Square className="h-5 w-5" />
          </button>
        </div>
        <button onClick={() => onSave?.(seconds)} className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">
          Save Time
        </button>
      </div>
    </div>
  );
}

export default TimeTracking;
