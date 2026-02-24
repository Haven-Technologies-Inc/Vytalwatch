'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VitalSignCard } from '@/components/dashboard/VitalSignCard';
import { TrendChart, MultiLineChart, RiskScoreGauge } from '@/components/dashboard/Charts';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { patientsApi, tenoviApi, aiApi, alertsApi, clinicalNotesApi, consentsApi, integrationsApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import type { TenoviHwiDevice, Patient, Alert, Medication, VitalReading } from '@/types';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  MessageSquare,
  FileText,
  Pill,
  Activity,
  AlertTriangle,
  ChevronLeft,
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ClipboardList,
  Clock,
  CheckCircle,
  FileSignature
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'vitals', label: 'Vitals History', icon: Activity },
  { id: 'devices', label: 'Devices', icon: Smartphone },
  { id: 'insights', label: 'AI Insights', icon: Activity },
  { id: 'care-plan', label: 'Care Plan', icon: FileText },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'notes', label: 'Clinical Notes', icon: ClipboardList },
  { id: 'consents', label: 'Consents', icon: FileSignature },
  { id: 'communication', label: 'Communication', icon: MessageSquare },
];

const sensorCodeToType: Record<string, { name: string; icon: string }> = {
  'BP': { name: 'Blood Pressure Monitor', icon: '🩺' },
  'WS': { name: 'Weight Scale', icon: '⚖️' },
  'PO': { name: 'Pulse Oximeter', icon: '💓' },
  'GM': { name: 'Glucose Meter', icon: '🩸' },
  'TH': { name: 'Thermometer', icon: '🌡️' },
};

interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  conditions?: string[];
  createdAt?: string;
  status?: string;
}

interface VitalCardData {
  type: 'bp' | 'heart_rate' | 'spo2' | 'weight' | 'glucose' | 'temperature';
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  timestamp: Date;
  trend: 'up' | 'down' | 'stable';
  secondaryValue?: string;
}

interface TrendDataPoint {
  date: string;
  systolic?: number;
  diastolic?: number;
  weight?: number;
  heartRate?: number;
  spo2?: number;
}

interface InsightData {
  type: 'prediction' | 'recommendation' | 'trend';
  title: string;
  description: string;
  confidence: number;
  actionLabel?: string;
}

interface CarePlanData {
  goals: string[];
  interventions: string[];
  notes: string;
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const patientId = params.id as string;

