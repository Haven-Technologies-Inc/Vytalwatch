import { NoteType, SOAPContent, TimeTracking } from '../entities/clinical-note.entity';

export class CreateClinicalNoteDto {
  patientId: string;
  type: NoteType;
  title: string;
  content?: string;
  soapContent?: SOAPContent;
  timeTracking?: TimeTracking;
  vitalReadingIds?: string[];
  alertIds?: string[];
  tags?: string[];
}

export class UpdateClinicalNoteDto {
  title?: string;
  content?: string;
  soapContent?: SOAPContent;
  timeTracking?: TimeTracking;
  tags?: string[];
}

export class SignNoteDto {
  signature?: string;
}

export class AmendNoteDto {
  reason: string;
  content: string;
  soapContent?: SOAPContent;
}

export class CreateCommunicationLogDto {
  patientId: string;
  type: 'call' | 'message' | 'video' | 'email' | 'sms' | 'alert';
  direction: 'inbound' | 'outbound';
  summary?: string;
  durationMinutes?: number;
  outcome?: 'completed' | 'missed' | 'voicemail' | 'no_answer';
  relatedNoteId?: string;
}

export class NoteFilterDto {
  patientId?: string;
  providerId?: string;
  type?: NoteType;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
