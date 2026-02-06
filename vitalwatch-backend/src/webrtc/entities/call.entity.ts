import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum CallType {
  VIDEO = 'video',
  AUDIO = 'audio',
  SCREEN_SHARE = 'screen_share',
}

export enum CallStatus {
  SCHEDULED = 'scheduled',
  RINGING = 'ringing',
  IN_PROGRESS = 'in_progress',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  MISSED = 'missed',
}

export enum ParticipantStatus {
  INVITED = 'invited',
  JOINING = 'joining',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  LEFT = 'left',
}

export enum RecordingStatus {
  PENDING = 'pending',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('calls')
@Index(['patientId', 'createdAt'])
@Index(['providerId', 'createdAt'])
@Index(['status', 'scheduledAt'])
@Index(['appointmentId'])
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Participants
  @Column('uuid')
  @Index()
  patientId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column('uuid')
  @Index()
  providerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'providerId' })
  provider: User;

  @Column('uuid', { nullable: true })
  organizationId: string;

  // Call details
  @Column({
    type: 'enum',
    enum: CallType,
    default: CallType.VIDEO,
  })
  type: CallType;

  @Column({
    type: 'enum',
    enum: CallStatus,
    default: CallStatus.SCHEDULED,
  })
  @Index()
  status: CallStatus;

  // Timing
  @Column({ nullable: true })
  @Index()
  scheduledAt: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  endedAt: Date;

  @Column({ type: 'int', nullable: true })
  duration: number; // Duration in seconds

  @Column({ type: 'int', nullable: true })
  actualDuration: number; // Actual call duration in seconds

  // Room/session details
  @Column({ unique: true })
  roomId: string;

  @Column({ nullable: true })
  sessionId: string;

  // Initiator
  @Column('uuid')
  initiatedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'initiatedBy' })
  initiator: User;

  // Related resources
  @Column('uuid', { nullable: true })
  @Index()
  appointmentId: string;

  @Column('uuid', { nullable: true })
  clinicalNoteId: string;

  // Call quality metrics
  @Column('jsonb', { nullable: true })
  qualityMetrics: {
    averageBandwidth?: number; // kbps
    averageLatency?: number; // ms
    packetLoss?: number; // percentage
    jitter?: number; // ms
    videoResolution?: string;
    audioQuality?: 'excellent' | 'good' | 'fair' | 'poor';
    connectionType?: 'p2p' | 'relay';
  };

  // Connection info
  @Column('simple-array', { nullable: true })
  stunServers: string[];

  @Column('simple-array', { nullable: true })
  turnServers: string[];

  // End reason
  @Column('text', { nullable: true })
  endReason: string;

  @Column('uuid', { nullable: true })
  endedBy: string;

  // Failure info
  @Column('text', { nullable: true })
  failureReason: string;

  @Column('jsonb', { nullable: true })
  errorDetails: Record<string, any>;

  // Recording
  @Column({ default: false })
  recordingEnabled: boolean;

  @Column({ default: false })
  recordingConsentObtained: boolean;

  @Column({ nullable: true })
  recordingConsentedAt: Date;

  @Column('simple-array', { nullable: true })
  recordingConsentedBy: string[]; // Array of user IDs who consented

  // HIPAA compliance
  @Column({ default: false })
  isEncrypted: boolean;

  @Column({ default: false })
  isHIPAACompliant: boolean;

  @Column('text', { nullable: true })
  encryptionKey: string; // Encrypted storage of encryption key

  // Fallback handling
  @Column({ default: false })
  fellbackToAudio: boolean;

  @Column({ nullable: true })
  fallbackReason: string;

  @Column({ nullable: true })
  fallbackAt: Date;

  // Reconnection tracking
  @Column({ type: 'int', default: 0 })
  reconnectionAttempts: number;

  @Column({ nullable: true })
  lastReconnectionAt: Date;

  // Metadata
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  // Audit
  @Column('uuid')
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => CallParticipant, (participant) => participant.call, {
    cascade: true,
  })
  participants: CallParticipant[];

  @OneToMany(() => CallRecording, (recording) => recording.call, {
    cascade: true,
  })
  recordings: CallRecording[];
}

