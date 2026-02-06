# Medications Module

## Overview

The Medications Module provides comprehensive medication management functionality for the VytalWatch RPM platform, enabling healthcare providers to prescribe medications, track patient adherence, monitor for drug interactions, and generate automated reminders.

## Features

### Core Functionality
- **Medication Prescribing**: Complete prescription management with dosage, frequency, route, and instructions
- **Automated Scheduling**: Generate medication schedules based on frequency (daily, BID, TID, QID, PRN, etc.)
- **Adherence Tracking**: Record and monitor when patients take, miss, or skip doses
- **Drug Interaction Checking**: Automated detection of potential medication interactions
- **Smart Reminders**: Configurable medication reminders sent to patients
- **Refill Management**: Track refills and alert patients when refills are needed
- **Side Effect Monitoring**: Allow patients to report side effects with automated provider alerts
- **HIPAA Compliance**: Full audit logging of all medication-related actions

### Automated Background Jobs
- **Medication Reminders** (Every 15 minutes): Send reminders before scheduled dose times
- **Missed Dose Detection** (Hourly): Automatically mark and alert for missed doses
- **Refill Checks** (Daily at 8 AM): Notify patients and providers when refills are needed

## Database Schema

### Medication Entity
Represents a prescribed medication with complete prescription details.

**Key Fields:**
- `name`, `genericName`, `brandName`: Medication identification
- `dosage`, `strength`, `route`, `type`: Prescription details
- `frequency`, `frequencyDetails`: How often to take
- `startDate`, `endDate`: Treatment period
- `prescribedBy`, `patientId`: Provider and patient references
- `interactions[]`: List of potential drug interactions
- `sideEffects[]`, `contraindications[]`: Safety information
- `refillsAuthorized`, `refillsUsed`: Refill tracking

### MedicationSchedule Entity
Represents specific scheduled times for taking medication.

**Key Fields:**
- `medicationId`: Link to parent medication
- `scheduledTime`: Specific date/time for this dose
- `isCompleted`, `completedAt`: Tracking status
- `reminderSent`, `reminderSentAt`: Reminder status
- `recurrenceRule`: Pattern for recurring schedules

### MedicationAdherence Entity
Tracks patient adherence to medication regimen.

**Key Fields:**
- `status`: TAKEN, MISSED, SKIPPED, PENDING, LATE
- `recordedAt`, `takenAt`: Timing information
- `dosageTaken`: Actual dose taken
- `hadSideEffects`, `reportedSideEffects[]`: Side effect tracking
- `notes`, `reason`: Additional context

## API Endpoints

### Medication Management

#### Prescribe Medication
```http
POST /medications
Authorization: Bearer {token}
Roles: PROVIDER, ADMIN, SUPERADMIN

Body:
{
  "name": "Lisinopril",
  "genericName": "Lisinopril",
  "type": "tablet",
  "dosage": "10mg",
  "strength": "10mg",
  "route": "oral",
  "frequency": "once_daily",
  "instructions": "Take once daily in the morning with water",
  "purpose": "Blood pressure management",
  "patientId": "uuid",
  "startDate": "2024-01-01",
  "scheduleTimesOfDay": ["08:00"],
  "reminderEnabled": true,
  "reminderMinutesBefore": 30
}
```

#### List Medications
```http
GET /medications?patientId={uuid}&status=active&page=1&limit=20
Authorization: Bearer {token}

Query Parameters:
- patientId: Filter by patient
- prescribedBy: Filter by prescriber
- status: active, discontinued, completed, on_hold
- isActive: true/false
- type: tablet, capsule, liquid, etc.
- frequency: once_daily, twice_daily, etc.
- search: Search medication name
- page: Page number (default: 1)
- limit: Items per page (default: 20)
```

#### Get Medication Details
```http
GET /medications/{id}
Authorization: Bearer {token}
```

#### Update Medication
```http
PATCH /medications/{id}
Authorization: Bearer {token}
Roles: PROVIDER, ADMIN, SUPERADMIN

Body:
{
  "dosage": "20mg",
  "frequency": "twice_daily",
  "instructions": "Updated instructions"
}
```

#### Discontinue Medication
```http
POST /medications/{id}/discontinue
Authorization: Bearer {token}
Roles: PROVIDER, ADMIN, SUPERADMIN

Body:
{
  "reason": "Treatment completed successfully"
}
```

### Adherence Tracking

#### Record Dose
```http
POST /medications/{id}/doses
Authorization: Bearer {token}

Body:
{
  "status": "taken",
  "takenAt": "2024-01-15T08:05:00Z",
  "notes": "Taken with breakfast",
  "hadSideEffects": false
}
```

For missed dose:
```json
{
  "status": "missed",
  "reason": "Forgot to take medication"
}
```

