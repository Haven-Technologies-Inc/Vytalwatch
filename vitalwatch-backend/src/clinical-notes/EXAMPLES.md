# Clinical Notes Module - Usage Examples

This document provides practical examples of how to use the Clinical Notes module.

## Table of Contents
1. [Basic Note Creation](#basic-note-creation)
2. [SOAP Notes](#soap-notes)
3. [RPM Review Notes](#rpm-review-notes)
4. [Using Templates](#using-templates)
5. [Digital Signatures](#digital-signatures)
6. [Amendments](#amendments)
7. [AI-Assisted Generation](#ai-assisted-generation)
8. [Searching Notes](#searching-notes)
9. [Integration Examples](#integration-examples)

## Basic Note Creation

### Creating a Simple Progress Note

```typescript
// POST /clinical-notes
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "providerId": "660e8400-e29b-41d4-a716-446655440001",
  "noteType": "progress",
  "encounterType": "phone",
  "encounterDate": "2024-02-06T14:30:00Z",
  "encounterDuration": 15,
  "title": "Weekly Check-in Call",
  "content": "Patient reports feeling well. Blood pressure readings have been stable. No new symptoms or concerns. Continue current medication regimen. Follow-up in 1 week."
}
```

### Response
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "providerId": "660e8400-e29b-41d4-a716-446655440001",
  "noteType": "progress",
  "encounterType": "phone",
  "status": "draft",
  "encounterDate": "2024-02-06T14:30:00Z",
  "title": "Weekly Check-in Call",
  "content": "Patient reports feeling well...",
  "isSigned": false,
  "isLocked": false,
  "createdAt": "2024-02-06T14:35:00Z",
  "updatedAt": "2024-02-06T14:35:00Z"
}
```

## SOAP Notes

### Creating a Comprehensive SOAP Note

```typescript
// POST /clinical-notes
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "providerId": "660e8400-e29b-41d4-a716-446655440001",
  "noteType": "soap",
  "encounterType": "telehealth",
  "encounterDate": "2024-02-06T10:00:00Z",
  "encounterDuration": 30,
  "encounterLocation": "Virtual - Zoom",
  "title": "Hypertension Management Follow-up",
  "content": "Detailed narrative note content...",
  "structuredData": {
    "subjective": {
      "chiefComplaint": "Follow-up for hypertension management",
      "historyOfPresentIllness": "Patient is a 62-year-old male with history of essential hypertension diagnosed 5 years ago. He has been monitoring his blood pressure at home with the RPM device. Reports occasional headaches, more frequent in the morning. Denies chest pain, shortness of breath, or dizziness.",
      "reviewOfSystems": "Constitutional: No fever, weight stable. Cardiovascular: No chest pain or palpitations. Respiratory: No shortness of breath. Neurological: Occasional headaches as noted.",
      "currentMedications": [
        "Lisinopril 10mg daily",
        "Aspirin 81mg daily",
        "Atorvastatin 20mg daily"
      ],
      "allergies": ["NKDA"],
      "socialHistory": "Non-smoker, occasional alcohol use (1-2 drinks per week), retired accountant, lives with spouse"
    },
    "objective": {
      "vitalSigns": {
        "bloodPressure": "138/88",
        "heartRate": 72,
        "weight": 185,
        "height": 70,
        "bmi": 26.5
      },
      "physicalExam": "General: Alert and oriented, no acute distress. Cardiovascular: Regular rate and rhythm, no murmurs. Lungs: Clear to auscultation bilaterally. Extremities: No edema.",
      "deviceData": {
        "deviceId": "device-12345",
        "readings": "20 readings over past 30 days",
        "trends": "Average BP 136/86, trending slightly downward over past 2 weeks"
      }
    },
    "assessment": {
      "diagnosis": [
        "I10 - Essential (primary) hypertension",
        "R51.9 - Headache, unspecified"
      ],
      "differentialDiagnosis": [],
      "problemList": [
        "Hypertension - improving with current regimen",
        "Morning headaches - likely related to BP fluctuations"
      ],
      "riskAssessment": "Moderate cardiovascular risk given age and hypertension. Good medication compliance and home monitoring.",
      "progressNotes": "Patient showing good response to current antihypertensive therapy. Blood pressure trending toward goal."
    },
    "plan": {
      "treatments": [
        "Continue current antihypertensive regimen",
        "Encourage lifestyle modifications: diet and exercise",
        "Monitor for headache pattern correlation with BP readings"
      ],
      "medications": [
        {
          "name": "Lisinopril",
          "dosage": "10mg",
          "frequency": "once daily",
          "duration": "90 days (3 refills)"
        },
        {
          "name": "Aspirin",
          "dosage": "81mg",
          "frequency": "once daily",
          "duration": "90 days (3 refills)"
        }
      ],
      "orders": [
        "Continue home BP monitoring twice daily",
        "Basic metabolic panel in 3 months",
        "Lipid panel in 3 months"
      ],
      "referrals": [],
      "followUp": {
        "type": "Telehealth",
        "timeframe": "4 weeks",
        "instructions": "Review BP trends and headache log. Assess need for medication adjustment."
      },
      "patientEducation": [
        "DASH diet principles reviewed",
        "Importance of regular BP monitoring discussed",
        "When to seek emergency care (BP >180/120 with symptoms)"
      ],
      "goals": [
        "Target BP <130/80 mmHg",
        "Reduce morning headache frequency",
        "Maintain medication compliance"
      ]
    }
  },
  "vitalReadingIds": [
    "vital-001",
    "vital-002",
    "vital-003"
  ],
  "icdCodes": ["I10", "R51.9"],
  "cptCodes": ["99453", "99457"],
  "billingNotes": "30-minute telehealth visit with RPM review. 20+ minutes spent reviewing device data and patient education."
}
```

## RPM Review Notes

### Monthly RPM Monitoring Review

```typescript
// POST /clinical-notes
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "providerId": "660e8400-e29b-41d4-a716-446655440001",
  "noteType": "rpm_review",
  "encounterType": "rpm_monitoring",
  "encounterDate": "2024-02-06T09:00:00Z",
  "encounterDuration": 25,
  "title": "Monthly RPM Data Review - January 2024",
  "content": "Comprehensive review of patient's remote monitoring data for January 2024...",
  "structuredData": {
    "monitoringPeriod": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "totalDays": 31,
      "complianceDays": 28,
      "complianceRate": "90.3%"
    },
    "vitalTrends": {
      "bloodPressure": {
        "average": "136/84",
        "trend": "Stable",
        "outOfRangeReadings": 3,
        "criticalAlerts": 0
      },
      "weight": {
        "average": 185,
        "change": "-2 lbs from previous month",
        "trend": "Improving"
      },
      "heartRate": {
        "average": 74,
        "trend": "Stable"
      }
    },
    "alerts": {
      "total": 5,
      "critical": 0,
      "warning": 5,
      "resolved": 5
    },
    "assessment": {
      "overallStatus": "Stable and improving",
      "concerns": [
        "3 morning BP spikes noted",
        "Correlation with headache complaints"
      ],
      "interventions": [
        "Phone consultation completed on 1/15",
        "Medication adherence counseling provided"
      ]
    },
    "plan": {
      "adjustments": "No medication changes needed at this time",
      "followUp": "Continue monthly RPM reviews",
      "patientCommunication": "Sent summary report to patient portal"
    }
  },
  "vitalReadingIds": [
    "vital-jan-001", "vital-jan-002", "..."
  ],
  "alertIds": [
    "alert-001", "alert-002"
  ],
  "icdCodes": ["I10"],
  "cptCodes": ["99457"],
  "billingNotes": "RPM monitoring time: 25 minutes reviewing data, trends, and patient communication"
}
```

## Using Templates

### Create Note from Template

```typescript
// POST /clinical-notes/from-template/template-soap-telehealth
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "encounterDate": "2024-02-06T14:00:00Z"
}
```

### List Available Templates

```bash
# GET /clinical-notes/templates/list
curl -X GET "http://localhost:3000/clinical-notes/templates/list" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by note type
curl -X GET "http://localhost:3000/clinical-notes/templates/list?noteType=soap" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Digital Signatures

### Sign a Note

```typescript
// POST /clinical-notes/:id/sign
{
  "signatureMethod": "electronic",
  "password": "provider-secure-password"
}
```

### Sign with MFA

```typescript
// POST /clinical-notes/:id/sign
{
  "signatureMethod": "mfa",
  "mfaCode": "123456"
}
```

### Response
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "status": "signed",
  "isSigned": true,
  "signedAt": "2024-02-06T15:00:00Z",
  "signature": {
    "signedBy": "660e8400-e29b-41d4-a716-446655440001",
    "signedAt": "2024-02-06T15:00:00Z",
    "signatureMethod": "electronic",
    "signatureHash": "a1b2c3d4e5f6...",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### Lock a Signed Note

```typescript
// POST /clinical-notes/:id/lock
// No body required
```

## Amendments

### Amend a Signed Note

```typescript
// POST /clinical-notes/:id/amend
{
  "reason": "Correction to medication dosage based on pharmacy consultation",
  "changes": [
    {
      "field": "structuredData.plan.medications[0].dosage",
      "oldValue": "10mg",
      "newValue": "20mg"
    },
    {
      "field": "structuredData.plan.medications[0].frequency",
      "oldValue": "once daily",
      "newValue": "twice daily"
    }
  ],
  "addendum": "After consultation with pharmacy, dosage was increased to 20mg twice daily based on patient's weight and recent lab results (Cr 0.9). Patient notified and agrees with adjustment."
}
```

### Add Addendum to Signed Note

```typescript
// POST /clinical-notes/:id/addendum
{
  "content": "Patient called back at 3:00 PM to report improvement in symptoms after medication adjustment. No adverse effects noted. Will continue to monitor."
}
```

### Co-Sign a Note

```typescript
// POST /clinical-notes/:id/cosign
{
  "notes": "Reviewed and approved. Treatment plan is appropriate for this patient's condition."
}
```

## AI-Assisted Generation

### Generate SOAP Note with AI

```typescript
// POST /clinical-notes/generate/ai
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "providerId": "660e8400-e29b-41d4-a716-446655440001",
  "noteType": "soap",
  "encounterType": "telehealth",
  "encounterDate": "2024-02-06T10:00:00Z",
  "vitalReadingIds": [
    "vital-001",
    "vital-002",
    "vital-003"
  ],
  "alertIds": [
    "alert-001"
  ],
  "context": {
    "chiefComplaint": "High blood pressure readings over past week",
    "symptoms": [
      "headache",
      "dizziness",
      "fatigue"
    ],
    "duration": "7 days",
    "additionalInfo": "Patient has been compliant with medications but dietary adherence has been poor over holidays"
  }
}
```

### Generate RPM Review with AI

```typescript
// POST /clinical-notes/generate/ai
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "providerId": "660e8400-e29b-41d4-a716-446655440001",
  "noteType": "rpm_review",
  "encounterType": "rpm_monitoring",
  "encounterDate": "2024-02-06T09:00:00Z",
  "vitalReadingIds": [
    "vital-jan-001",
    "vital-jan-002",
    "..."
  ],
  "alertIds": [
    "alert-001",
    "alert-002"
  ],
  "context": {
    "chiefComplaint": "Monthly review of RPM data for January 2024"
  }
}
```

## Searching Notes

### Get All Notes for a Patient

```bash
GET /clinical-notes/patient/550e8400-e29b-41d4-a716-446655440000?page=1&limit=50
```

### Search with Multiple Filters

```bash
GET /clinical-notes?patientId=550e8400-e29b-41d4-a716-446655440000&noteType=soap,progress&status=signed&startDate=2024-01-01&endDate=2024-02-06&sortBy=encounterDate&sortOrder=DESC&page=1&limit=50
```

### Full-Text Search

```bash
GET /clinical-notes?searchTerm=hypertension&page=1&limit=20
```

### Search by Billing Codes

```bash
GET /clinical-notes?icdCodes=I10,E11.9&cptCodes=99453,99457&page=1&limit=50
```

### Get Provider's Unsigned Notes

```bash
GET /clinical-notes?providerId=660e8400-e29b-41d4-a716-446655440001&status=draft,pending_signature&sortBy=createdAt&sortOrder=ASC
```

## Integration Examples

### Complete RPM Visit Workflow

```typescript
// 1. Generate note with AI using recent vitals and alerts
const generatedNote = await fetch('/clinical-notes/generate/ai', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    patientId: 'patient-123',
    providerId: 'provider-123',
    noteType: 'rpm_review',
    encounterType: 'rpm_monitoring',
    encounterDate: new Date().toISOString(),
    vitalReadingIds: vitalsFromLastMonth,
    alertIds: alertsFromLastMonth,
    context: {
      chiefComplaint: 'Monthly RPM review'
    }
  })
});

// 2. Provider reviews and edits the AI-generated note
const updatedNote = await fetch(`/clinical-notes/${generatedNote.id}`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Reviewed and edited content...',
    structuredData: { /* updated SOAP data */ },
    status: 'pending_signature'
  })
});

// 3. Sign the note
const signedNote = await fetch(`/clinical-notes/${generatedNote.id}/sign`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    signatureMethod: 'electronic',
    password: 'provider-password'
  })
});

// 4. Lock the note to prevent edits
await fetch(`/clinical-notes/${generatedNote.id}/lock`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer TOKEN'
  }
});

// 5. Generate visit summary
const summary = await fetch(`/clinical-notes/${generatedNote.id}/summary`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer TOKEN'
  }
});

// 6. Link to billing claim
// (Handled separately through billing module)
```

### Patient Portal Integration

```typescript
// Patient views their own clinical notes
const myNotes = await fetch('/clinical-notes/my/notes?page=1&limit=10', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer PATIENT_TOKEN'
  }
});

// Get visit summary for patient
const visitSummary = await fetch(`/clinical-notes/${noteId}/summary`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer PATIENT_TOKEN'
  }
});
```

### Provider Dashboard Integration

```typescript
// Get provider's statistics
const stats = await fetch('/clinical-notes/stats/provider/provider-123', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer TOKEN'
  }
});

// Response:
{
  "total": 150,
  "byType": {
    "soap": 80,
    "progress": 45,
    "rpm_review": 25
  },
  "byStatus": {
    "signed": 120,
    "draft": 15,
    "pending_signature": 10,
    "locked": 5
  },
  "pending": 10,
  "recentActivity": [
    { "id": "note-1", "patientId": "patient-1", "noteType": "soap", ... },
    { "id": "note-2", "patientId": "patient-2", "noteType": "progress", ... }
  ]
}
```

### Billing Integration

```typescript
// Get notes for billing submission
const notesForBilling = await fetch('/clinical-notes?status=signed&billingSubmitted=false&startDate=2024-02-01&endDate=2024-02-06', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer TOKEN'
  }
});

// Mark note as billed
const billedNote = await fetch(`/clinical-notes/${noteId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    billingSubmitted: true,
    billingClaimId: 'claim-123'
  })
});
```

## Error Handling Examples

```typescript
try {
  const note = await clinicalNotesService.sign(noteId, signDto, userId);
} catch (error) {
  if (error.message === 'Note is already signed') {
    // Handle already signed
  } else if (error.message === 'Only the note author can sign it') {
    // Handle unauthorized
  } else if (error.message.includes('incomplete')) {
    // Handle incomplete note
  }
}
```

## Best Practices

1. **Always review AI-generated content before signing**
2. **Use structured data (SOAP) for consistency**
3. **Link related resources (vitals, alerts, medications)**
4. **Include billing codes for proper documentation**
5. **Sign notes promptly after completing documentation**
6. **Use amendments for corrections to signed notes**
7. **Lock critical notes after signing**
8. **Regular audits of note completion rates**
9. **Maintain HIPAA compliance with access controls**
10. **Use templates for efficiency and consistency**
