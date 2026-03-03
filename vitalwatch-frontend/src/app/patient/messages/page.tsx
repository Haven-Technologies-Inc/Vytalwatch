'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Send, Search, Paperclip, MoreVertical, Phone, Video, User, X, File as FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { VideoCall, IncomingCallModal } from '@/components/video';
import { webrtcClient, IncomingCallData, CallType } from '@/lib/webrtc';
import { socketClient } from '@/lib/socket';
import { useApiQuery } from '@/hooks/useApiQuery';
import { messagingApi } from '@/services/api';
import type { ApiResponse, PaginatedResponse, MessageThread, Message as ApiMessage } from '@/types';

interface LocalMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: LocalMessage[];
}

function mapThreadToConversation(thread: MessageThread, currentUserId: string): Conversation {
  const otherParticipant = thread.participants?.find((p) => p.id !== currentUserId) || thread.participants?.[0];
  const lastMsg = thread.lastMessage;
  return {
    id: thread.id,
    participant: {
      id: otherParticipant?.id || '',
      name: otherParticipant?.name || otherParticipant?.firstName
        ? `${otherParticipant.firstName} ${otherParticipant.lastName || ''}`.trim()
        : 'Unknown',
      role: otherParticipant?.role || '',
    },
    lastMessage: lastMsg?.content || thread.subject || '',
    lastMessageTime: new Date(thread.lastMessageAt || thread.updatedAt || thread.createdAt),
    unreadCount: thread.unreadCount || 0,
    messages: [],
  };
}

function mapApiMessage(msg: ApiMessage): LocalMessage {
  return {
    id: msg.id,
    senderId: msg.senderId,
    senderName: msg.senderName || msg.sender?.name || msg.sender?.firstName || 'Unknown',
    content: msg.content,
    timestamp: new Date(msg.createdAt),
    read: msg.read ?? (msg.readBy && msg.readBy.length > 0) ?? false,
  };
}

