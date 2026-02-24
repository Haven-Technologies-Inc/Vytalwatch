'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { messagingApi } from '@/services/api';
import type { MessageThread, Message as MessageType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Send, Search, Paperclip, MoreVertical, Phone, Video, Plus, X, File as FileIcon } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { VideoCall } from '@/components/video';
import { webrtcClient, IncomingCallData, CallType } from '@/lib/webrtc';
import { IncomingCallModal } from '@/components/video';
import { socketClient } from '@/lib/socket';

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
    riskLevel?: 'low' | 'moderate' | 'high';
  };
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: LocalMessage[];
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    participant: { id: 'p1', name: 'Maria Garcia', role: 'Patient', riskLevel: 'high' },
    lastMessage: 'Thank you, Dr. Smith. I will monitor my weight as you suggested.',
    lastMessageTime: new Date(Date.now() - 1800000),
    unreadCount: 0,
    messages: [
      { id: 'm1', senderId: 'provider', senderName: 'You', content: 'Maria, I noticed your weight increased by 3 lbs. Please weigh yourself daily and report any sudden changes.', timestamp: new Date(Date.now() - 3600000), read: true },
      { id: 'm2', senderId: 'p1', senderName: 'Maria Garcia', content: 'Thank you, Dr. Smith. I will monitor my weight as you suggested.', timestamp: new Date(Date.now() - 1800000), read: true },
    ],
  },
  {
    id: '2',
    participant: { id: 'p2', name: 'James Wilson', role: 'Patient', riskLevel: 'moderate' },
    lastMessage: 'My glucose was 185 this morning. Should I adjust my medication?',
    lastMessageTime: new Date(Date.now() - 7200000),
    unreadCount: 1,
    messages: [
      { id: 'm3', senderId: 'p2', senderName: 'James Wilson', content: 'My glucose was 185 this morning. Should I adjust my medication?', timestamp: new Date(Date.now() - 7200000), read: false },
    ],
  },
  {
    id: '3',
    participant: { id: 'p3', name: 'Susan Chen', role: 'Patient', riskLevel: 'high' },
    lastMessage: 'I have been feeling short of breath lately.',
    lastMessageTime: new Date(Date.now() - 86400000),
    unreadCount: 2,
    messages: [],
  },
  {
    id: '4',
    participant: { id: 'n1', name: 'Nurse Lisa', role: 'Care Coordinator' },
    lastMessage: 'I have updated the care plan for Mrs. Garcia.',
    lastMessageTime: new Date(Date.now() - 172800000),
    unreadCount: 0,
    messages: [],
  },
];

