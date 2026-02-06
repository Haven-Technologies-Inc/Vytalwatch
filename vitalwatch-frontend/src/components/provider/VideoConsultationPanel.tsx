/**
 * VideoConsultationPanel Component - Video call interface
 */

'use client';

import React from 'react';
import { Video, Mic, MicOff, VideoOff, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoConsultationPanelProps {
  appointmentId: string;
  onEndCall?: () => void;
  className?: string;
}

export function VideoConsultationPanel({ appointmentId, onEndCall, className }: VideoConsultationPanelProps) {
  const [muted, setMuted] = React.useState(false);
  const [videoOff, setVideoOff] = React.useState(false);

  return (
    <div className={cn('rounded-lg border bg-black p-4', className)}>
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-4">
        <Video className="h-16 w-16 text-gray-600" />
      </div>
      <div className="flex justify-center gap-4">
        <button onClick={() => setMuted(!muted)} className="rounded-full bg-gray-700 p-4 text-white hover:bg-gray-600">
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <button onClick={() => setVideoOff(!videoOff)} className="rounded-full bg-gray-700 p-4 text-white hover:bg-gray-600">
          {videoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </button>
        <button onClick={onEndCall} className="rounded-full bg-red-600 p-4 text-white hover:bg-red-700">
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default VideoConsultationPanel;