For side effects:
```json
{
  "status": "taken",
  "hadSideEffects": true,
  "reportedSideEffects": ["dizziness", "nausea"]
}
```

#### Get Adherence Rate
```http
GET /medications/{id}/adherence?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}

Response:
{
  "totalDoses": 30,
  "takenDoses": 27,
  "missedDoses": 2,
  "skippedDoses": 1,
  "lateDoses": 3,
  "adherenceRate": 90.00
}
```

#### Get Adherence Records
```http
GET /medications/adherence/records?medicationId={uuid}&status=missed
Authorization: Bearer {token}
```

#### Get Patient Adherence Overview
```http
GET /medications/adherence/overview?patientId={uuid}
Authorization: Bearer {token}

Response:
{
  "totalDoses": 150,
  "takenDoses": 135,
  "missedDoses": 10,
  "skippedDoses": 5,
  "lateDoses": 15,
  "adherenceRate": 90.00,
  "totalMedications": 5,
  "activeMedications": 4,
  "discontinuedMedications": 1,
  "medicationsRequiringRefill": 2,
  "medicationsWithInteractions": 1
}
```

### Statistics and Reporting

#### Get Medication Statistics
```http
GET /medications/stats?patientId={uuid}
Authorization: Bearer {token}

Response:
{
  "totalMedications": 10,
  "activeMedications": 7,
  "discontinuedMedications": 3,
  "medicationsRequiringRefill": 2,
  "overallAdherenceRate": 85.5,
  "medicationsWithInteractions": 1
}
```

### Safety and Interactions

#### Check Drug Interactions
```http
POST /medications/check-interactions
Authorization: Bearer {token}
Roles: PROVIDER, ADMIN, SUPERADMIN

Body:
{
  "patientId": "uuid",
  "medicationName": "warfarin"
}

Response:
{
  "medicationName": "warfarin",
  "hasInteractions": true,
  "interactions": ["aspirin", "ibuprofen"],
  "message": "Potential interactions detected with: aspirin, ibuprofen"
}
```

### Scheduling

#### Get Upcoming Schedule
```http
GET /medications/schedule/upcoming?patientId={uuid}&days=7
Authorization: Bearer {token}

Response:
{
  "patientId": "uuid",
  "startDate": "2024-01-15",
  "endDate": "2024-01-22",
  "daysAhead": 7,
  "medicationCount": 4,
  "medications": [
    {
      "id": "uuid",
      "name": "Lisinopril",
      "dosage": "10mg",
      "frequency": "once_daily",
      "instructions": "Take in morning with water",
      "reminderEnabled": true
    }
  ]
}
```

### Refill Management

#### Request Refill
```http
POST /medications/{id}/refill
Authorization: Bearer {token}

Response:
{
  "statusCode": 200,
  "message": "Refill recorded successfully",
  "refillsRemaining": 2
}
```

## Enums

### MedicationType
- `tablet`, `capsule`, `liquid`, `injection`, `inhaler`, `topical`, `patch`, `drops`, `suppository`, `other`

### Route
- `oral`, `sublingual`, `intravenous`, `intramuscular`, `subcutaneous`, `topical`, `transdermal`, `inhalation`, `nasal`, `ophthalmic`, `otic`, `rectal`, `vaginal`

### Frequency
- `once_daily`, `twice_daily`, `three_times_daily`, `four_times_daily`
- `every_4_hours`, `every_6_hours`, `every_8_hours`, `every_12_hours`
- `as_needed`, `weekly`, `every_other_day`, `bedtime`, `morning`, `custom`

### AdherenceStatus
- `taken`, `missed`, `skipped`, `pending`, `late`

## Integration

### With Tasks Module
The Medications module automatically creates medication reminder tasks in the Tasks module when `reminderEnabled` is true. These tasks:
- Appear in the patient's task list
- Are marked with `TaskType.MEDICATION_REMINDER`
- Recur based on medication frequency
- Link to the medication via metadata

### With Notifications Module
The module sends notifications for:
- **New Prescriptions**: Alerts patient when medication is prescribed
- **Medication Reminders**: Before scheduled dose times (configurable)
- **Missed Doses**: Alerts provider when adherence is low (<80%)
- **Side Effects**: Urgent alerts to provider when patient reports side effects
- **Refills Needed**: Alerts patient and provider when refills are exhausted
- **Discontinuation**: Alerts patient when medication is discontinued

### With Audit Module
All medication operations are logged:
- `MEDICATION_PRESCRIBED`: New prescription created
- `MEDICATION_UPDATED`: Prescription modified
- `MEDICATION_DISCONTINUED`: Medication discontinued
- `MEDICATION_DOSE_RECORDED`: Adherence record created

Audit logs include:
- User who performed action
- Timestamp
- Medication ID and patient ID
- Detailed changes made
- Compliance with HIPAA requirements

