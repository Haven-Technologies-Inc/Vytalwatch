/**
 * VideoCallButton Component
 *
 * Initiate video call button.
 * @module components/patient/VideoCallButton
 */

'use client';

import React, { useState } from 'react';
import { Video, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoCallButtonProps {
  appointmentId?: string;
  providerId?: string;
  onInitiateCall: (params: { appointmentId?: string; providerId?: string }) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  className?: string;
}

/**
 * VideoCallButton - Initiate video call
 */
export function VideoCallButton({
  appointmentId,
  providerId,
  onInitiateCall,
  disabled = false,
  variant = 'primary',
  className,
}: VideoCallButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onInitiateCall({ appointmentId, providerId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium transition-all',
        variant === 'primary' &&
          'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
        variant === 'secondary' &&
          'border-2 border-green-600 bg-white text-green-600 hover:bg-green-50',
        (disabled || loading) && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <Video className="h-5 w-5" />
      {loading ? 'Connecting...' : 'Start Video Call'}
    </button>
  );
}

export default VideoCallButton;
