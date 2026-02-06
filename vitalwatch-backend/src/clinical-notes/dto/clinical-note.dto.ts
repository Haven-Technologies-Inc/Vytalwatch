import {
  NoteType,
  EncounterType,
  NoteStatus,
  SOAPStructure,
} from '../entities/clinical-note.entity';

export interface CreateClinicalNoteDto {
  patientId: string;
  providerId: string;
  noteType: NoteType;
  encounterType: EncounterType;
  encounterDate: Date;
  encounterDuration?: number;
  encounterLocation?: string;
  title: string;
  content: string;
  structuredData?: SOAPStructure | Record<string, any>;
  templateId?: string;
  vitalReadingIds?: string[];
  alertIds?: string[];
  medicationIds?: string[];
  appointmentIds?: string[];
  deviceIds?: string[];
  icdCodes?: string[];
  cptCodes?: string[];
  billingNotes?: string;
  requiresCoSignature?: boolean;
  isConfidential?: boolean;
  accessibleTo?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateClinicalNoteDto {
  title?: string;
  content?: string;
  structuredData?: SOAPStructure | Record<string, any>;
  encounterDuration?: number;
  encounterLocation?: string;
  vitalReadingIds?: string[];
  alertIds?: string[];
  medicationIds?: string[];
  appointmentIds?: string[];
  deviceIds?: string[];
  icdCodes?: string[];
  cptCodes?: string[];
  billingNotes?: string;
  status?: NoteStatus;
}

export interface AmendNoteDto {
  reason: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  addendum?: string;
  amendedBy: string;
}

export interface SignNoteDto {
  signatureMethod: 'electronic' | 'biometric' | 'password' | 'mfa';
  password?: string;
  mfaCode?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

export interface AddAddendumDto {
  content: string;
  addedBy: string;
}

export interface CoSignNoteDto {
  coSignedBy: string;
  notes?: string;
}

export interface SearchClinicalNotesDto {
  patientId?: string;
  providerId?: string;
  noteType?: NoteType | NoteType[];
  encounterType?: EncounterType | EncounterType[];
  status?: NoteStatus | NoteStatus[];
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  icdCodes?: string[];
  cptCodes?: string[];
  isConfidential?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'encounterDate' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface GenerateNoteDto {
  patientId: string;
  providerId: string;
  noteType: NoteType;
  encounterType: EncounterType;
  encounterDate: Date;
  vitalReadingIds?: string[];
  alertIds?: string[];
  context?: {
    chiefComplaint?: string;
    symptoms?: string[];
    duration?: string;
    additionalInfo?: string;
  };
}

export interface NoteTemplate {
  id: string;
  name: string;
  noteType: NoteType;
  encounterType: EncounterType;
  template: {
    title: string;
    sections: {
      name: string;
      content: string;
      required: boolean;
    }[];
    structuredDataTemplate?: Partial<SOAPStructure>;
  };
  organizationId?: string;
  isPublic: boolean;
  createdBy: string;
}

export interface VisitSummary {
  noteId: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  encounterDate: Date;
  encounterType: EncounterType;
  noteType: NoteType;
  diagnosis: string[];
  vitals: {
    type: string;
    value: string;
    status: string;
  }[];
  medications: {
    name: string;
    dosage: string;
    frequency: string;
  }[];
  plan: string[];
  followUp: {
    type: string;
    timeframe: string;
    instructions: string;
  };
  billingCodes: {
    icd: string[];
    cpt: string[];
  };
}
