/**
 * Clinical Notes Module Constants
 * Defines constants used throughout the clinical notes system
 */

export const CLINICAL_NOTES_CONSTANTS = {
  // Validation
  MIN_NOTE_CONTENT_LENGTH: 10,
  MAX_NOTE_CONTENT_LENGTH: 50000,
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 200,
  MAX_AMENDMENT_REASON_LENGTH: 500,
  MAX_ADDENDUM_LENGTH: 10000,

  // Retention
  DRAFT_NOTE_RETENTION_DAYS: 30,
  SIGNED_NOTE_RETENTION_YEARS: 7, // HIPAA minimum
  AUDIT_LOG_RETENTION_YEARS: 6,

  // Signature
  SIGNATURE_HASH_ALGORITHM: 'sha256',
  SUPPORTED_SIGNATURE_METHODS: ['electronic', 'biometric', 'password', 'mfa'],

  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,

  // Templates
  DEFAULT_TEMPLATE_IDS: {
    SOAP_TELEHEALTH: 'template-soap-telehealth',
    RPM_REVIEW: 'template-rpm-review',
    PROGRESS_NOTE: 'template-progress-note',
  },

  // Compliance
  REQUIRED_FIELDS_FOR_BILLING: [
    'encounterDate',
    'encounterDuration',
    'icdCodes',
    'cptCodes',
  ],

  // AI
  AI_GENERATION_TIMEOUT_MS: 30000,
  AI_MIN_CONFIDENCE_THRESHOLD: 0.7,
  AI_MAX_VITALS_CONTEXT: 20,

  // RPM Billing Codes
  RPM_CPT_CODES: {
    DEVICE_SETUP: '99453',
    DEVICE_SUPPLY: '99454',
    MONITORING_TIME_20MIN: '99457',
    MONITORING_TIME_ADDITIONAL: '99458',
  },

  // Common ICD-10 Codes for RPM
  COMMON_RPM_ICD_CODES: {
    HYPERTENSION: 'I10',
    TYPE_2_DIABETES: 'E11.9',
    HEART_FAILURE: 'I50.9',
    COPD: 'J44.9',
    ATRIAL_FIBRILLATION: 'I48.91',
  },
};

export const NOTE_TYPE_DISPLAY_NAMES = {
  soap: 'SOAP Note',
  progress: 'Progress Note',
  consultation: 'Consultation Note',
  discharge: 'Discharge Summary',
  assessment: 'Clinical Assessment',
  rpm_review: 'RPM Review',
  initial_assessment: 'Initial Assessment',
  follow_up: 'Follow-up Note',
  referral: 'Referral Note',
  procedure: 'Procedure Note',
};

export const ENCOUNTER_TYPE_DISPLAY_NAMES = {
  telehealth: 'Telehealth Visit',
  in_person: 'In-Person Visit',
  phone: 'Phone Consultation',
  async: 'Asynchronous',
  emergency: 'Emergency Visit',
  rpm_monitoring: 'RPM Monitoring',
};

export const NOTE_STATUS_DISPLAY_NAMES = {
  draft: 'Draft',
  in_progress: 'In Progress',
  pending_signature: 'Pending Signature',
  signed: 'Signed',
  locked: 'Locked',
  amended: 'Amended',
  deleted: 'Deleted',
};

/**
 * Minimum required sections for each note type
 */
export const REQUIRED_SECTIONS_BY_NOTE_TYPE = {
  soap: ['subjective', 'objective', 'assessment', 'plan'],
  progress: ['interval_history', 'current_status', 'assessment_plan'],
  consultation: ['reason_for_consult', 'assessment', 'recommendations'],
  discharge: ['hospital_course', 'discharge_diagnosis', 'discharge_plan'],
  assessment: ['presenting_problem', 'assessment', 'recommendations'],
  rpm_review: ['monitoring_period', 'vital_trends', 'clinical_assessment', 'plan'],
};

/**
 * Audit action types for clinical notes
 */
export const CLINICAL_NOTE_AUDIT_ACTIONS = {
  CREATED: 'CLINICAL_NOTE_CREATED',
  UPDATED: 'CLINICAL_NOTE_UPDATED',
  AMENDED: 'CLINICAL_NOTE_AMENDED',
  SIGNED: 'CLINICAL_NOTE_SIGNED',
  LOCKED: 'CLINICAL_NOTE_LOCKED',
  DELETED: 'CLINICAL_NOTE_DELETED',
  ACCESSED: 'CLINICAL_NOTE_ACCESSED',
  ADDENDUM_ADDED: 'CLINICAL_NOTE_ADDENDUM_ADDED',
  COSIGNED: 'CLINICAL_NOTE_COSIGNED',
  EXPORTED: 'CLINICAL_NOTE_EXPORTED',
  PRINTED: 'CLINICAL_NOTE_PRINTED',
};

/**
 * Error messages
 */
export const CLINICAL_NOTE_ERRORS = {
  NOT_FOUND: 'Clinical note not found',
  ACCESS_DENIED: 'Access denied to this note',
  ALREADY_SIGNED: 'Note is already signed',
  ALREADY_LOCKED: 'Note is already locked',
  CANNOT_EDIT_SIGNED: 'Cannot edit a signed note. Use amend() instead.',
  CANNOT_EDIT_LOCKED: 'Cannot edit a locked note. Use amend() instead.',
  CANNOT_DELETE_SIGNED: 'Cannot delete signed or locked notes',
  INCOMPLETE_NOTE: 'Note is incomplete and cannot be signed',
  INVALID_SIGNATURE_METHOD: 'Invalid signature method',
  COSIGNATURE_NOT_REQUIRED: 'This note does not require co-signature',
  MUST_BE_SIGNED_FIRST: 'Note must be signed before this action',
  TEMPLATE_NOT_FOUND: 'Template not found',
  AI_GENERATION_FAILED: 'Failed to generate note with AI',
  INVALID_AMENDMENT: 'Invalid amendment data',
};
