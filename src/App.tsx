import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AppointmentsView } from './components/AppointmentsView';
import { PatientsView } from './components/PatientsView';
import { TriageView } from './components/TriageView';
import { TeleconsultView } from './components/TeleconsultView';
import { NotificationsView } from './components/NotificationsView';
import { AnalyticsFhirView } from './components/AnalyticsFhirView';
import { BookingModal } from './components/BookingModal';
import { TriageIntakeModal } from './components/TriageIntakeModal';
import {
  fetchClinicalState,
  resetDemoData,
  createAppointment,
  updateAppointment,
  createPatient,
  createTriageRecord,
  updateTriageRecord,
  dispatchNotification,
  updateNotificationStatus,
  saveConsultationSession,
  ClinicalStateResponse,
} from './utils/api';
import {
  Appointment,
  AppointmentStatus,
  Patient,
  TriageRecord,
  NotificationLog,
  ConsultationSession,
} from './types';

export default function App() {
  const [state, setState] = useState<ClinicalStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>('appointments');
  const [activeRole, setActiveRole] = useState<string>('Coordinator');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal & cross-tab selection state
  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselectedDoctorId, setPreselectedDoctorId] = useState<string | null>(null);
  const [preselectedPatientId, setPreselectedPatientId] = useState<string | null>(null);
  const [triageModalOpen, setTriageModalOpen] = useState(false);
  const [selectedTeleconsultAptId, setSelectedTeleconsultAptId] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Initial load from Express persistence API
  useEffect(() => {
    let active = true;
    fetchClinicalState()
      .then((data) => {
        if (active) {
          setState(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || 'Unable to connect to CarePulse clinical server.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const tabTitles: Record<string, string> = {
    appointments: 'Clinical Schedule & Slot Synchronization',
    patients: 'Patient Orchestration & Master Index',
    triage: 'Emergency Tele-Triage Command',
    teleconsult: 'Virtual Clinic Room & E-Prescribing',
    notifications: 'Multi-Channel Notification Engine',
    analytics: 'HL7 FHIR R4 & HIPAA Audit Trail',
  };

  const pendingTriageCount = useMemo(() => {
    if (!state) return 0;
    return state.triageRecords.filter((t) => t.status !== 'discharged').length;
  }, [state]);

  const unconfirmedNotifCount = useMemo(() => {
    if (!state) return 0;
    return state.notifications.filter((n) => n.deliveryStatus === 'dispatched' || n.deliveryStatus === 'delivered').length;
  }, [state]);

  // Handlers
  const handleUpdateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    const updated = await updateAppointment(id, { status }, activeRole);
    setState(updated);
    showToast(`Appointment status updated to ${status.replace('_', ' ')}`);
  };

  const handleSubmitBooking = async (apt: Partial<Appointment>) => {
    const updated = await createAppointment(apt, activeRole);
    setState(updated);
    showToast('Appointment booked and automated patient reminder dispatched');
  };

  const handleQuickReminder = async (apt: Appointment) => {
    if (!state) return;
    const patient = state.patients.find((p) => p.id === apt.patientId);
    const doctor = state.doctors.find((d) => d.id === apt.doctorId);
    if (!patient || !doctor) return;

    const updated = await dispatchNotification({
      appointmentId: apt.id,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      recipientContact: apt.reminderChannel === 'email' ? patient.email : patient.phone,
      channel: apt.reminderChannel,
      templateType: apt.visitType === 'teleconsult' ? '2h_teleconsult_link' : '24h_reminder',
      messageBody: `CarePulse Reminder: Your visit with ${doctor.name} is scheduled for ${apt.appointmentDate} at ${apt.startTime}. Reply 1 to CONFIRM or 2 to RESCHEDULE.`,
      deliveryStatus: 'dispatched',
    });
    setState(updated);
    showToast(`Reminder dispatched via ${apt.reminderChannel.toUpperCase()} to ${patient.firstName}`);
  };

  const handleCreatePatient = async (patient: Partial<Patient>) => {
    const updated = await createPatient(patient, activeRole);
    setState(updated);
    showToast(`Patient ${patient.firstName} ${patient.lastName} registered in FHIR R4 index`);
  };

  const handleSubmitTriage = async (record: Partial<TriageRecord>) => {
    const updated = await createTriageRecord(record, activeRole);
    setState(updated);
    setActiveTab('triage');
    showToast(`Triage intake recorded (ESI Level ${record.esiLevel})`);
  };

  const handleUpdateTriage = async (id: string, updates: Partial<TriageRecord>) => {
    const updated = await updateTriageRecord(id, updates, activeRole);
    setState(updated);
    showToast('Triage workflow updated');
  };

  const handleDispatchNotification = async (notif: Partial<NotificationLog>) => {
    const updated = await dispatchNotification(notif);
    setState(updated);
    showToast(`Alert transmitted via ${(notif.channel || 'SMS').toUpperCase()}`);
  };

  const handleSimulatePatientReply = async (id: string, confirmed: boolean) => {
    const updated = await updateNotificationStatus(id, {
      deliveryStatus: confirmed ? 'confirmed' : 'read',
      responsePayload: confirmed
        ? `Patient replied "1 - CONFIRM" at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Appointment status synced.`
        : `Patient replied "2 - RESCHEDULE" at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Front desk follow-up queued.`,
    });
    setState(updated);
    showToast(confirmed ? 'Patient confirmed attendance — schedule synced' : 'Patient requested reschedule');
  };

  const handleSaveConsultation = async (session: ConsultationSession) => {
    const updated = await saveConsultationSession(session);
    setState(updated);
    showToast(
      session.doctorSignatureTimestamp
        ? 'Consultation signed and visit completed'
        : 'Consultation draft saved'
    );
  };

  const handleResetDemo = async () => {
    const fresh = await resetDemoData();
    setState(fresh);
    showToast('Restored initial CarePulse clinical dataset');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
        <div className="hidden lg:block w-64 border-r border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="space-y-2 pt-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-9 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6 space-y-6">
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
          <h1 className="text-lg font-bold text-white">Clinical Server Unavailable</h1>
          <p className="text-sm text-slate-400">{error || 'Unable to load CarePulse state.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        pendingTriageCount={pendingTriageCount}
        unconfirmedCount={unconfirmedNotifCount}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onResetDemo={handleResetDemo}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeTabLabel={tabTitles[activeTab] || 'Clinical Workspace'}
          activeRole={activeRole}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenBooking={() => {
            setPreselectedDoctorId(null);
            setPreselectedPatientId(null);
            setBookingOpen(true);
          }}
          onOpenQuickTriage={() => setTriageModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'appointments' && (
            <AppointmentsView
              appointments={state.appointments}
              doctors={state.doctors}
              patients={state.patients}
              onUpdateStatus={handleUpdateAppointmentStatus}
              onOpenTeleconsult={(aptId) => {
                setSelectedTeleconsultAptId(aptId);
                setActiveTab('teleconsult');
              }}
              onQuickReminder={handleQuickReminder}
              onOpenBookingWithDoctor={(docId) => {
                setPreselectedDoctorId(docId);
                setPreselectedPatientId(null);
                setBookingOpen(true);
              }}
            />
          )}

          {activeTab === 'patients' && (
            <PatientsView
              patients={state.patients}
              appointments={state.appointments}
              onCreatePatient={handleCreatePatient}
              onBookForPatient={(patId) => {
                setPreselectedPatientId(patId);
                setPreselectedDoctorId(null);
                setBookingOpen(true);
              }}
            />
          )}

          {activeTab === 'triage' && (
            <TriageView
              triageRecords={state.triageRecords}
              doctors={state.doctors}
              onUpdateTriage={handleUpdateTriage}
              onOpenNewTriage={() => setTriageModalOpen(true)}
            />
          )}

          {activeTab === 'teleconsult' && (
            <TeleconsultView
              appointments={state.appointments}
              patients={state.patients}
              doctors={state.doctors}
              consultations={state.consultations}
              selectedAppointmentId={selectedTeleconsultAptId}
              onSelectAppointment={setSelectedTeleconsultAptId}
              onSaveConsultation={handleSaveConsultation}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView
              notifications={state.notifications}
              appointments={state.appointments}
              patients={state.patients}
              doctors={state.doctors}
              onDispatchNotification={handleDispatchNotification}
              onSimulatePatientReply={handleSimulatePatientReply}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsFhirView
              patients={state.patients}
              appointments={state.appointments}
              doctors={state.doctors}
              triageRecords={state.triageRecords}
              auditLogs={state.auditLogs}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        patients={state.patients}
        doctors={state.doctors}
        existingAppointments={state.appointments}
        preselectedDoctorId={preselectedDoctorId}
        preselectedPatientId={preselectedPatientId}
        onSubmitBooking={handleSubmitBooking}
      />

      <TriageIntakeModal
        isOpen={triageModalOpen}
        onClose={() => setTriageModalOpen(false)}
        patients={state.patients}
        doctors={state.doctors}
        onSubmitTriage={handleSubmitTriage}
      />

      {/* Action Confirmation Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 shadow-lg text-xs font-medium"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
