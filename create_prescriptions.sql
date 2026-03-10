CREATE TABLE IF NOT EXISTS device_prescriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "patientId" varchar NOT NULL,
  "patientName" varchar,
  "providerId" varchar NOT NULL,
  "providerName" varchar,
  "organizationId" varchar,
  status varchar(20) DEFAULT 'pending',
  devices jsonb NOT NULL DEFAULT '[]',
  "clinicalReason" varchar,
  "icdCode" varchar,
  notes varchar,
  "orderId" varchar,
  "approvedById" varchar,
  "approvedAt" timestamp,
  "createdAt" timestamp DEFAULT now(),
  "updatedAt" timestamp DEFAULT now()
);
