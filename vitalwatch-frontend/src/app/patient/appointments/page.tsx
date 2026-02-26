'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  Plus, 
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { VideoCall } from '@/components/video/VideoCall';
import { webrtcClient, CallType, IncomingCallData } from '@/lib/webrtc';

interface Appointment {
  id: string;
  title: string;
  provider: string;
  providerTitle: string;
  date: string;
  time: string;
  duration: number;
  type: 'video' | 'in-person' | 'phone';
  status: 'upcoming' | 'completed' | 'cancelled';
  location?: string;
  notes?: string;
}

const mockAppointments: Appointment[] = [
  {
    id: '1',
    title: 'Follow-up Visit',
    provider: 'Dr. Sarah Smith',
    providerTitle: 'Cardiologist',
    date: '2026-01-20',
    time: '10:00 AM',
    duration: 30,
    type: 'video',
    status: 'upcoming',
    notes: 'Review blood pressure trends and medication effectiveness',
  },
  {
    id: '2',
    title: 'Annual Physical',
    provider: 'Dr. Michael Johnson',
    providerTitle: 'Primary Care',
    date: '2026-01-25',
    time: '2:00 PM',
    duration: 60,
    type: 'in-person',
    status: 'upcoming',
    location: '123 Medical Center Dr, Suite 200',
  },
  {
    id: '3',
    title: 'Lab Results Review',
    provider: 'Dr. Sarah Smith',
    providerTitle: 'Cardiologist',
    date: '2026-01-10',
    time: '11:00 AM',
    duration: 15,
    type: 'phone',
    status: 'completed',
  },
];

