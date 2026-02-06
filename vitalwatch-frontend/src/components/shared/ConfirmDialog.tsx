/**
 * ConfirmDialog Component
 *
 * Confirmation modal dialog.
 * @module components/shared/ConfirmDialog
 */

'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;

  /**
   * Callback when the dialog should close
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Dialog title
   */
  title: string;

  /**
   * Dialog description
   */
  description: string;

  /**
   * Confirm button text
   */
  confirmText?: string;

  /**
   * Cancel button text
   */
  cancelText?: string;

  /**
   * Callback when confirmed
   */
  onConfirm: () => void;

  /**
   * Callback when cancelled
   */
  onCancel?: () => void;

  /**
   * Variant for the confirm button
   */
  variant?: 'default' | 'danger';

  /**
   * Whether the action is loading
   */
  loading?: boolean;
}

/**
 * ConfirmDialog - Display confirmation modal
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Delete patient"
 *   description="Are you sure you want to delete this patient?"
 *   confirmText="Delete"
 *   variant="danger"
 *   onConfirm={handleDelete}
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-start justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {title}
            </Dialog.Title>
            <Dialog.Close className="rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <Dialog.Description className="mt-2 text-sm text-gray-500">
            {description}
          </Dialog.Description>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50',
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              )}
            >
              {loading ? 'Processing...' : confirmText}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ConfirmDialog;
