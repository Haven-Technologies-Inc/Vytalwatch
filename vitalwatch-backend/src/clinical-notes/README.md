# Clinical Notes Module

HIPAA-compliant, legally defensible clinical documentation system for VytalWatch RPM.

## Features

- **Multiple Note Types**: SOAP, Progress, Consultation, Discharge, Assessment, RPM Review
- **Encounter Types**: Telehealth, In-Person, Phone, Async, Emergency, RPM Monitoring
- **Digital Signatures**: Cryptographic signing with hash verification
- **Amendment Tracking**: Complete audit trail for all note modifications
- **Template System**: Pre-built templates for common note types
- **AI-Assisted Generation**: Automatic note generation using OpenAI/Grok
- **SOAP Structure**: Structured data support for SOAP notes
- **Immutability**: Signed and locked notes cannot be edited (amendments only)
- **Compliance**: ICD-10/CPT codes, billing integration, full audit logging
- **Version Control**: Track all versions and amendments

## API Endpoints

### Create Notes

#### POST /clinical-notes
Create a new clinical note
```json
{
  "patientId": "uuid",
  "providerId": "uuid",
  "noteType": "soap",
  "encounterType": "telehealth",
  "encounterDate": "2024-02-06T10:00:00Z",
  "title": "Follow-up Visit",
  "content": "Patient presents with...",
  "structuredData": {
    "subjective": {...},
    "objective": {...},
    "assessment": {...},
    "plan": {...}
  },
  "vitalReadingIds": ["uuid1", "uuid2"],
  "icdCodes": ["E11.9", "I10"],
  "cptCodes": ["99453", "99454"]
}
```

#### POST /clinical-notes/from-template/:templateId
Create note from template
```json
{
  "patientId": "uuid",
  "encounterDate": "2024-02-06T10:00:00Z"
}
```

#### POST /clinical-notes/generate/ai
Generate note with AI assistance
```json
{
  "patientId": "uuid",
  "providerId": "uuid",
  "noteType": "rpm_review",
  "encounterType": "rpm_monitoring",
  "encounterDate": "2024-02-06T10:00:00Z",
  "vitalReadingIds": ["uuid1", "uuid2"],
  "alertIds": ["uuid3"],
  "context": {
    "chiefComplaint": "High blood pressure readings",
    "symptoms": ["headache", "dizziness"],
    "duration": "3 days"
  }
}
```

### Read Notes

#### GET /clinical-notes
Get all notes with filters
Query params:
- `patientId`: Filter by patient
- `providerId`: Filter by provider
- `noteType`: Filter by note type (comma-separated for multiple)
- `encounterType`: Filter by encounter type
- `status`: Filter by status
- `startDate`, `endDate`: Date range filter
- `searchTerm`: Full-text search
- `icdCodes`, `cptCodes`: Filter by billing codes
- `page`, `limit`: Pagination
- `sortBy`, `sortOrder`: Sorting

#### GET /clinical-notes/:id
Get a specific note by ID

#### GET /clinical-notes/patient/:patientId
Get all notes for a patient

#### GET /clinical-notes/my/notes
Get current user's notes (for patients)

#### GET /clinical-notes/:id/summary
Generate visit summary from note

### Update Notes

#### PATCH /clinical-notes/:id
Update a note (only if not signed/locked)
```json
{
  "title": "Updated title",
  "content": "Updated content",
  "structuredData": {...}
}
```

#### POST /clinical-notes/:id/amend
Amend a signed/locked note
```json
{
  "reason": "Correction needed for medication dosage",
  "changes": [
    {
      "field": "structuredData.plan.medications[0].dosage",
      "oldValue": "10mg",
      "newValue": "20mg"
    }
  ],
  "addendum": "Updated dosage based on lab results"
}
```

### Sign and Lock

#### POST /clinical-notes/:id/sign
Sign a note with digital signature
```json
{
  "signatureMethod": "electronic",
  "password": "provider-password"
}
```

#### POST /clinical-notes/:id/lock
Lock a note to prevent edits