export default function ProviderMessagesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'patients' | 'staff'>('all');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, { userName: string; timestamp: number }>>(new Map());
  const [userName, setUserName] = useState('Provider');
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize socket connection for video calls
  useEffect(() => {
    const initSocket = async () => {
      try {
        const authData = localStorage.getItem('vytalwatch-auth');
        let token = 'dev_token';
        let userId = 'provider_1';
        let role = 'Provider';
        let organizationId = 'org_1';

        if (authData) {
          const parsed = JSON.parse(authData);
          token = parsed?.state?.accessToken || token;
          userId = parsed?.state?.user?.id || userId;
          role = parsed?.state?.user?.role || role;
          organizationId = parsed?.state?.user?.organizationId || organizationId;
        }

        console.log('Connecting socket with:', { userId, role });
        await socketClient.connect({
          token,
          userId,
          role,
          organizationId,
        });
        setSocketConnected(true);
        console.log('Socket connected successfully');
      } catch (err) {
        console.error('Socket connection failed:', err);
      }
    };

    initSocket();

    return () => {
      socketClient.disconnect();
    };
  }, []);

  // Real-time message and typing listeners
  useEffect(() => {
    if (!socketConnected || !selectedConversation) return;

    // Join the thread room
    socketClient.emit('message:join-thread', { threadId: selectedConversation.id });

    // Listen for new messages
    const cleanupMessages = socketClient.on<{
      id: string;
      threadId: string;
      senderId: string;
      content: string;
      timestamp: string;
    }>('message:new', (msg) => {
      if (msg.threadId === selectedConversation.id) {
        const newMsg: LocalMessage = {
          id: msg.id,
          senderId: msg.senderId,
          senderName: selectedConversation.participant.name,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          read: false,
        };
        setSelectedConversation((prev) =>
          prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev
        );
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === msg.threadId
              ? { ...conv, messages: [...conv.messages, newMsg], lastMessage: msg.content, lastMessageTime: new Date(msg.timestamp) }
              : conv
          )
        );
        toast({ title: 'New message', description: `${selectedConversation.participant.name}: ${msg.content.slice(0, 50)}...`, type: 'info' });
      }
    });

    // Listen for typing updates
    const cleanupTyping = socketClient.on<{
      threadId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }>('typing:update', (data) => {
      if (data.threadId === selectedConversation.id) {
        setTypingUsers((prev) => {
          const newMap = new Map(prev);
          if (data.isTyping) {
            newMap.set(data.userId, { userName: data.userName, timestamp: Date.now() });
          } else {
            newMap.delete(data.userId);
          }
          return newMap;
        });
      }
    });

    // Listen for read receipts
    const cleanupRead = socketClient.on<{
      threadId: string;
      messageId: string;
      readBy: string;
    }>('message:read-receipt', (data) => {
      if (data.threadId === selectedConversation.id) {
        setSelectedConversation((prev) =>
          prev ? {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === data.messageId ? { ...m, read: true } : m
            ),
          } : prev
        );
      }
    });

    return () => {
      socketClient.emit('message:leave-thread', { threadId: selectedConversation.id });
      cleanupMessages();
      cleanupTyping();
      cleanupRead();
    };
  }, [socketConnected, selectedConversation?.id, toast]);

  // Clear stale typing indicators after 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.forEach((value, key) => {
          if (now - value.timestamp > 3000) {
            newMap.delete(key);
          }
        });
        return newMap;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle typing indicator emission
  const handleTyping = useCallback(() => {
    if (!selectedConversation || !socketConnected) return;
    
    socketClient.emit('typing:start', { threadId: selectedConversation.id, userName });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socketClient.emit('typing:stop', { threadId: selectedConversation.id });
    }, 2000);
  }, [selectedConversation, socketConnected, userName]);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await messagingApi.getThreads({ limit: 50 });
      if (response.data?.results) {
        const threads = response.data.results.map((thread: MessageThread) => ({
          id: thread.id,
          participant: {
            id: thread.participants?.[0]?.id || '',
            name: thread.participants?.[0]?.name || 'Unknown',
            role: thread.participants?.[0]?.role || 'Patient',
          },
          lastMessage: thread.lastMessage?.content || '',
          lastMessageTime: new Date(thread.updatedAt || thread.createdAt),
          unreadCount: thread.unreadCount || 0,
          messages: [],
        }));
        setConversations(threads);
        if (threads.length > 0) {
          setSelectedConversation(threads[0]);
        }
      }
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (threadId: string) => {
    try {
      const response = await messagingApi.getMessages(threadId, { limit: 100 });
      if (response.data?.results) {
        const messages = response.data.results.map((msg: MessageType) => ({
          id: msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName || 'Unknown',
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          read: msg.read,
        }));
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === threadId ? { ...conv, messages } : conv
          )
        );
        if (selectedConversation?.id === threadId) {
          setSelectedConversation((prev) => prev ? { ...prev, messages } : prev);
        }
      }
    } catch {
      // Keep existing messages on error
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversation?.id) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation?.id, fetchMessages]);

  const filteredConversations = conversations.filter((c) => {
    if (!c.participant.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterType === 'patients' && c.participant.role !== 'Patient') return false;
    if (filterType === 'staff' && c.participant.role === 'Patient') return false;
    return true;
  });

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const optimisticMessage: LocalMessage = {
      id: `temp-${Date.now()}`,
      senderId: 'provider',
      senderName: 'You',
      content: messageContent,
      timestamp: new Date(),
      read: true,
    };

    setSelectedConversation((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimisticMessage] } : prev
    );
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              messages: [...conv.messages, optimisticMessage],
              lastMessage: messageContent,
              lastMessageTime: new Date(),
            }
          : conv
      )
    );

    try {
      setSending(true);
      await messagingApi.sendMessage(selectedConversation.id, messageContent);
      await messagingApi.markThreadAsRead(selectedConversation.id);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Revert optimistic update on error
      setSelectedConversation((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimisticMessage.id) } : prev
      );
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = useCallback(() => {
    router.push('/provider/messages/new');
  }, [router]);

  // Video call state
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [callType, setCallType] = useState<CallType>('video');
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  // Initialize WebRTC
  useEffect(() => {
    webrtcClient.initialize({
      onIncomingCall: (data) => setIncomingCall(data),
      onCallAccepted: () => setShowVideoCall(true),
      onCallRejected: () => {
        setShowVideoCall(false);
        toast({ title: 'Call declined', type: 'info' });
      },
      onCallEnded: () => {
        setShowVideoCall(false);
        setIncomingCall(null);
        toast({ title: 'Call ended', type: 'info' });
      },
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
        await webrtcClient.call(selectedConversation.participant.id, 'Provider', 'audio');
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
        await webrtcClient.call(selectedConversation.participant.id, 'Provider', 'video');
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

  const handleAcceptIncomingCall = useCallback(async () => {
    if (incomingCall) {
      setCallType(incomingCall.callType);
      await webrtcClient.accept(incomingCall.callId, incomingCall.callerId, incomingCall.callType);
      setShowVideoCall(true);
      setIncomingCall(null);
    }
  }, [incomingCall]);

  const handleRejectIncomingCall = useCallback(() => {
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

  const handleViewPatient = useCallback(() => {
    if (selectedConversation?.participant.role === 'Patient') {
      router.push(`/provider/patients/${selectedConversation.participant.id}`);
    }
  }, [selectedConversation, router]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="w-80 shrink-0 border-r border-gray-200 dark:border-gray-800">
          <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Messages
                {totalUnread > 0 && (
                  <Badge variant="danger" className="ml-2">{totalUnread}</Badge>
                )}
              </h2>
              <Button size="sm" variant="ghost" onClick={handleNewConversation}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="mt-3 flex gap-2">
              {(['all', 'patients', 'staff'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    filterType === type
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto">
            {filteredConversations.map((conversation) => (
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
                  <Avatar 
                    name={conversation.participant.name} 
                    size="lg"
                    status={conversation.participant.role === 'Patient' ? (
                      conversation.participant.riskLevel === 'high' ? 'busy' :
                      conversation.participant.riskLevel === 'moderate' ? 'away' : 'online'
                    ) : undefined}
                  />
                  {conversation.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      'font-medium truncate',
                      conversation.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                    )}>
                      {conversation.participant.name}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatTime(conversation.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{conversation.participant.role}</p>
                  <p className={cn(
                    'mt-1 truncate text-sm',
                    conversation.unreadCount > 0 ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                  )}>
                    {conversation.lastMessage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedConversation ? (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Avatar 
                  name={selectedConversation.participant.name}
                  size="md"
                  status={selectedConversation.participant.role === 'Patient' ? (
                    selectedConversation.participant.riskLevel === 'high' ? 'busy' :
                    selectedConversation.participant.riskLevel === 'moderate' ? 'away' : 'online'
                  ) : undefined}
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedConversation.participant.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500">{selectedConversation.participant.role}</p>
                    {selectedConversation.participant.riskLevel && (
                      <Badge variant={
                        selectedConversation.participant.riskLevel === 'high' ? 'danger' :
                        selectedConversation.participant.riskLevel === 'moderate' ? 'warning' : 'success'
                      }>
                        {selectedConversation.participant.riskLevel} risk
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" title="Start phone call" onClick={handlePhoneCall}>
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" title="Start video call" onClick={handleVideoCall}>
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" title="More options" onClick={() => {}}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.senderId === 'provider' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] rounded-2xl px-4 py-2',
                        message.senderId === 'provider'
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                      )}
                    >
                      <p>{message.content}</p>
                      <p
                        className={cn(
                          'mt-1 text-xs',
                          message.senderId === 'provider' ? 'text-white/70' : 'text-gray-500'
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
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Attach files"
              />
              {/* Attached files preview */}
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
              {/* Typing indicator */}
              {typingUsers.size > 0 && (
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                  <div className="flex gap-1">
                    <span className="animate-bounce h-2 w-2 rounded-full bg-gray-400" />
                    <span className="animate-bounce h-2 w-2 rounded-full bg-gray-400 [animation-delay:150ms]" />
                    <span className="animate-bounce h-2 w-2 rounded-full bg-gray-400 [animation-delay:300ms]" />
                  </div>
                  <span>
                    {Array.from(typingUsers.values()).map(u => u.userName).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" title="Attach file" onClick={handleAttachFile}>
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending}>
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

      {/* Video Call Modal */}
      {showVideoCall && selectedConversation && (
        <VideoCall
          userId={selectedConversation.participant.id}
          userName={selectedConversation.participant.name}
          onClose={() => {
            webrtcClient.end();
            setShowVideoCall(false);
          }}
        />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onReject={handleRejectIncomingCall}
        />
      )}
    </DashboardLayout>
  );
}
