import { ConsentType } from '../entities/consent.entity';

export class CreateConsentTemplateDto {
  name: string;
  type: ConsentType;
  version: string;
  content: string;
  summary?: string;
  requiresWitness?: boolean;
  requiresGuardian?: boolean;
  expirationDays?: number;
  requiredFields?: string[];
}

export class UpdateConsentTemplateDto {
  name?: string;
  content?: string;
  summary?: string;
  requiresWitness?: boolean;
  requiresGuardian?: boolean;
  expirationDays?: number;
  requiredFields?: string[];
  isActive?: boolean;
}

export class SendConsentDto {
  patientId: string;
  templateId: string;
  customFields?: Record<string, any>;
  sendEmail?: boolean;
  sendSms?: boolean;
}

export class SignConsentDto {
  signatureData: string;
  customFields?: Record<string, any>;
}

export class WitnessConsentDto {
  witnessSignature: string;
}

export class GuardianSignConsentDto {
  guardianName: string;
  guardianRelationship: string;
  guardianSignature: string;
}

export class RevokeConsentDto {
  reason: string;
}

export class ConsentFilterDto {
  patientId?: string;
  type?: ConsentType;
  status?: string;
  page?: number;
  limit?: number;
}
