/**
 * MessageThread Component
 *
 * Chat conversation view.
 * @module components/patient/MessageThread
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/formatters';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
}

export interface MessageThreadProps {
  messages: Message[];
  onSendMessage: (content: string) => Promise<void>;
  loading?: boolean;
  className?: string;
}

/**
 * MessageThread - Chat conversation view
 */
export function MessageThread({
  messages,
  onSendMessage,
  loading = false,
  className,
}: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn('flex flex-col rounded-lg border border-gray-200 bg-white', className)}>
      <div className="border-b border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900">Messages</h3>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4" style={{ maxHeight: '500px' }}>
        {loading ? (
          <LoadingSpinner center text="Loading messages..." />
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No messages yet. Start a conversation!
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.isCurrentUser && 'flex-row-reverse'
              )}
            >
              <UserAvatar
                name={message.senderName}
                src={message.senderAvatar}
                size="sm"
              />
              <div className={cn(
                'flex-1 max-w-[70%]',
                message.isCurrentUser && 'flex flex-col items-end'
              )}>
                <div className={cn(
                  'rounded-lg px-4 py-2',
                  message.isCurrentUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                )}>
                  <p className="text-sm">{message.content}</p>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {formatRelativeTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? <LoadingSpinner size="sm" variant="white" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MessageThread;