## Security and Access Control

### Role-Based Permissions

**Patients:**
- View own medications
- Record doses for own medications
- View own adherence data
- Request refills for own medications

**Providers:**
- Prescribe medications
- Update and discontinue medications
- View all patient medications
- Access adherence data
- Check drug interactions

**Admins/SuperAdmins:**
- All provider permissions
- Access to all system data
- Can manage any medication

### PHI Handling
All medication data is considered Protected Health Information (PHI) under HIPAA:
- Encrypted at rest and in transit
- Full audit trail maintained
- Access logged and monitored
- Automatic data retention policies

## Usage Examples

### Prescribing a New Medication

```typescript
// Service usage
const medication = await medicationsService.create({
  name: 'Metformin',
  genericName: 'Metformin',
  type: MedicationType.TABLET,
  dosage: '500mg',
  strength: '500mg',
  route: Route.ORAL,
  frequency: Frequency.TWICE_DAILY,
  instructions: 'Take with meals',
  purpose: 'Type 2 Diabetes management',
  patientId: 'patient-uuid',
  prescribedBy: 'provider-uuid',
  startDate: new Date(),
  scheduleTimesOfDay: ['08:00', '20:00'],
  reminderEnabled: true,
  reminderMinutesBefore: 30,
});
```

### Recording Patient Adherence

```typescript
// Patient took medication on time
await medicationsService.recordDose(medicationId, {
  status: AdherenceStatus.TAKEN,
  takenAt: new Date(),
  recordMethod: 'manual',
});

// Patient missed a dose
await medicationsService.recordDose(medicationId, {
  status: AdherenceStatus.MISSED,
  reason: 'Forgot to take medication',
});

// Patient took medication but had side effects
await medicationsService.recordDose(medicationId, {
  status: AdherenceStatus.TAKEN,
  hadSideEffects: true,
  reportedSideEffects: ['dizziness', 'headache'],
  notes: 'Felt dizzy 30 minutes after taking',
});
```

### Getting Adherence Report

```typescript
// Get adherence for specific medication
const adherence = await medicationsService.getAdherenceRate(
  medicationId,
  undefined,
  startDate,
  endDate
);

// Get overall patient adherence
const patientAdherence = await medicationsService.getAdherenceRate(
  undefined,
  patientId,
  startDate,
  endDate
);

console.log(`Adherence rate: ${adherence.adherenceRate}%`);
console.log(`Taken: ${adherence.takenDoses}/${adherence.totalDoses}`);
```

### Checking Drug Interactions

```typescript
const interactions = await medicationsService.checkInteractions(
  patientId,
  'warfarin'
);

if (interactions.length > 0) {
  console.warn('Drug interactions detected:', interactions);
  // Alert provider before prescribing
}
```

## Testing

### Unit Tests
Test files should cover:
- Medication CRUD operations
- Schedule generation
- Adherence calculations
- Interaction checking
- Notification sending
- Cron job execution

### Integration Tests
- Full workflow from prescription to adherence tracking
- Multi-medication scenarios
- Interaction detection with multiple drugs
- Reminder delivery
- Provider alerts for missed doses

## Best Practices

1. **Always check for interactions** before prescribing new medications
2. **Enable reminders by default** to improve adherence
3. **Review adherence rates regularly** - rates below 80% should trigger provider follow-up
4. **Document discontinuation reasons** for audit trail
5. **Encourage patients to report side effects** immediately
6. **Set realistic refill counts** based on treatment duration
7. **Use generic names** when possible for clarity
8. **Include clear instructions** that patients can understand
9. **Monitor interaction alerts** and update medication lists accordingly
10. **Regular medication reconciliation** during patient visits

## Troubleshooting

### Reminders Not Sending
- Check that `reminderEnabled` is true
- Verify `reminderMinutesBefore` is set
- Ensure schedules exist for the medication
- Check notification service configuration

### Adherence Rate Seems Incorrect
- Verify date ranges are correct
- Check that doses are being recorded
- Ensure schedules were generated properly
- Review adherence status values

### Drug Interactions Not Detected
- Interaction database may need updates
- Check medication name matching (case-insensitive)
- Consider adding to `knownInteractions` mapping
- Integrate with external drug database API

## Future Enhancements

- [ ] Integration with external drug databases (FDA, RxNorm)
- [ ] Barcode scanning for medication verification
- [ ] Smart device integration (pill dispensers)
- [ ] ML-based adherence prediction
- [ ] Automated prior authorization workflows
- [ ] Pharmacy integration for e-prescribing
- [ ] Multi-language support for instructions
- [ ] Photo documentation of medications
- [ ] Caregiver portal for adherence monitoring
- [ ] Insurance formulary checking

## Support

For questions or issues with the Medications module, contact the VytalWatch development team or refer to the main documentation.