#### POST /clinical-notes/:id/addendum
Add addendum to signed note
```json
{
  "content": "Additional notes after review..."
}
```

#### POST /clinical-notes/:id/cosign
Co-sign a note
```json
{
  "notes": "Reviewed and approved"
}
```

### Templates

#### GET /clinical-notes/templates/list
Get all available templates
Query params:
- `noteType`: Filter by note type

### Statistics

#### GET /clinical-notes/stats/patient/:patientId
Get statistics for a patient

#### GET /clinical-notes/stats/provider/:providerId
Get statistics for a provider

### Delete

#### DELETE /clinical-notes/:id
Soft delete a note (only if not signed/locked)
```json
{
  "reason": "Created in error"
}
```

## Note Types

- `SOAP`: Subjective, Objective, Assessment, Plan
- `PROGRESS`: Progress note
- `CONSULTATION`: Consultation note
- `DISCHARGE`: Discharge summary
- `ASSESSMENT`: Clinical assessment
- `RPM_REVIEW`: Remote Patient Monitoring review
- `INITIAL_ASSESSMENT`: Initial patient assessment
- `FOLLOW_UP`: Follow-up visit note
- `REFERRAL`: Referral note
- `PROCEDURE`: Procedure note

## Encounter Types

- `TELEHEALTH`: Video/audio consultation
- `IN_PERSON`: Face-to-face visit
- `PHONE`: Phone consultation
- `ASYNC`: Asynchronous communication
- `EMERGENCY`: Emergency visit
- `RPM_MONITORING`: Remote monitoring review

## Note Status

- `DRAFT`: Note in draft state
- `IN_PROGRESS`: Note being written
- `PENDING_SIGNATURE`: Ready for signature
- `SIGNED`: Digitally signed
- `LOCKED`: Locked, no edits allowed
- `AMENDED`: Has been amended
- `DELETED`: Soft deleted

## SOAP Note Structure

```typescript
{
  subjective: {
    chiefComplaint: "Patient's main concern",
    historyOfPresentIllness: "Details of current condition",
    reviewOfSystems: "System-by-system review",
    currentMedications: ["med1", "med2"],
    allergies: ["allergy1"],
    socialHistory: "Relevant social history"
  },
  objective: {
    vitalSigns: {
      bloodPressure: "120/80",
      heartRate: 72,
      temperature: 98.6,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      weight: 170,
      height: 70,
      bmi: 24.4
    },
    physicalExam: "Exam findings",
    labResults: "Lab results",
    diagnosticResults: "Diagnostic test results",
    deviceData: {
      deviceId: "uuid",
      readings: [...],
      trends: "Trend analysis"
    }
  },
  assessment: {
    diagnosis: ["ICD-10 codes with descriptions"],
    differentialDiagnosis: ["Possible diagnoses"],
    problemList: ["Active problems"],
    riskAssessment: "Risk assessment",
    progressNotes: "Progress notes"
  },
  plan: {
    treatments: ["Treatment plans"],
    medications: [
      {
        name: "Medication name",
        dosage: "10mg",
        frequency: "twice daily",
        duration: "30 days"
      }
    ],
    orders: ["Lab orders", "Imaging orders"],
    referrals: ["Specialist referrals"],
    followUp: {
      type: "Telehealth",
      timeframe: "2 weeks",
      instructions: "Follow-up instructions"
    },
    patientEducation: ["Education topics"],
    goals: ["Treatment goals"]
  }
}
```

## Digital Signature

Notes are signed with a cryptographic hash to ensure integrity:

```typescript
{
  signedBy: "provider-uuid",
  signedAt: "2024-02-06T10:00:00Z",
  signatureMethod: "electronic",
  signatureHash: "sha256-hash-of-content",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  location: "Chicago, IL"
}
```

## Amendment Tracking

All amendments are tracked with complete audit trail:

```typescript
{
  id: "amendment-uuid",
  amendedBy: "provider-uuid",
  amendedAt: "2024-02-06T11:00:00Z",
  reason: "Correction needed",
  changes: [
    {
      field: "content",
      oldValue: "original value",
      newValue: "corrected value"
    }
  ],
  addendum: "Additional explanation"
}
```