@Entity('call_participants')
@Index(['callId', 'userId'])
@Index(['callId', 'status'])
export class CallParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  callId: string;

  @ManyToOne(() => Call, (call) => call.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'callId' })
  call: Call;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.INVITED,
  })
  @Index()
  status: ParticipantStatus;

  // Timing
  @Column({ nullable: true })
  invitedAt: Date;

  @Column({ nullable: true })
  joinedAt: Date;

  @Column({ nullable: true })
  leftAt: Date;

  @Column({ type: 'int', nullable: true })
  participationDuration: number; // Duration in seconds

  // Connection details
  @Column({ nullable: true })
  socketId: string;

  @Column({ nullable: true })
  peerId: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  // Media streams
  @Column({ default: false })
  videoEnabled: boolean;

  @Column({ default: false })
  audioEnabled: boolean;

  @Column({ default: false })
  screenShareEnabled: boolean;

  // Connection quality
  @Column('jsonb', { nullable: true })
  connectionQuality: {
    bandwidth?: number;
    latency?: number;
    packetLoss?: number;
    jitter?: number;
  };

  // Disconnection tracking
  @Column({ type: 'int', default: 0 })
  disconnectionCount: number;

  @Column({ nullable: true })
  lastDisconnectedAt: Date;

  @Column('text', { nullable: true })
  disconnectionReason: string;

  // Consent
  @Column({ default: false })
  consentedToRecording: boolean;

  @Column({ nullable: true })
  consentedToRecordingAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('call_recordings')
@Index(['callId', 'status'])
@Index(['createdAt'])
export class CallRecording {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  callId: string;

  @ManyToOne(() => Call, (call) => call.recordings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'callId' })
  call: Call;

  @Column({
    type: 'enum',
    enum: RecordingStatus,
    default: RecordingStatus.PENDING,
  })
  @Index()
  status: RecordingStatus;

  // File details
  @Column({ nullable: true })
  fileName: string;

  @Column({ nullable: true })
  filePath: string;

  @Column({ nullable: true })
  fileUrl: string; // Presigned URL or CDN URL

  @Column({ type: 'bigint', nullable: true })
  fileSize: number; // Size in bytes

  @Column({ nullable: true })
  mimeType: string;

  @Column({ type: 'int', nullable: true })
  duration: number; // Duration in seconds

  // Recording details
  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  stoppedAt: Date;

  @Column('uuid', { nullable: true })
  startedBy: string;

  @Column('uuid', { nullable: true })
  stoppedBy: string;

  // Consent tracking
  @Column({ default: false })
  consentObtained: boolean;

  @Column('simple-array', { nullable: true })
  consentedParticipants: string[]; // Array of user IDs

  @Column({ nullable: true })
  consentObtainedAt: Date;

  @Column('jsonb', { nullable: true })
  consentDetails: {
    method: 'verbal' | 'written' | 'electronic';
    timestamp: Date;
    participantIds: string[];
    ipAddresses?: string[];
  };

  // HIPAA compliance
  @Column({ default: false })
  isEncrypted: boolean;

  @Column({ default: false })
  isHIPAACompliant: boolean;

  @Column('text', { nullable: true })
  encryptionAlgorithm: string;

  @Column('text', { nullable: true })
  encryptionKeyId: string; // Reference to key in key management system

  @Column({ nullable: true })
  encryptedAt: Date;

  // Storage details
  @Column({ nullable: true })
  storageProvider: string; // 'aws-s3', 'azure-blob', 'gcp-storage'

  @Column({ nullable: true })
  storageBucket: string;

  @Column({ nullable: true })
  storageKey: string;

  @Column({ nullable: true })
  storageRegion: string;

  // Retention policy
  @Column({ nullable: true })
  retentionPeriod: number; // Days

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ nullable: true })
  archivedAt: Date;

  // Processing
  @Column({ type: 'int', default: 0 })
  processingProgress: number; // 0-100

  @Column('text', { nullable: true })
  processingError: string;

  @Column({ nullable: true })
  processedAt: Date;

  // Transcription (if enabled)
  @Column({ default: false })
  isTranscribed: boolean;

  @Column('text', { nullable: true })
  transcriptionText: string;

  @Column({ nullable: true })
  transcriptionUrl: string;

  @Column('jsonb', { nullable: true })
  transcriptionData: {
    words?: Array<{
      word: string;
      startTime: number;
      endTime: number;
      confidence: number;
    }>;
    speakers?: Array<{
      speakerId: string;
      userId?: string;
      segments: Array<{
        text: string;
        startTime: number;
        endTime: number;
      }>;
    }>;
  };

  // Access tracking
  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ nullable: true })
  lastViewedAt: Date;

  @Column('uuid', { nullable: true })
  lastViewedBy: string;

  // Audit
  @Column('uuid')
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