  // State for all data
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [vitals, setVitals] = useState<VitalCardData[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [riskScore, setRiskScore] = useState<number>(0);
  const [devices, setDevices] = useState<TenoviHwiDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [syncingDevice, setSyncingDevice] = useState<string | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [carePlan, setCarePlan] = useState<CarePlanData>({ goals: [], interventions: [], notes: '' });

  // Edit states
  const [editingCarePlan, setEditingCarePlan] = useState(false);
  const [editedCarePlan, setEditedCarePlan] = useState<CarePlanData>({ goals: [], interventions: [], notes: '' });
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '', frequency: '', notes: '' });
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [savingCarePlan, setSavingCarePlan] = useState(false);
  const [savingMedication, setSavingMedication] = useState(false);

  // Clinical notes and consents
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [consentTemplates, setConsentTemplates] = useState<any[]>([]);
  const [communicationLogs, setCommunicationLogs] = useState<any[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', type: 'progress' });
  const [savingNote, setSavingNote] = useState(false);
  const [showRequestConsent, setShowRequestConsent] = useState(false);
  const [selectedConsentTemplate, setSelectedConsentTemplate] = useState('');
  const [viewingConsent, setViewingConsent] = useState<any | null>(null);

  // Communication state
  const [showAddCommunication, setShowAddCommunication] = useState(false);
  const [newCommunication, setNewCommunication] = useState({ type: 'call' as 'call' | 'message' | 'video' | 'email' | 'sms', summary: '', durationMinutes: 0 });
  const [savingCommunication, setSavingCommunication] = useState(false);

  // Calculate age from date of birth
  const calculateAge = (dob?: string): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Transform vital readings to card format
  const transformVitalsToCards = (readings: VitalReading[]): VitalCardData[] => {
    const latestByType = new Map<string, VitalReading>();
    readings.forEach(r => {
      const existing = latestByType.get(r.type);
      if (!existing || new Date(r.timestamp) > new Date(existing.timestamp)) {
        latestByType.set(r.type, r);
      }
    });

    const cards: VitalCardData[] = [];
    latestByType.forEach((reading, type) => {
      let value = '';
      let unit = reading.unit || '';
      
      if (type === 'blood_pressure' && reading.values) {
        value = `${reading.values.systolic || 0}/${reading.values.diastolic || 0}`;
        unit = 'mmHg';
      } else if (reading.values) {
        const firstValue = Object.values(reading.values)[0];
        value = String(firstValue || 0);
      }

      cards.push({
        type: type === 'blood_pressure' ? 'bp' : type as VitalCardData['type'],
        value,
        unit,
        status: reading.status || 'normal',
        timestamp: new Date(reading.timestamp),
        trend: 'stable',
      });
    });

    return cards;
  };

  // Fetch patient data
  const fetchPatientData = useCallback(async () => {
    if (!patientId) return;
    
    try {
      setLoading(prev => prev ? prev : true);
      
      // Fetch patient details
      const patientRes = await patientsApi.getById(patientId);
      if (patientRes.data) {
        setPatient(patientRes.data as unknown as PatientData);
      }

      // Fetch latest vitals
      const vitalsRes = await patientsApi.getLatestVitals(patientId);
      if (vitalsRes.data) {
        const readings = Array.isArray(vitalsRes.data) ? vitalsRes.data : [vitalsRes.data];
        setVitals(transformVitalsToCards(readings as unknown as VitalReading[]));
      }

      // Fetch vitals history for trends
      const historyRes = await patientsApi.getVitalsHistory(patientId);
      if (historyRes.data) {
        const history = (historyRes.data as { vitals?: VitalReading[] })?.vitals || [];
        const trendPoints: TrendDataPoint[] = [];
        const dateMap = new Map<string, TrendDataPoint>();

        history.forEach((v: VitalReading) => {
          const dateStr = new Date(v.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const existing = dateMap.get(dateStr) || { date: dateStr };
          
          if (v.type === 'blood_pressure' && v.values) {
            existing.systolic = v.values.systolic;
            existing.diastolic = v.values.diastolic;
          } else if (v.type === 'weight' && v.values) {
            existing.weight = v.values.weight;
          }
          
          dateMap.set(dateStr, existing);
        });

        dateMap.forEach(point => trendPoints.push(point));
        setTrendData(trendPoints.slice(-30));
      }

      // Fetch active alerts
      const alertsRes = await patientsApi.getAlerts(patientId, 'active');
      if (alertsRes.data) {
        setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      }

      // Fetch AI insights
      try {
        const insightsRes = await patientsApi.getAIInsights(patientId);
        if (insightsRes.data) {
          const insightData = insightsRes.data as { trends?: string[]; concerns?: string[]; recommendations?: string[] };
          const formattedInsights: InsightData[] = [];
          
          insightData.trends?.forEach((t: string) => {
            formattedInsights.push({ type: 'trend', title: 'Health Trend', description: t, confidence: 0.85 });
          });
          insightData.concerns?.forEach((c: string) => {
            formattedInsights.push({ type: 'prediction', title: 'Health Concern', description: c, confidence: 0.75, actionLabel: 'Review' });
          });
          insightData.recommendations?.forEach((r: string) => {
            formattedInsights.push({ type: 'recommendation', title: 'Recommendation', description: r, confidence: 0.80, actionLabel: 'View' });
          });
          
          setInsights(formattedInsights);
        }
      } catch {
        console.log('AI insights not available');
      }

      // Fetch risk score
      try {
        const riskRes = await patientsApi.getRiskScore(patientId);
        if (riskRes.data) {
          setRiskScore((riskRes.data as { score?: number }).score || 0);
        }
      } catch {
        console.log('Risk score not available');
      }

      // Fetch medications
      try {
        const medsRes = await patientsApi.getMedications(patientId);
        if (medsRes.data) {
          setMedications(Array.isArray(medsRes.data) ? medsRes.data : []);
        }
      } catch {
        console.log('Medications not available');
      }

      // Fetch care plan
      try {
        const carePlanRes = await patientsApi.getCarePlan(patientId);
        if (carePlanRes.data) {
          const cp = carePlanRes.data as unknown as { goals?: Array<{description?: string} | string>; interventions?: Array<{description?: string} | string>; notes?: string };
          setCarePlan({
            goals: (cp.goals || []).map(g => typeof g === 'string' ? g : g.description || ''),
            interventions: (cp.interventions || []).map(i => typeof i === 'string' ? i : i.description || ''),
            notes: cp.notes || '',
          });
        }
      } catch {
        console.log('Care plan not available');
      }

    } catch (err: unknown) {
      console.error('Error fetching patient data:', err);
      // Handle 401 errors - redirect to login
      const error = err as { status?: number; message?: string };
      if (error?.status === 401 || error?.message?.includes('401')) {
        router.push('/auth/login');
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [patientId, router]);

  // Initial data fetch
  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  const fetchDevices = useCallback(async () => {
    if (!patientId) return;
    
    try {
      setDevicesLoading(true);
      const response = await patientsApi.getDevices(patientId);
      const devicesData = response.data as unknown as { tenoviDevices?: TenoviHwiDevice[] };
      if (devicesData?.tenoviDevices) {
        setDevices(devicesData.tenoviDevices);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setDevicesLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (activeTab === 'devices') {
      fetchDevices();
    }
  }, [activeTab, fetchDevices]);

  const handleSyncDevice = async (deviceId: string) => {
    try {
      setSyncingDevice(deviceId);
      await tenoviApi.syncDevice(deviceId);
      await fetchDevices();
      toast({ title: 'Success', description: 'Device synced successfully', type: 'success' });
    } catch (err) {
      console.error('Sync error:', err);
      toast({ title: 'Error', description: 'Failed to sync device', type: 'error' });
    } finally {
      setSyncingDevice(null);
    }
  };

  const handleMessagePatient = () => {
    if (patient) {
      router.push(`/provider/messages?patient=${patientId}&name=${encodeURIComponent(`${patient.firstName} ${patient.lastName}`)}`);
    }
  };

  const handleCallPatient = async () => {
    toast({ title: 'Initiating Call', description: `Calling ${patient?.firstName} ${patient?.lastName}...`, type: 'info' });
    // Log the call attempt
    try {
      await clinicalNotesApi.createCommunicationLog({
        patientId,
        type: 'call',
        direction: 'outbound',
        summary: `Outbound call to ${patient?.firstName} ${patient?.lastName}`,
      });
    } catch (err) {
      console.error('Failed to log call:', err);
    }
  };

  const handleCreateCommunicationLog = async () => {
    if (!newCommunication.summary.trim()) {
      toast({ title: 'Error', description: 'Please provide a summary', type: 'error' });
      return;
    }

    try {
      setSavingCommunication(true);
      const response = await clinicalNotesApi.createCommunicationLog({
        patientId,
        type: newCommunication.type,
        direction: 'outbound',
        summary: newCommunication.summary,
        durationMinutes: newCommunication.durationMinutes || undefined,
      });
      if (response.data) {
        setCommunicationLogs(prev => [response.data, ...prev]);
      }
      setShowAddCommunication(false);
      setNewCommunication({ type: 'call', summary: '', durationMinutes: 0 });
      toast({ title: 'Success', description: 'Communication logged', type: 'success' });
    } catch (err) {
      console.error('Error creating communication log:', err);
      toast({ title: 'Error', description: 'Failed to log communication', type: 'error' });
    } finally {
      setSavingCommunication(false);
    }
  };

  const handleSendSms = async (message: string) => {
    if (!patient?.phone) {
      toast({ title: 'Error', description: 'Patient phone number not available', type: 'error' });
      return;
    }

    try {
      await integrationsApi.sendSms(patient.phone, message);
      // Log the SMS
      const response = await clinicalNotesApi.createCommunicationLog({
        patientId,
        type: 'sms',
        direction: 'outbound',
        summary: message,
      });
      if (response.data) {
        setCommunicationLogs(prev => [response.data, ...prev]);
      }
      toast({ title: 'SMS Sent', description: `Message sent to ${patient.phone}`, type: 'success' });
    } catch (err) {
      console.error('Error sending SMS:', err);
      toast({ title: 'Error', description: 'Failed to send SMS', type: 'error' });
    }
  };

  const handleReviewAlerts = () => {
    router.push(`/provider/alerts?patient=${patientId}`);
  };

  // Care Plan handlers
  const handleEditCarePlan = () => {
    setEditedCarePlan({ ...carePlan });
    setEditingCarePlan(true);
  };

  const handleSaveCarePlan = async () => {
    try {
      setSavingCarePlan(true);
      await patientsApi.updateCarePlan(patientId, editedCarePlan as unknown as Record<string, unknown>);
      setCarePlan(editedCarePlan);
      setEditingCarePlan(false);
      toast({ title: 'Success', description: 'Care plan updated', type: 'success' });
    } catch (err) {
      console.error('Error saving care plan:', err);
      toast({ title: 'Error', description: 'Failed to save care plan', type: 'error' });
    } finally {
      setSavingCarePlan(false);
    }
  };

  const handleAddGoal = () => {
    setEditedCarePlan(prev => ({ ...prev, goals: [...prev.goals, ''] }));
  };

  const handleRemoveGoal = (index: number) => {
    setEditedCarePlan(prev => ({ ...prev, goals: prev.goals.filter((_, i) => i !== index) }));
  };

  const handleAddIntervention = () => {
    setEditedCarePlan(prev => ({ ...prev, interventions: [...prev.interventions, ''] }));
  };

  const handleRemoveIntervention = (index: number) => {
    setEditedCarePlan(prev => ({ ...prev, interventions: prev.interventions.filter((_, i) => i !== index) }));
  };

  // Medication handlers
  const handleAddMedication = async () => {
    if (!newMedication.name || !newMedication.dosage) {
      toast({ title: 'Error', description: 'Name and dosage are required', type: 'error' });
      return;
    }

    try {
      setSavingMedication(true);
      const response = await patientsApi.addMedication(patientId, newMedication);
      if (response.data) {
        setMedications(prev => [...prev, response.data as Medication]);
      }
      setNewMedication({ name: '', dosage: '', frequency: '', notes: '' });
      setShowAddMedication(false);
      toast({ title: 'Success', description: 'Medication added', type: 'success' });
    } catch (err) {
      console.error('Error adding medication:', err);
      toast({ title: 'Error', description: 'Failed to add medication', type: 'error' });
    } finally {
      setSavingMedication(false);
    }
  };

  const handleDeleteMedication = async (medId: string) => {
    try {
      await patientsApi.removeMedication(patientId, medId);
      setMedications(prev => prev.filter(m => m.id !== medId));
      toast({ title: 'Success', description: 'Medication removed', type: 'success' });
    } catch (err) {
      console.error('Error deleting medication:', err);
      toast({ title: 'Error', description: 'Failed to remove medication', type: 'error' });
    }
  };

  // Clinical Notes handlers
  const handleCreateNote = async () => {
    if (!newNote.title || !newNote.content) {
      toast({ title: 'Error', description: 'Title and content are required', type: 'error' });
      return;
    }

    try {
      setSavingNote(true);
      const response = await clinicalNotesApi.create({
        patientId,
        type: newNote.type,
        title: newNote.title,
        content: newNote.content,
      });
      if (response.data) {
        setClinicalNotes(prev => [response.data, ...prev]);
      }
      setNewNote({ title: '', content: '', type: 'progress' });
      setShowAddNote(false);
      toast({ title: 'Success', description: 'Note created', type: 'success' });
    } catch (err) {
      console.error('Error creating note:', err);
      toast({ title: 'Error', description: 'Failed to create note', type: 'error' });
    } finally {
      setSavingNote(false);
    }
  };

  const handleSignNote = async (noteId: string) => {
    try {
      await clinicalNotesApi.sign(noteId);
      setClinicalNotes(prev => prev.map(n => 
        n.id === noteId ? { ...n, status: 'signed', signedAt: new Date().toISOString() } : n
      ));
      toast({ title: 'Note signed', type: 'success' });
    } catch (err) {
      console.error('Error signing note:', err);
      toast({ title: 'Error', description: 'Failed to sign note', type: 'error' });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await clinicalNotesApi.delete(noteId);
      setClinicalNotes(prev => prev.filter(n => n.id !== noteId));
      toast({ title: 'Note deleted', type: 'success' });
    } catch (err) {
      console.error('Error deleting note:', err);
      toast({ title: 'Error', description: 'Failed to delete note', type: 'error' });
    }
  };

  // Consent handlers
  const handleRequestConsent = async () => {
    if (!selectedConsentTemplate) {
      toast({ title: 'Error', description: 'Please select a consent type', type: 'error' });
      return;
    }

    try {
      const response = await consentsApi.send({
        patientId,
        templateId: selectedConsentTemplate,
      });
      if (response.data) {
        setConsents(prev => [response.data, ...prev]);
      }
      setShowRequestConsent(false);
      setSelectedConsentTemplate('');
      toast({ title: 'Success', description: 'Consent request sent', type: 'success' });
    } catch (err) {
      console.error('Error requesting consent:', err);
      toast({ title: 'Error', description: 'Failed to send consent request', type: 'error' });
    }
  };

  const handleViewConsent = async (consentId: string) => {
    try {
      const response = await consentsApi.getById(consentId);
      if (response.data) {
        setViewingConsent(response.data);
      }
    } catch (err) {
      console.error('Error fetching consent:', err);
      toast({ title: 'Error', description: 'Failed to load consent', type: 'error' });
    }
  };

  const handleSendReminder = async (consentId: string) => {
    try {
      const response = await consentsApi.sendReminder(consentId);
      if (response.data?.success) {
        toast({ title: 'Reminder Sent', description: response.data.message, type: 'success' });
      }
    } catch (err) {
      console.error('Error sending reminder:', err);
      toast({ title: 'Error', description: 'Failed to send reminder', type: 'error' });
    }
  };

  // Device handlers
  const handleUnassignDevice = async (deviceId: string) => {
    try {
      await patientsApi.unassignDevice(patientId, deviceId);
      setDevices(prev => prev.filter(d => d.hwiDeviceId !== deviceId));
      toast({ title: 'Success', description: 'Device unassigned', type: 'success' });
    } catch (err) {
      console.error('Error unassigning device:', err);
      toast({ title: 'Error', description: 'Failed to unassign device', type: 'error' });
    }
  };

  // Fetch clinical notes and consents when tab changes
  useEffect(() => {
    const fetchNotesAndConsents = async () => {
      if (activeTab === 'notes') {
        try {
          const response = await clinicalNotesApi.getByPatient(patientId);
          if (response.data) {
            setClinicalNotes(Array.isArray(response.data) ? response.data : []);
          }
        } catch (err) {
          console.log('Clinical notes not available');
        }
      }

      if (activeTab === 'consents') {
        try {
          const [consentsRes, templatesRes] = await Promise.all([
            consentsApi.getByPatient(patientId),
            consentsApi.getTemplates(),
          ]);
          if (consentsRes.data) {
            setConsents(Array.isArray(consentsRes.data) ? consentsRes.data : []);
          }
          if (templatesRes.data) {
            setConsentTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : []);
          }
        } catch (err) {
          console.log('Consents not available');
        }
      }

      if (activeTab === 'communication') {
        try {
          const response = await clinicalNotesApi.getCommunicationLogs(patientId);
          if (response.data) {
            setCommunicationLogs(Array.isArray(response.data) ? response.data : []);
          }
        } catch (err) {
          console.log('Communication logs not available');
        }
      }
    };

    if (patientId && (activeTab === 'notes' || activeTab === 'consents' || activeTab === 'communication')) {
      fetchNotesAndConsents();
    }
  }, [activeTab, patientId]);

  // Loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <span className="ml-3 text-lg text-gray-600">Loading patient data...</span>
        </div>
      </DashboardLayout>
    );
  }

  // Patient not found
  if (!patient) {
    return (
      <DashboardLayout>
        <div className="flex h-96 flex-col items-center justify-center">
          <User className="h-16 w-16 text-gray-400" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Patient Not Found</h2>
          <p className="mt-2 text-gray-500">The requested patient could not be found.</p>
          <Link href="/provider/patients">
            <Button className="mt-4">Back to Patients</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const patientAge = calculateAge(patient.dateOfBirth);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/provider/patients">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Patients
            </Button>
          </Link>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="lg:w-80">
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-10 w-10" />
                </div>
                <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                  {patient.firstName} {patient.lastName}
                </h1>
                <p className="text-gray-500">{patientAge > 0 ? `${patientAge} years old` : 'Age unknown'}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {(patient.conditions || []).map((c) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
              </div>

              <div className="my-6 flex justify-center">
                <RiskScoreGauge score={riskScore} size={150} />
              </div>

              <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{patient.email}</span>
                </div>
                {patient.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{patient.phone}</span>
                  </div>
                )}
                {patient.createdAt && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Enrolled: {new Date(patient.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button className="flex-1" size="sm" onClick={handleMessagePatient}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Message
                </Button>
                <Button variant="outline" className="flex-1" size="sm" onClick={handleCallPatient}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6 min-w-0">
            {/* Tab Navigation - Wrapping Grid Layout */}
            <div className="rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
              <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300'
                    )}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span className="text-center leading-tight">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-6">
                {alerts.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-400">{alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}</p>
                        <p className="text-sm text-red-600 dark:text-red-500">
                          {alerts.slice(0, 2).map(a => a.title || a.message).join(' • ')}
                        </p>
                      </div>
                      <Button size="sm" className="ml-auto bg-red-600 hover:bg-red-700" onClick={handleReviewAlerts}>
                        Review Alerts
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Latest Readings</h2>
                  {vitals.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {vitals.map((vital) => (
                        <VitalSignCard key={vital.type} {...vital} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
                      <Activity className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-4 text-gray-500">No vital readings available yet.</p>
                    </div>
                  )}
                </div>

                {trendData.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">30-Day BP Trend</h2>
                    <MultiLineChart
                      data={trendData}
                      xKey="date"
                      lines={[
                        { key: 'systolic', label: 'Systolic', color: '#EF4444' },
                        { key: 'diastolic', label: 'Diastolic', color: '#3B82F6' },
                      ]}
                      height={250}
                    />
                  </div>
                )}

                {insights.length > 0 && <AIInsightsPanel insights={insights} />}
              </div>
            )}

            {activeTab === 'vitals' && (
              <div className="space-y-6">
                {trendData.length > 0 ? (
                  <>
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                      <h2 className="mb-4 text-lg font-semibold">Blood Pressure History</h2>
                      <TrendChart
                        data={trendData}
                        xKey="date"
                        yKey="systolic"
                        height={300}
                        normalRange={{ min: 90, max: 140 }}
                      />
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                      <h2 className="mb-4 text-lg font-semibold">Weight History</h2>
                      <TrendChart
                        data={trendData}
                        xKey="date"
                        yKey="weight"
                        height={300}
                        color="#10B981"
                      />
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
                    <Activity className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-gray-500">No vitals history available yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'devices' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Patient Devices</h2>
                  <Button variant="outline" size="sm" onClick={fetchDevices} disabled={devicesLoading}>
                    <RefreshCw className={cn('mr-2 h-4 w-4', devicesLoading && 'animate-spin')} />
                    Refresh
                  </Button>
                </div>

                {devicesLoading ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading devices...</span>
                  </div>
                ) : devices.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
                    <Smartphone className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No devices assigned</h3>
                    <p className="mt-2 text-gray-500">This patient has no Tenovi devices assigned.</p>
                    <Button className="mt-4">Assign Device</Button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {devices.map((device) => {
                      const deviceInfo = sensorCodeToType[device.sensorCode || ''] || { name: device.deviceName || 'Device', icon: '📱' };
                      const isConnected = device.status === 'connected' || device.status === 'active';
                      const isSyncing = syncingDevice === device.hwiDeviceId;

                      return (
                        <div
                          key={device.id}
                          className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{deviceInfo.icon}</span>
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">{deviceInfo.name}</h3>
                                <p className="text-sm text-gray-500">{device.modelNumber || device.hwiDeviceId}</p>
                              </div>
                            </div>
                            <Badge variant={isConnected ? 'success' : 'secondary'}>
                              {isConnected ? <><Wifi className="mr-1 h-3 w-3" />Active</> : <><WifiOff className="mr-1 h-3 w-3" />Offline</>}
                            </Badge>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-500">Last Reading</p>
                              <p className="font-medium">{device.lastMeasurement ? new Date(device.lastMeasurement).toLocaleString() : 'Never'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Status</p>
                              <p className="font-medium capitalize">{device.status}</p>
                            </div>
                            {device.shippingStatus && (
                              <div className="col-span-2">
                                <p className="text-gray-500">Shipping</p>
                                <p className="font-medium">{device.shippingStatus === 'DE' ? 'Delivered' : device.shippingStatus}</p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleSyncDevice(device.hwiDeviceId)} disabled={isSyncing}>
                              <RefreshCw className={cn('mr-1 h-3 w-3', isSyncing && 'animate-spin')} />
                              {isSyncing ? 'Syncing...' : 'Sync'}
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleUnassignDevice(device.hwiDeviceId)}>
                              Unassign
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'insights' && (
              insights.length > 0 ? (
                <AIInsightsPanel insights={insights} className="border-0 bg-transparent" />
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
                  <Activity className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No AI Insights Available</h3>
                  <p className="mt-2 text-gray-500">AI insights will appear here once enough data is collected.</p>
                </div>
              )
            )}

            {activeTab === 'care-plan' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Care Plan</h2>
                  {!editingCarePlan ? (
                    <Button variant="outline" size="sm" onClick={handleEditCarePlan}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit Care Plan
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveCarePlan} disabled={savingCarePlan}>
                        <Save className="mr-2 h-4 w-4" />
                        {savingCarePlan ? 'Saving...' : 'Save'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingCarePlan(false)}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
                
                {editingCarePlan ? (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">Goals</h3>
                        <Button variant="ghost" size="sm" onClick={handleAddGoal}>
                          <Plus className="mr-1 h-4 w-4" />
                          Add Goal
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {editedCarePlan.goals.map((goal, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              value={goal}
                              onChange={(e) => {
                                const newGoals = [...editedCarePlan.goals];
                                newGoals[i] = e.target.value;
                                setEditedCarePlan(prev => ({ ...prev, goals: newGoals }));
                              }}
                              placeholder="Enter goal..."
                            />
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveGoal(i)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                        {editedCarePlan.goals.length === 0 && (
                          <p className="text-sm text-gray-500">No goals yet. Click "Add Goal" to create one.</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">Interventions</h3>
                        <Button variant="ghost" size="sm" onClick={handleAddIntervention}>
                          <Plus className="mr-1 h-4 w-4" />
                          Add Intervention
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {editedCarePlan.interventions.map((intervention, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              value={intervention}
                              onChange={(e) => {
                                const newInterventions = [...editedCarePlan.interventions];
                                newInterventions[i] = e.target.value;
                                setEditedCarePlan(prev => ({ ...prev, interventions: newInterventions }));
                              }}
                              placeholder="Enter intervention..."
                            />
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveIntervention(i)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                        {editedCarePlan.interventions.length === 0 && (
                          <p className="text-sm text-gray-500">No interventions yet. Click "Add Intervention" to create one.</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Notes</h3>
                      <textarea
                        className="w-full rounded-lg border border-gray-300 p-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                        rows={4}
                        value={editedCarePlan.notes}
                        onChange={(e) => setEditedCarePlan(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Enter care plan notes..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Goals</h3>
                      {carePlan.goals.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {carePlan.goals.map((goal, i) => (
                            <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                              {goal}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-gray-500">No goals defined yet.</p>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Interventions</h3>
                      {carePlan.interventions.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {carePlan.interventions.map((intervention, i) => (
                            <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                              <Activity className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                              {intervention}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-gray-500">No interventions defined yet.</p>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Notes</h3>
                      <p className="mt-2 text-gray-600 dark:text-gray-400">
                        {carePlan.notes || 'No notes available.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'medications' && (
              <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                  <h2 className="text-lg font-semibold">Current Medications</h2>
                  <Button size="sm" onClick={() => setShowAddMedication(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Medication
                  </Button>
                </div>
                
                {showAddMedication && (
                  <div className="border-b border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
                    <h3 className="mb-4 font-medium">Add New Medication</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        placeholder="Medication name *"
                        value={newMedication.name}
                        onChange={(e) => setNewMedication(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <Input
                        placeholder="Dosage (e.g., 10mg) *"
                        value={newMedication.dosage}
                        onChange={(e) => setNewMedication(prev => ({ ...prev, dosage: e.target.value }))}
                      />
                      <Input
                        placeholder="Frequency (e.g., Once daily)"
                        value={newMedication.frequency}
                        onChange={(e) => setNewMedication(prev => ({ ...prev, frequency: e.target.value }))}
                      />
                      <Input
                        placeholder="Notes (optional)"
                        value={newMedication.notes}
                        onChange={(e) => setNewMedication(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" onClick={handleAddMedication} disabled={savingMedication}>
                        {savingMedication ? 'Adding...' : 'Add Medication'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setShowAddMedication(false);
                        setNewMedication({ name: '', dosage: '', frequency: '', notes: '' });
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                {medications.length > 0 ? (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {medications.map((med) => (
                      <div key={med.id} className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <Pill className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{med.name}</p>
                            <p className="text-sm text-gray-500">{med.dosage} • {med.frequency}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {med.notes && <Badge variant="secondary">{med.notes}</Badge>}
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteMedication(med.id)} title="Remove medication">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Pill className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-gray-500">No medications recorded.</p>
                    <Button className="mt-4" onClick={() => setShowAddMedication(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Medication
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Clinical Notes</h2>
                  <Button size="sm" onClick={() => setShowAddNote(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Note
                  </Button>
                </div>

                {showAddNote && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
                    <h3 className="mb-4 font-medium">New Clinical Note</h3>
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          placeholder="Note title *"
                          value={newNote.title}
                          onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                        />
                        <select
                          title="Note Type"
                          aria-label="Note Type"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                          value={newNote.type}
                          onChange={(e) => setNewNote(prev => ({ ...prev, type: e.target.value }))}
                        >
                          <option value="progress">Progress Note</option>
                          <option value="soap">SOAP Note</option>
                          <option value="vital_review">Vital Review</option>
                          <option value="phone_call">Phone Call</option>
                          <option value="telehealth">Telehealth</option>
                          <option value="medication_review">Medication Review</option>
                        </select>
                      </div>
                      <textarea
                        className="w-full rounded-lg border border-gray-300 p-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                        rows={5}
                        placeholder="Enter note content..."
                        value={newNote.content}
                        onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                      />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" onClick={handleCreateNote} disabled={savingNote}>
                        {savingNote ? 'Saving...' : 'Save as Draft'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setShowAddNote(false);
                        setNewNote({ title: '', content: '', type: 'progress' });
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {clinicalNotes.length > 0 ? (
                  <div className="space-y-4">
                    {clinicalNotes.map((note) => (
                      <div key={note.id} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{note.title}</h3>
                              <Badge variant={note.status === 'signed' ? 'success' : 'secondary'}>
                                {note.status === 'signed' ? 'Signed' : 'Draft'}
                              </Badge>
                              <Badge variant="outline">{note.type.replace('_', ' ')}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                              {note.provider?.firstName} {note.provider?.lastName} • {new Date(note.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {note.status === 'draft' && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleSignNote(note.id)} title="Sign note">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteNote(note.id)} title="Delete note">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="mt-3 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{note.content}</p>
                        {note.timeTracking && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>{note.timeTracking.totalMinutes} minutes documented</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
                    <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Clinical Notes</h3>
                    <p className="mt-2 text-gray-500">Document patient encounters and progress notes here.</p>
                    <Button className="mt-4" onClick={() => setShowAddNote(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Note
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'consents' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Patient Consents</h2>
                  <Button size="sm" onClick={() => setShowRequestConsent(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Request Consent
                  </Button>
                </div>

                {showRequestConsent && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
                    <h3 className="mb-4 font-medium">Request Patient Consent</h3>
                    <div className="space-y-4">
                      <select
                        title="Consent Type"
                        aria-label="Consent Type"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                        value={selectedConsentTemplate}
                        onChange={(e) => setSelectedConsentTemplate(e.target.value)}
                      >
                        <option value="">Select consent type...</option>
                        {consentTemplates.map((template) => (
                          <option key={template.id} value={template.id}>{template.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" onClick={handleRequestConsent}>
                        Send Request
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setShowRequestConsent(false);
                        setSelectedConsentTemplate('');
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {consents.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {consents.map((consent) => (
                      <div key={consent.id} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'rounded-lg p-2',
                              consent.status === 'signed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                            )}>
                              <FileSignature className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">{consent.template?.name || consent.type}</h3>
                              {consent.signedAt && (
                                <p className="text-sm text-gray-500">Signed {new Date(consent.signedAt).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant={consent.status === 'signed' ? 'success' : 'warning'}>
                            {consent.status === 'signed' ? 'Active' : 'Pending'}
                          </Badge>
                        </div>
                        {consent.expiresAt && (
                          <p className="mt-3 text-sm text-gray-500">
                            Expires: {new Date(consent.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewConsent(consent.id)}>
                            View
                          </Button>
                          {consent.status === 'pending' && (
                            <Button size="sm" className="flex-1" onClick={() => handleSendReminder(consent.id)}>
                              Send Reminder
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
                    <FileSignature className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Consents</h3>
                    <p className="mt-2 text-gray-500">Request patient consent to get started.</p>
                    <Button className="mt-4" onClick={() => setShowRequestConsent(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Request First Consent
                    </Button>
                  </div>
                )}

                {viewingConsent && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-900">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">{viewingConsent.template?.name || viewingConsent.type}</h3>
                        <Button variant="ghost" size="sm" onClick={() => setViewingConsent(null)}>
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={viewingConsent.status === 'signed' ? 'success' : 'warning'}>
                            {viewingConsent.status === 'signed' ? 'Signed' : 'Pending'}
                          </Badge>
                          {viewingConsent.signedAt && (
                            <span className="text-sm text-gray-500">
                              Signed on {new Date(viewingConsent.signedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {viewingConsent.consentContent ? (
                          <div 
                            className="prose dark:prose-invert max-w-none text-sm"
                            dangerouslySetInnerHTML={{ __html: viewingConsent.consentContent }}
                          />
                        ) : (
                          <p className="text-gray-500 italic">No consent content available.</p>
                        )}
                        {viewingConsent.template?.summary && (
                          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <strong>Summary:</strong> {viewingConsent.template.summary}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-6 flex justify-end gap-2">
                        {viewingConsent.status === 'pending' && (
                          <Button onClick={() => {
                            handleSendReminder(viewingConsent.id);
                            setViewingConsent(null);
                          }}>
                            Send Reminder
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => setViewingConsent(null)}>Close</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'communication' && (
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleMessagePatient}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send Message
                    </Button>
                    <Button variant="outline" onClick={handleCallPatient}>
                      <Phone className="mr-2 h-4 w-4" />
                      Log Call
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddCommunication(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Log Communication
                    </Button>
                  </div>
                </div>

                {/* Add Communication Form */}
                {showAddCommunication && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                    <h3 className="mb-4 text-lg font-semibold">Log Communication</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                        <select
                          value={newCommunication.type}
                          onChange={(e) => setNewCommunication(prev => ({ ...prev, type: e.target.value as typeof prev.type }))}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                        >
                          <option value="call">Phone Call</option>
                          <option value="message">Message</option>
                          <option value="video">Video Call</option>
                          <option value="email">Email</option>
                          <option value="sms">SMS</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summary</label>
                        <textarea
                          value={newCommunication.summary}
                          onChange={(e) => setNewCommunication(prev => ({ ...prev, summary: e.target.value }))}
                          placeholder="Brief summary of the communication..."
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                        />
                      </div>
                      {(newCommunication.type === 'call' || newCommunication.type === 'video') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (minutes)</label>
                          <Input
                            type="number"
                            value={newCommunication.durationMinutes}
                            onChange={(e) => setNewCommunication(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 0 }))}
                            min={0}
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button onClick={handleCreateCommunicationLog} disabled={savingCommunication}>
                          {savingCommunication ? 'Saving...' : 'Save Log'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddCommunication(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Communication History */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <h2 className="mb-4 text-lg font-semibold">Communication History</h2>
                  {communicationLogs.length > 0 ? (
                    <div className="space-y-4">
                      {communicationLogs.map((log) => (
                        <div key={log.id} className="flex gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                          <div className={cn(
                            'rounded-full p-2 flex-shrink-0',
                            log.type === 'message' && 'bg-blue-100 text-blue-600',
                            log.type === 'call' && 'bg-green-100 text-green-600',
                            log.type === 'video' && 'bg-purple-100 text-purple-600',
                            log.type === 'email' && 'bg-cyan-100 text-cyan-600',
                            log.type === 'sms' && 'bg-orange-100 text-orange-600',
                            log.type === 'alert' && 'bg-red-100 text-red-600',
                          )}>
                            {log.type === 'message' && <MessageSquare className="h-4 w-4" />}
                            {log.type === 'call' && <Phone className="h-4 w-4" />}
                            {log.type === 'video' && <Activity className="h-4 w-4" />}
                            {log.type === 'email' && <Mail className="h-4 w-4" />}
                            {log.type === 'sms' && <MessageSquare className="h-4 w-4" />}
                            {log.type === 'alert' && <AlertTriangle className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-gray-500">
                                {new Date(log.createdAt).toLocaleDateString()} • {log.provider?.firstName} {log.provider?.lastName}
                              </p>
                              {log.durationMinutes && (
                                <Badge variant="secondary" className="text-xs">{log.durationMinutes} min</Badge>
                              )}
                            </div>
                            <p className="text-gray-900 dark:text-white mt-1">{log.summary}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Communication History</h3>
                      <p className="mt-2 text-gray-500">Log your first communication to get started.</p>
                      <Button className="mt-4" onClick={() => setShowAddCommunication(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Log Communication
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