## Compliance Features

### HIPAA Compliance
- Full audit logging of all access and modifications
- Confidential notes with access control lists
- Encryption at rest and in transit
- Role-based access control

### Legal Defensibility
- Immutable signed notes
- Amendment tracking with reasons
- Digital signatures with cryptographic hashing
- Complete version control
- Timestamp all changes

### Billing Integration
- ICD-10 diagnosis codes
- CPT procedure codes
- Link to billing claims
- Support for documentation requirements

### AI Transparency
- Track AI-generated content
- Mark AI-assisted notes
- Record model and confidence
- Track human edits to AI content

## Templates

Pre-built templates are available for common scenarios:

1. **SOAP Note - Telehealth Visit**
2. **RPM Review Note**
3. **Progress Note**

Custom templates can be created by organization.

## Usage Examples

### Create a SOAP Note

```typescript
const note = await clinicalNotesService.create({
  patientId: 'patient-uuid',
  providerId: 'provider-uuid',
  noteType: NoteType.SOAP,
  encounterType: EncounterType.TELEHEALTH,
  encounterDate: new Date(),
  title: 'Hypertension Follow-up',
  content: 'Patient presents for follow-up...',
  structuredData: {
    subjective: {
      chiefComplaint: 'High blood pressure',
      historyOfPresentIllness: 'Patient reports...',
    },
    objective: {
      vitalSigns: {
        bloodPressure: '140/90',
        heartRate: 75,
      },
    },
    assessment: {
      diagnosis: ['I10 - Essential hypertension'],
    },
    plan: {
      medications: [
        {
          name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'once daily',
        },
      ],
    },
  },
  icdCodes: ['I10'],
  cptCodes: ['99453'],
});
```

### Sign a Note

```typescript
const signedNote = await clinicalNotesService.sign(
  noteId,
  {
    signatureMethod: 'electronic',
    password: 'provider-password',
  },
  providerId,
);
```

### Amend a Note

```typescript
const amendedNote = await clinicalNotesService.amend(noteId, {
  reason: 'Correction to medication dosage',
  changes: [
    {
      field: 'structuredData.plan.medications[0].dosage',
      oldValue: '10mg',
      newValue: '20mg',
    },
  ],
  addendum: 'Dosage increased based on lab results',
  amendedBy: providerId,
});
```

### Generate with AI

```typescript
const aiNote = await clinicalNotesService.generateWithAI({
  patientId: 'patient-uuid',
  providerId: 'provider-uuid',
  noteType: NoteType.RPM_REVIEW,
  encounterType: EncounterType.RPM_MONITORING,
  encounterDate: new Date(),
  vitalReadingIds: ['vital1', 'vital2'],
  alertIds: ['alert1'],
  context: {
    chiefComplaint: 'Review of RPM data',
    additionalInfo: 'Patient showing upward trend in BP',
  },
});
```

## Best Practices

1. **Always sign notes** after completing documentation
2. **Lock critical notes** to prevent accidental edits
3. **Use templates** for consistency and efficiency
4. **Link related data** (vitals, alerts, medications)
5. **Include billing codes** for proper documentation
6. **Review AI-generated content** before signing
7. **Use amendments** for signed notes, not updates
8. **Document reasons** for amendments clearly
9. **Enable co-signature** for supervised providers
10. **Regular audits** of note completion rates

## Security Considerations

- Notes are soft-deleted, never hard-deleted
- All actions are logged in audit trail
- Digital signatures use SHA-256 hashing
- Confidential notes require explicit access grants
- Role-based permissions enforced at controller level
- IP address and user agent captured for signatures

## Future Enhancements

- Voice-to-text note dictation
- Smart templates based on diagnosis
- Auto-population from device data
- Integration with EHR systems
- Advanced NLP for note analysis
- Quality scoring for documentation completeness
- Automated coding suggestions (ICD-10/CPT)
- Collaborative note editing
- Mobile signature capture
- PDF export with digital signature
