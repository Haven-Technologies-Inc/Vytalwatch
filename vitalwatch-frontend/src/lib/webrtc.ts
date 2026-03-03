'use client';

import { socketClient } from './socket';

export type CallType = 'video' | 'audio';
export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

export interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callType: CallType;
}

export interface WebRTCCallbacks {
  onIncomingCall?: (data: IncomingCallData) => void;
  onCallAccepted?: (callId: string) => void;
  onCallRejected?: (callId: string, reason: string) => void;
  onCallEnded?: (callId: string) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
}

import { config } from '@/config';

const API_URL = config.api.baseUrl.replace('/api/v1', '');

const DEFAULT_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  iceTransportPolicy: 'all',
  iceCandidatePoolSize: 10,
};

async function fetchTurnCredentials(): Promise<RTCConfiguration> {
  try {
    const authData = localStorage.getItem('vitalwatch-auth');
    const token = authData ? JSON.parse(authData)?.state?.accessToken : null;
    
    if (!token) return DEFAULT_ICE_SERVERS;

    const response = await fetch(`${API_URL}/webrtc/turn-credentials`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return DEFAULT_ICE_SERVERS;

    const data = await response.json();
    return {
      iceServers: data.iceServers,
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10,
    };
  } catch (error) {
    console.warn('Failed to fetch TURN credentials, using STUN only:', error);
    return DEFAULT_ICE_SERVERS;
  }
}

class WebRTCClient {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private callbacks: WebRTCCallbacks = {};
  private callId: string | null = null;
  private remoteUserId: string | null = null;
  private cleanups: (() => void)[] = [];

  initialize(cb: WebRTCCallbacks) {
    this.callbacks = cb;
    this.setupListeners();
  }

  private setupListeners() {
    this.cleanups.push(
      socketClient.on<IncomingCallData>('call:incoming', (d) => {
        this.callId = d.callId;
        this.remoteUserId = d.callerId;
        this.callbacks.onIncomingCall?.(d);
      })
    );

    this.cleanups.push(
      socketClient.on<{ callId: string }>('call:accepted', async (d) => {
        this.callbacks.onCallAccepted?.(d.callId);
        await this.createOffer();
      })
    );

    this.cleanups.push(
      socketClient.on<{ callId: string; reason: string }>('call:rejected', (d) => {
        this.callbacks.onCallRejected?.(d.callId, d.reason);
        this.cleanup();
      })
    );

    this.cleanups.push(
      socketClient.on<{ callId: string }>('call:ended', (d) => {
        this.callbacks.onCallEnded?.(d.callId);
        this.cleanup();
      })
    );

    this.cleanups.push(
      socketClient.on<{ offer: RTCSessionDescriptionInit; fromUserId: string }>(
        'webrtc:offer',
        async (d) => {
          this.remoteUserId = d.fromUserId;
          await this.handleOffer(d.offer);
        }
      )
    );

    this.cleanups.push(
      socketClient.on<{ answer: RTCSessionDescriptionInit }>('webrtc:answer', async (d) => {
        await this.pc?.setRemoteDescription(new RTCSessionDescription(d.answer));
      })
    );

    this.cleanups.push(
      socketClient.on<{ candidate: RTCIceCandidateInit }>('webrtc:ice-candidate', async (d) => {
        if (this.pc) await this.pc.addIceCandidate(new RTCIceCandidate(d.candidate));
      })
    );
  }

  async getMedia(type: CallType): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: type === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false,
    });
    return this.localStream;
  }

  private async createPC() {
    const iceConfig = await fetchTurnCredentials();
    this.pc = new RTCPeerConnection(iceConfig);
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => this.pc?.addTrack(t, this.localStream!));
    }
    this.pc.ontrack = (e) => this.callbacks.onRemoteStream?.(e.streams[0]);
    this.pc.onicecandidate = (e) => {
      if (e.candidate && this.remoteUserId) {
        socketClient.emit('webrtc:ice-candidate', {
          callId: this.callId,
          targetUserId: this.remoteUserId,
          candidate: e.candidate.toJSON(),
        });
      }
    };
  }

  private async createOffer() {
    if (!this.pc) await this.createPC();
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    socketClient.emit('webrtc:offer', {
      callId: this.callId,
      targetUserId: this.remoteUserId,
      offer,
    });
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.pc) await this.createPC();
    await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    socketClient.emit('webrtc:answer', {
      callId: this.callId,
      targetUserId: this.remoteUserId,
      answer,
    });
  }

  async call(targetId: string, name: string, type: CallType) {
    await this.getMedia(type);
    await this.createPC();
    this.remoteUserId = targetId;
    const res = await socketClient.emit('call:initiate', { targetUserId: targetId, callType: type, callerName: name });
    if (res.success) this.callId = res.callId;
    return res;
  }

  async accept(callId: string, callerId: string, type: CallType) {
    await this.getMedia(type);
    await this.createPC();
    this.callId = callId;
    this.remoteUserId = callerId;
    await socketClient.emit('call:accept', { callId, callerId });
  }

  reject(callId: string, callerId: string) {
    socketClient.emit('call:reject', { callId, callerId });
    this.cleanup();
  }

  end() {
    if (this.callId) socketClient.emit('call:end', { callId: this.callId });
    this.cleanup();
  }

  toggleAudio(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
    if (this.callId) socketClient.emit('call:toggle-media', { callId: this.callId, mediaType: 'audio', enabled });
  }

  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
    if (this.callId) socketClient.emit('call:toggle-media', { callId: this.callId, mediaType: 'video', enabled });
  }

  getLocalStream() { return this.localStream; }

  cleanup() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.localStream = null;
    this.pc = null;
    this.callId = null;
    this.remoteUserId = null;
  }

  destroy() {
    this.cleanup();
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
  }
}

export const webrtcClient = new WebRTCClient();
export default webrtcClient;