export default function PatientMessagesPage() {
  const { toast } = useToast();
  const currentUserId = (() => {
    try {
      const authData = localStorage.getItem('vytalwatch-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed?.state?.user?.id || 'patient';
      }
    } catch { /* ignore */ }
    return 'patient';
  })();

  // Fetch threads from API
  const {
    data: threadsResponse,
    isLoading: threadsLoading,
    error: threadsError,
    refetch: refetchThreads,
  } = useApiQuery<ApiResponse<PaginatedResponse<MessageThread>>>(
    () => messagingApi.getThreads(),
    { enabled: true }
  );

  const apiConversations = useMemo(() => {
    const paginated = threadsResponse?.data;
    if (!paginated) return [];
    const threads = paginated.data || paginated.items || paginated.results || [];
    return threads.map((t) => mapThreadToConversation(t, currentUserId));
  }, [threadsResponse, currentUserId]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [threadMessages, setThreadMessages] = useState<Record<string, LocalMessage[]>>({});
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync API conversations into state
  useEffect(() => {
    if (apiConversations.length > 0) {
      setConversations(apiConversations);
      if (!selectedConversation && apiConversations.length > 0) {
        setSelectedConversation(apiConversations[0]);
      }
    }
  }, [apiConversations, selectedConversation]);

  // Fetch messages when selecting a conversation
  useEffect(() => {
    if (!selectedConversation) return;
    const threadId = selectedConversation.id;
    if (threadMessages[threadId]) return; // Already loaded

    const loadMessages = async () => {
      try {
        const response = await messagingApi.getMessages(threadId);
        const paginated = response?.data;
        if (paginated) {
          const msgs = (paginated.data || paginated.items || paginated.results || []).map(mapApiMessage);
          setThreadMessages((prev) => ({ ...prev, [threadId]: msgs }));
        }
      } catch {
        // Messages will remain empty
      }
    };
    loadMessages();
  }, [selectedConversation, threadMessages]);

  // Get messages for current conversation
  const currentMessages = useMemo(() => {
    if (!selectedConversation) return [];
    return threadMessages[selectedConversation.id] || [];
  }, [selectedConversation, threadMessages]);

  // Initialize socket connection for video calls
  useEffect(() => {
    const initSocket = async () => {
      try {
        const authData = localStorage.getItem('vytalwatch-auth');
        let token = 'dev_token';
        let userId = 'patient_1';
        let role = 'Patient';
        let organizationId = 'org_1';

        if (authData) {
          const parsed = JSON.parse(authData);
          token = parsed?.state?.accessToken || token;
          userId = parsed?.state?.user?.id || userId;
          role = parsed?.state?.user?.role || role;
          organizationId = parsed?.state?.user?.organizationId || organizationId;
        }

        await socketClient.connect({ token, userId, role, organizationId });
      } catch (err) {
        console.error('Socket connection failed:', err);
      }
    };

    initSocket();
    return () => { socketClient.disconnect(); };
  }, []);

  const filteredConversations = conversations.filter((c) =>
    c.participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / 3600000;

    if (diffHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const newMsg: LocalMessage = {
      id: `m-${Date.now()}`,
      senderId: currentUserId,
      senderName: 'You',
      content: newMessage.trim(),
      timestamp: new Date(),
      read: true,
    };

    // Optimistic update
    setThreadMessages((prev) => ({
      ...prev,
      [selectedConversation.id]: [...(prev[selectedConversation.id] || []), newMsg],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversation.id
          ? { ...c, lastMessage: newMsg.content, lastMessageTime: new Date() }
          : c
      )
    );
    setNewMessage('');
    toast({ title: 'Message sent', description: `Sent to ${selectedConversation.participant.name}`, type: 'success' });

    // Send via API
    try {
      await messagingApi.sendMessage(selectedConversation.id, newMsg.content);
    } catch {
      // Optimistic update already applied
    }
  }, [newMessage, selectedConversation, currentUserId, toast]);

  // Video call state
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [callType, setCallType] = useState<CallType>('video');
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  useEffect(() => {
    webrtcClient.initialize({
      onIncomingCall: (data) => setIncomingCall(data),
      onCallAccepted: () => setShowVideoCall(true),
      onCallRejected: () => { setShowVideoCall(false); toast({ title: 'Call declined', type: 'info' }); },
      onCallEnded: () => { setShowVideoCall(false); setIncomingCall(null); toast({ title: 'Call ended', type: 'info' }); },
      onError: (err) => toast({ title: 'Call error', description: err.message, type: 'error' }),
    });
    return () => webrtcClient.destroy();
  }, [toast]);

  const handlePhoneCall = useCallback(async () => {
    if (selectedConversation) {
      try {
        setCallType('audio');
        setShowVideoCall(true);
        toast({ title: 'Initiating call', description: `Calling ${selectedConversation.participant.name}...`, type: 'info' });
        await webrtcClient.call(selectedConversation.participant.id, 'Patient', 'audio');
      } catch (err) {
        setShowVideoCall(false);
        toast({
          title: 'Call Failed',
          description: err instanceof Error ? err.message : 'Unable to initiate call. Please check your connection.',
          type: 'error'
        });
      }
    }
  }, [selectedConversation, toast]);

  const handleVideoCall = useCallback(async () => {
    if (selectedConversation) {
      try {
        setCallType('video');
        setShowVideoCall(true);
        toast({ title: 'Starting video call', description: `Connecting to ${selectedConversation.participant.name}...`, type: 'info' });
        await webrtcClient.call(selectedConversation.participant.id, 'Patient', 'video');
      } catch (err) {
        setShowVideoCall(false);
        toast({
          title: 'Call Failed',
          description: err instanceof Error ? err.message : 'Unable to start video call. Please check your connection.',
          type: 'error'
        });
      }
    }
  }, [selectedConversation, toast]);

  const handleAcceptCall = useCallback(async () => {
    if (incomingCall) {
      setCallType(incomingCall.callType);
      await webrtcClient.accept(incomingCall.callId, incomingCall.callerId, incomingCall.callType);
      setShowVideoCall(true);
      setIncomingCall(null);
    }
  }, [incomingCall]);

  const handleRejectCall = useCallback(() => {
    if (incomingCall) {
      webrtcClient.reject(incomingCall.callId, incomingCall.callerId);
      setIncomingCall(null);
    }
  }, [incomingCall]);

  const handleAttachFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({ title: 'File too large', description: `${file.name} exceeds 10MB limit`, type: 'error' });
        return false;
      }
      return true;
    });
    setAttachedFiles(prev => [...prev, ...validFiles].slice(0, 5));
    if (e.target) e.target.value = '';
  }, [toast]);

  const removeAttachedFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  if (threadsLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading messages..." />
      </DashboardLayout>
    );
  }

  if (threadsError) {
    return (
      <DashboardLayout>
        <ErrorState message={threadsError} onRetry={refetchThreads} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800">
          <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No conversations found</div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 border-b border-gray-100 p-4 transition-colors dark:border-gray-800',
                    selectedConversation?.id === conversation.id
                      ? 'bg-primary/5'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  )}
                >
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-6 w-6" />
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {conversation.participant.name}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatTime(conversation.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{conversation.participant.role}</p>
                    <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">
                      {conversation.lastMessage}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedConversation ? (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedConversation.participant.name}
                  </p>
                  <p className="text-sm text-gray-500">{selectedConversation.participant.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handlePhoneCall} title="Start phone call">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleVideoCall} title="Start video call">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" title="More options">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {currentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.senderId === currentUserId ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] rounded-2xl px-4 py-2',
                        message.senderId === currentUserId
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                      )}
                    >
                      <p>{message.content}</p>
                      <p
                        className={cn(
                          'mt-1 text-xs',
                          message.senderId === currentUserId ? 'text-white/70' : 'text-gray-500'
                        )}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 p-4 dark:border-gray-800">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Attach files"
              />
              {attachedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
                      <FileIcon className="h-4 w-4 text-gray-500" />
                      <span className="max-w-[120px] truncate text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                      <button onClick={() => removeAttachedFile(index)} className="text-gray-400 hover:text-red-500" title="Remove file">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleAttachFile} title="Attach file">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>

      {showVideoCall && selectedConversation && (
        <VideoCall
          userId={selectedConversation.participant.id}
          userName={selectedConversation.participant.name}
          onClose={() => { webrtcClient.end(); setShowVideoCall(false); }}
        />
      )}

      {incomingCall && (
        <IncomingCallModal call={incomingCall} onAccept={handleAcceptCall} onReject={handleRejectCall} />
      )}
    </DashboardLayout>
  );
}
