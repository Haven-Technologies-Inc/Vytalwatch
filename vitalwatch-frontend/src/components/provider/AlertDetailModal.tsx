/**
 * AlertDetailModal Component - Alert details and actions
 */

'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertTriangle } from 'lucide-react';
import { formatRelativeTime } from '@/utils/formatters';

export interface AlertDetailModalProps {
  alert: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge?: () => void;
  onResolve?: () => void;
}

export function AlertDetailModal({ alert, open, onOpenChange, onAcknowledge, onResolve }: AlertDetailModalProps) {
  if (!alert) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90vw] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <Dialog.Title className="text-xl font-bold">Alert Details</Dialog.Title>
            </div>
            <Dialog.Close><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Patient</p>
              <p className="text-gray-900">{alert.patientName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Message</p>
              <p className="text-gray-900">{alert.message}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Time</p>
              <p className="text-gray-900">{formatRelativeTime(alert.createdAt)}</p>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            {alert.status === 'active' && (
              <button onClick={onAcknowledge} className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700">
                Acknowledge
              </button>
            )}
            <button onClick={onResolve} className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">
              Resolve
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default AlertDetailModal;