export default function PatientAppointmentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [saving, setSaving] = useState(false);

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    provider: '',
    date: '',
    time: '',
    type: 'video' as 'video' | 'in-person' | 'phone',
  });

  // Reschedule form state
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '' });

  const handleScheduleAppointment = async () => {
    if (!scheduleForm.title || !scheduleForm.date || !scheduleForm.time || saving) return;
    setSaving(true);
    try {
      const newAppointment: Appointment = {
        id: `new-${Date.now()}`,
        title: scheduleForm.title,
        provider: scheduleForm.provider || 'Dr. Sarah Smith',
        providerTitle: 'Primary Care',
        date: scheduleForm.date,
        time: scheduleForm.time,
        duration: 30,
        type: scheduleForm.type,
        status: 'upcoming',
      };
      setAppointments((prev) => [newAppointment, ...prev]);
      setShowScheduleModal(false);
      setScheduleForm({ title: '', provider: '', date: '', time: '', type: 'video' });
      toast({ title: 'Appointment scheduled', description: 'Your appointment has been scheduled successfully', type: 'success' });
    } finally {
      setSaving(false);
    }
  };

  const handleRescheduleAppointment = async () => {
    if (!selectedAppointment || !rescheduleForm.date || !rescheduleForm.time || saving) return;
    setSaving(true);
    try {
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === selectedAppointment.id
            ? { ...apt, date: rescheduleForm.date, time: rescheduleForm.time }
            : apt
        )
      );
      setShowRescheduleModal(false);
      setShowDetails(false);
      toast({ title: 'Appointment rescheduled', description: 'Your appointment has been rescheduled', type: 'success' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === selectedAppointment.id ? { ...apt, status: 'cancelled' } : apt
      )
    );
    setShowCancelDialog(false);
    setShowDetails(false);
  };

  const handleJoinVideoCall = useCallback((apt: Appointment) => {
    if (apt.type === 'video') {
      toast({ title: 'Joining video call', description: `Connecting to ${apt.provider}...`, type: 'info' });
    }
  }, [toast]);

  const handleSendMessage = useCallback((apt: Appointment) => {
    router.push(`/patient/messages?provider=${encodeURIComponent(apt.provider)}`);
  }, [router]);

  const openRescheduleModal = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setRescheduleForm({ date: apt.date, time: apt.time.replace(' AM', '').replace(' PM', '') });
    setShowRescheduleModal(true);
  };

  const upcomingAppointments = appointments.filter((a) => a.status === 'upcoming');
  const pastAppointments = appointments.filter((a) => a.status === 'completed' || a.status === 'cancelled');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return 'Video Call';
      case 'phone':
        return 'Phone Call';
      default:
        return 'In-Person';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Appointments</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your upcoming and past appointments
            </p>
          </div>
          <Button onClick={() => setShowScheduleModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Appointment
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upcoming Appointments
                </h2>
              </div>
              {upcomingAppointments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No upcoming appointments
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setShowDetails(true);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <span className="text-xs font-medium">
                            {new Date(apt.date).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold">
                            {new Date(apt.date).getDate()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{apt.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {apt.provider} • {apt.providerTitle}
                          </p>
                          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {apt.time}
                            </span>
                            <span className="flex items-center gap-1">
                              {getTypeIcon(apt.type)}
                              {getTypeLabel(apt.type)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {apt.type === 'video' && (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); handleJoinVideoCall(apt); }}>
                            <Video className="mr-2 h-4 w-4" />
                            Join
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleSendMessage(apt); }}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Message
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Past Appointments
                </h2>
              </div>
              {pastAppointments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No past appointments
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {pastAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setShowDetails(true);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          <span className="text-xs font-medium">
                            {new Date(apt.date).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold">
                            {new Date(apt.date).getDate()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{apt.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {apt.provider} • {apt.providerTitle}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                  className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                  className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="py-2 font-medium text-gray-500">
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, i) => {
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i - new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() + 1);
                const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                const hasAppointment = appointments.some(
                  (a) => new Date(a.date).toDateString() === date.toDateString()
                );
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={i}
                    className={`relative py-2 ${
                      isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'
                    } ${isToday ? 'rounded-lg bg-primary text-white' : ''}`}
                  >
                    {date.getDate()}
                    {hasAppointment && (
                      <div className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <Modal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="Appointment Details"
          size="md"
        >
          {selectedAppointment && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedAppointment.title}
                </h3>
                <Badge variant={selectedAppointment.status === 'upcoming' ? 'info' : 'secondary'} className="mt-1">
                  {selectedAppointment.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Provider</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedAppointment.provider}</p>
                  <p className="text-sm text-gray-500">{selectedAppointment.providerTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date & Time</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(selectedAppointment.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedAppointment.time} ({selectedAppointment.duration} min)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                    {getTypeIcon(selectedAppointment.type)}
                    {getTypeLabel(selectedAppointment.type)}
                  </p>
                </div>
                {selectedAppointment.location && (
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedAppointment.location}</p>
                  </div>
                )}
              </div>

              {selectedAppointment.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-900 dark:text-white">{selectedAppointment.notes}</p>
                </div>
              )}

              {selectedAppointment.status === 'upcoming' && (
                <div className="flex gap-3 pt-4">
                  {selectedAppointment.type === 'video' && (
                    <Button className="flex-1" onClick={() => handleJoinVideoCall(selectedAppointment)}>
                      <Video className="mr-2 h-4 w-4" />
                      Join Video Call
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1" onClick={() => openRescheduleModal(selectedAppointment)}>
                    Reschedule
                  </Button>
                  <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => setShowCancelDialog(true)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>

        <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Schedule Appointment" size="md">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Appointment Title</label>
              <Input
                placeholder="e.g., Follow-up Visit"
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Time</label>
                <Input
                  type="time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Appointment Type</label>
              <Select
                options={[
                  { value: 'video', label: 'Video Call' },
                  { value: 'in-person', label: 'In-Person' },
                  { value: 'phone', label: 'Phone Call' },
                ]}
                value={scheduleForm.type}
                onChange={(val) => setScheduleForm({ ...scheduleForm, type: val as 'video' | 'in-person' | 'phone' })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
              <Button onClick={handleScheduleAppointment} disabled={saving || !scheduleForm.title || !scheduleForm.date || !scheduleForm.time}>
                {saving ? 'Scheduling...' : 'Schedule'}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={showRescheduleModal} onClose={() => setShowRescheduleModal(false)} title="Reschedule Appointment" size="md">
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Rescheduling: {selectedAppointment?.title}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">New Date</label>
                <Input
                  type="date"
                  value={rescheduleForm.date}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">New Time</label>
                <Input
                  type="time"
                  value={rescheduleForm.time}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, time: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowRescheduleModal(false)}>Cancel</Button>
              <Button onClick={handleRescheduleAppointment} disabled={saving || !rescheduleForm.date || !rescheduleForm.time}>
                {saving ? 'Rescheduling...' : 'Confirm Reschedule'}
              </Button>
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={showCancelDialog}
          onClose={() => setShowCancelDialog(false)}
          onConfirm={handleCancelAppointment}
          title="Cancel Appointment"
          message={`Are you sure you want to cancel your appointment "${selectedAppointment?.title}" with ${selectedAppointment?.provider}?`}
          confirmText="Cancel Appointment"
          variant="danger"
        />
      </div>
    </DashboardLayout>
  );
}
