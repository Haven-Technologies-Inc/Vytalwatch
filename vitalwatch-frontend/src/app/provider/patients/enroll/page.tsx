'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { patientsApi, tenoviApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import {
  User,
  Phone,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  Smartphone,
  MapPin,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, name: 'Patient Information', icon: User },
  { id: 2, name: 'Contact Details', icon: Phone },
  { id: 3, name: 'Medical Info', icon: Shield },
  { id: 4, name: 'Device Selection', icon: Smartphone },
  { id: 5, name: 'Review & Confirm', icon: Check },
];

const availableConditions = [
  'Hypertension',
  'Diabetes Type 2',
  'Heart Disease',
  'COPD',
  'Chronic Kidney Disease',
  'Congestive Heart Failure',
  'Obesity',
  'Asthma',
];

const deviceTypes = [
  { id: 'BP', name: 'Blood Pressure Monitor', icon: '🩺', description: 'For hypertension monitoring' },
  { id: 'WS', name: 'Weight Scale', icon: '⚖️', description: 'For weight and CHF monitoring' },
  { id: 'PO', name: 'Pulse Oximeter', icon: '💓', description: 'For SpO2 and heart rate' },
  { id: 'GM', name: 'Glucose Meter', icon: '🩸', description: 'For diabetes management' },
  { id: 'TH', name: 'Thermometer', icon: '🌡️', description: 'For temperature monitoring' },
];

interface PatientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  conditions: string[];
  insuranceProvider: string;
  insurancePolicyNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  selectedDevices: string[];
  notes: string;
}

export default function EnrollPatientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    conditions: [],
    insuranceProvider: '',
    insurancePolicyNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    selectedDevices: [],
    notes: '',
  });

  const updateField = (field: keyof PatientFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCondition = (condition: string) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.includes(condition)
        ? prev.conditions.filter(c => c !== condition)
        : [...prev.conditions, condition],
    }));
  };

  const toggleDevice = (deviceId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedDevices: prev.selectedDevices.includes(deviceId)
        ? prev.selectedDevices.filter(d => d !== deviceId)
        : [...prev.selectedDevices, deviceId],
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.firstName && !!formData.lastName && !!formData.dateOfBirth;
      case 2:
        return !!formData.email && !!formData.phone;
      case 3:
        return formData.conditions.length > 0;
      case 4:
        return formData.selectedDevices.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields', type: 'error' });
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = useCallback(async () => {
    try {
      setIsSubmitting(true);

      // Create patient
      const patientResponse = await patientsApi.create({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        conditions: formData.conditions,
        address: {
          street: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
        emergencyContact: {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
          relationship: formData.emergencyContactRelation,
        },
        insuranceInfo: {
          provider: formData.insuranceProvider,
          policyNumber: formData.insurancePolicyNumber,
        },
        notes: formData.notes,
      });

      if (patientResponse.data?.id) {
        // Order devices for patient if any selected
        if (formData.selectedDevices.length > 0) {
          try {
            await tenoviApi.createOrder({
              patientId: patientResponse.data.id,
              deviceTypes: formData.selectedDevices,
              shippingAddress: {
                name: `${formData.firstName} ${formData.lastName}`,
                street: formData.address,
                city: formData.city,
                state: formData.state,
                zipCode: formData.zipCode,
              },
            });
          } catch (deviceError) {
            console.error('Device order error:', deviceError);
            toast({ title: 'Warning', description: 'Patient created but device order failed', type: 'warning' });
          }
        }

        toast({ title: 'Success', description: 'Patient enrolled successfully', type: 'success' });
        router.push(`/provider/patients/${patientResponse.data.id}`);
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      toast({ title: 'Error', description: 'Failed to enroll patient', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, router, toast]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/provider/patients">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Patients
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enroll New Patient</h1>
        </div>

        {/* Progress Steps */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                    currentStep > step.id
                      ? 'border-green-500 bg-green-500 text-white'
                      : currentStep === step.id
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800'
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    'ml-2 hidden text-sm font-medium md:block',
                    currentStep >= step.id ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                  )}
                >
                  {step.name}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'mx-4 h-0.5 w-12 lg:w-24',
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Patient Information</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    First Name *
                  </label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Name *
                  </label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date of Birth *
                  </label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Contact Details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="patient@email.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone Number *
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Street Address
                  </label>
                  <Input
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">State</label>
                  <Input
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">ZIP Code</label>
                  <Input
                    value={formData.zipCode}
                    onChange={(e) => updateField('zipCode', e.target.value)}
                    placeholder="12345"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="mb-4 font-medium">Emergency Contact</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <Input
                      value={formData.emergencyContactName}
                      onChange={(e) => updateField('emergencyContactName', e.target.value)}
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <Input
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => updateField('emergencyContactPhone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Relationship
                    </label>
                    <Input
                      value={formData.emergencyContactRelation}
                      onChange={(e) => updateField('emergencyContactRelation', e.target.value)}
                      placeholder="Spouse, Child, etc."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Medical Information</h2>
              <div>
                <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Conditions *
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableConditions.map((condition) => (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => toggleCondition(condition)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                        formData.conditions.includes(condition)
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                      )}
                    >
                      {formData.conditions.includes(condition) && <Check className="mr-1 inline h-4 w-4" />}
                      {condition}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Insurance Provider
                  </label>
                  <Input
                    value={formData.insuranceProvider}
                    onChange={(e) => updateField('insuranceProvider', e.target.value)}
                    placeholder="Medicare, Blue Cross, etc."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Policy Number
                  </label>
                  <Input
                    value={formData.insurancePolicyNumber}
                    onChange={(e) => updateField('insurancePolicyNumber', e.target.value)}
                    placeholder="Policy number"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Any additional notes about the patient..."
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                  rows={3}
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Select Devices</h2>
              <p className="text-sm text-gray-500">
                Select the monitoring devices to be shipped to the patient. At least one device is required.
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {deviceTypes.map((device) => (
                  <button
                    key={device.id}
                    type="button"
                    onClick={() => toggleDevice(device.id)}
                    className={cn(
                      'flex flex-col items-center rounded-xl border-2 p-6 text-center transition-all',
                      formData.selectedDevices.includes(device.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800'
                    )}
                  >
                    <span className="text-4xl">{device.icon}</span>
                    <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">{device.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{device.description}</p>
                    {formData.selectedDevices.includes(device.id) && (
                      <Badge className="mt-3" variant="success">
                        <Check className="mr-1 h-3 w-3" />
                        Selected
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Review & Confirm</h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <h3 className="mb-3 flex items-center gap-2 font-medium">
                    <User className="h-4 w-4" /> Patient Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Name:</span>{' '}
                      <span className="font-medium">{formData.firstName} {formData.lastName}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">DOB:</span>{' '}
                      <span className="font-medium">{formData.dateOfBirth}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <h3 className="mb-3 flex items-center gap-2 font-medium">
                    <Mail className="h-4 w-4" /> Contact Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Email:</span>{' '}
                      <span className="font-medium">{formData.email}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Phone:</span>{' '}
                      <span className="font-medium">{formData.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <h3 className="mb-3 flex items-center gap-2 font-medium">
                    <Shield className="h-4 w-4" /> Medical Info
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {formData.conditions.map((c) => (
                      <Badge key={c} variant="secondary">{c}</Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <h3 className="mb-3 flex items-center gap-2 font-medium">
                    <Smartphone className="h-4 w-4" /> Devices
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.selectedDevices.map((d) => {
                      const device = deviceTypes.find((dt) => dt.id === d);
                      return (
                        <span key={d} className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm dark:bg-gray-700">
                          {device?.icon} {device?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-400">
                      Please verify all information
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-500">
                      Once submitted, devices will be ordered and shipped to the patient address.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          {currentStep < steps.length ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Complete Enrollment
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
