import React, { useState, useEffect, useMemo } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Sparkles,
  FileCheck2,
  Pill,
  Plus,
  Trash2,
  ShieldAlert,
  Activity,
  Save,
} from 'lucide-react';
import {
  Appointment,
  Patient,
  Doctor,
  ConsultationSession,
  PrescriptionItem,
  SoapNote,
} from '../types';
import { requestGeminiAssist } from '../utils/api';

interface TeleconsultViewProps {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  consultations: ConsultationSession[];
  selectedAppointmentId: string | null;
  onSelectAppointment: (id: string) => void;
  onSaveConsultation: (session: ConsultationSession) => Promise<void>;
}

export const TeleconsultView: React.FC<TeleconsultViewProps> = ({
  appointments,
  patients,
  doctors,
  consultations,
  selectedAppointmentId,
  onSelectAppointment,
  onSaveConsultation,
}) => {
  const activeAppointments = useMemo(
    () => appointments.filter((a) => a.status !== 'cancelled'),
    [appointments]
  );

  const currentApt = useMemo(() => {
    if (selectedAppointmentId) {
      const found = activeAppointments.find((a) => a.id === selectedAppointmentId);
      if (found) return found;
    }
    return (
      activeAppointments.find((a) => a.visitType === 'teleconsult') ||
      activeAppointments[0] ||
      null
    );
  }, [activeAppointments, selectedAppointmentId]);

  const patient = useMemo(
    () => patients.find((p) => p.id === currentApt?.patientId) || null,
    [patients, currentApt]
  );

  const doctor = useMemo(
    () => doctors.find((d) => d.id === currentApt?.doctorId) || null,
    [doctors, currentApt]
  );

  // Room hardware states
  const [callActive, setCallActive] = useState(true);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [sharingEcg, setSharingEcg] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(248);

  // Documentation panel state
  const [docTab, setDocTab] = useState<'soap' | 'rx'>('soap');
  const [soap, setSoap] = useState<SoapNote>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [vitalsSnapshot, setVitalsSnapshot] = useState({
    heartRate: 74,
    bloodPressure: '126/82',
    spo2: 99,
    temperature: 98.6,
    respiratoryRate: 16,
  });

  // New Rx input state
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFreq, setMedFreq] = useState('Once daily');
  const [medDuration, setMedDuration] = useState('30 days');
  const [medInstructions, setMedInstructions] = useState('');

  // AI states
  const [draftingSoap, setDraftingSoap] = useState(false);
  const [checkingDrugs, setCheckingDrugs] = useState(false);
  const [drugCheckResult, setDrugCheckResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Sync consultation record when appointment switches
  useEffect(() => {
    if (!currentApt) return;
    const existing = consultations.find((c) => c.appointmentId === currentApt.id);
    if (existing) {
      setSoap(existing.soapNote);
      setPrescriptions(existing.prescriptions);
      setVitalsSnapshot(existing.vitalsSnapshot);
    } else {
      setSoap({
        subjective: currentApt.reasonForVisit
          ? `Patient presents for ${currentApt.reasonForVisit.toLowerCase()}.`
          : '',
        objective: 'Alert, oriented x3. Home vitals telemetry reviewed and within baseline parameters.',
        assessment: '',
        plan: '',
      });
      setPrescriptions([]);
    }
    setDrugCheckResult(null);
    setSaveBanner(null);
  }, [currentApt, consultations]);

  // Live session timer
  useEffect(() => {
    if (!callActive) return;
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callActive]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleDraftSoapAi = async () => {
    if (!currentApt || !patient) return;
    setDraftingSoap(true);
    try {
      const res = await requestGeminiAssist('soap', {
        doctorName: doctor?.name,
        patientName: `${patient.firstName} ${patient.lastName}`,
        mrn: patient.mrn,
        history: soap.subjective || currentApt.reasonForVisit,
        exam: `HR ${vitalsSnapshot.heartRate} bpm, BP ${vitalsSnapshot.bloodPressure} mmHg, SpO2 ${vitalsSnapshot.spo2}%, Temp ${vitalsSnapshot.temperature}F. ${soap.objective}`,
        diagnosis: soap.assessment || currentApt.reasonForVisit,
        advice: soap.plan || prescriptions.map((r) => `${r.medicationName} ${r.dosage}`).join(', '),
      });

      try {
        const parsed = JSON.parse(res.content);
        if (parsed.subjective || parsed.objective || parsed.assessment || parsed.plan) {
          setSoap({
            subjective: parsed.subjective || soap.subjective,
            objective: parsed.objective || soap.objective,
            assessment: parsed.assessment || soap.assessment,
            plan: parsed.plan || soap.plan,
          });
        }
      } catch {
        setSoap((prev) => ({
          ...prev,
          plan: res.content,
        }));
      }
    } finally {
      setDraftingSoap(false);
    }
  };

  const handleAddPrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim() || !medDosage.trim()) return;
    const item: PrescriptionItem = {
      id: `rx-${Date.now()}`,
      medicationName: medName.trim(),
      dosage: medDosage.trim(),
      frequency: medFreq.trim(),
      duration: medDuration.trim(),
      instructions: medInstructions.trim() || 'Take as directed by physician.',
    };
    setPrescriptions((prev) => [...prev, item]);
    setMedName('');
    setMedDosage('');
    setMedInstructions('');
    setDrugCheckResult(null);
  };

  const handleRunDrugCheck = async () => {
    if (!patient || prescriptions.length === 0) return;
    setCheckingDrugs(true);
    try {
      const res = await requestGeminiAssist('drug_check', {
        allergies: patient.allergies,
        conditions: patient.chronicConditions,
        medications: prescriptions,
      });
      setDrugCheckResult(res.content);
    } finally {
      setCheckingDrugs(false);
    }
  };

  const handleSaveSession = async (signFinal: boolean) => {
    if (!currentApt || !patient || !doctor) return;
    setSaving(true);
    try {
      const existing = consultations.find((c) => c.appointmentId === currentApt.id);
      const session: ConsultationSession = {
        id: existing?.id || `ses-${Date.now()}`,
        appointmentId: currentApt.id,
        patientId: patient.id,
        doctorId: doctor.id,
        startTime: existing?.startTime || new Date().toISOString(),
        ...(signFinal ? { endTime: new Date().toISOString(), doctorSignatureTimestamp: new Date().toISOString() } : {}),
        soapNote: soap,
        prescriptions,
        vitalsSnapshot,
      };
      await onSaveConsultation(session);
      setSaveBanner(
        signFinal
          ? 'Consultation signed, FHIR Encounter sealed, and visit marked Completed.'
          : 'Clinical SOAP draft and e-prescriptions saved.'
      );
      if (signFinal) setCallActive(false);
    } finally {
      setSaving(false);
    }
  };

  if (!currentApt || !patient || !doctor) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
        <Video className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <div className="text-sm font-medium text-slate-900 dark:text-white">No Active Appointments Available</div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Book a consultation slot from the Clinical Schedule to launch the Virtual Clinic Room.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Room Selector Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Active Encounter:
          </div>
          <select
            value={currentApt.id}
            onChange={(e) => {
              onSelectAppointment(e.target.value);
              setCallActive(true);
            }}
            className="flex-1 md:w-96 px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            {activeAppointments.map((apt) => {
              const p = patients.find((x) => x.id === apt.patientId);
              const d = doctors.find((x) => x.id === apt.doctorId);
              return (
                <option key={apt.id} value={apt.id}>
                  {apt.startTime} · {p ? `${p.firstName} ${p.lastName}` : 'Patient'} with {d?.name} ({apt.visitType})
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-400 shrink-0">
          <span>Room: {currentApt.teleconsultRoomId || doctor.roomNumber}</span>
          <span>·</span>
          <span className="tabular-nums font-semibold text-teal-600 dark:text-teal-400">
            Elapsed {formatTimer(elapsedSeconds)}
          </span>
        </div>
      </div>

      {saveBanner && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{saveBanner}</span>
          <button onClick={() => setSaveBanner(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Split Teleconsultation Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Encrypted Teleconsultation Feed + Vitals HUD */}
        <div className="xl:col-span-6 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            {/* Viewport Stage */}
            <div className="relative aspect-video bg-slate-900 flex flex-col justify-between p-5">
              {/* Top Overlay */}
              <div className="flex items-center justify-between text-xs text-slate-300 z-10">
                <div>
                  <span className="font-semibold text-white">{patient.firstName} {patient.lastName}</span>
                  <span className="mx-2 text-slate-500">·</span>
                  <span className="font-mono text-slate-400">{patient.mrn}</span>
                </div>
                <div className="font-mono text-xs text-teal-400">
                  {callActive ? 'E2EE WebRTC Connected' : 'Session Ended'}
                </div>
              </div>

              {/* Center Video / Diagnostic Content */}
              <div className="flex-1 flex items-center justify-center my-4">
                {!callActive ? (
                  <div className="text-center space-y-3">
                    <div className="text-sm font-medium text-slate-300">Teleconsultation Disconnected</div>
                    <button
                      onClick={() => setCallActive(true)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg cursor-pointer"
                    >
                      Reconnect Secure Stream
                    </button>
                  </div>
                ) : sharingEcg ? (
                  <div className="w-full h-full bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-teal-400 font-mono">
                      <span>SHARED DIAGNOSTIC TELEMETRY — LEAD II ECG &amp; PLETH</span>
                      <span>25mm/s · 10mm/mV</span>
                    </div>
                    <svg viewBox="0 0 600 120" className="w-full h-28 stroke-emerald-400 fill-none" strokeWidth="2">
                      <polyline points="0,70 40,70 50,62 60,70 75,70 82,78 90,18 98,95 106,70 125,70 138,56 152,70 200,70 210,62 220,70 235,70 242,78 250,18 258,95 266,70 285,70 298,56 312,70 360,70 370,62 380,70 395,70 402,78 410,18 418,95 426,70 445,70 458,56 472,70 520,70 530,62 540,70 555,70 562,78 570,18 578,95 586,70 600,70" />
                    </svg>
                    <div className="text-[11px] font-mono text-slate-400">
                      Normal Sinus Rhythm · Rate {vitalsSnapshot.heartRate} bpm · No acute ST elevation detected
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-bold text-teal-400">
                      {patient.firstName[0]}{patient.lastName[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {patient.firstName} {patient.lastName}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {camOff ? 'Physician camera paused' : `Connected with ${doctor.name}`}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Controls */}
              <div className="flex items-center justify-center gap-3 z-10">
                <button
                  onClick={() => setMicMuted((m) => !m)}
                  className={`p-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    micMuted
                      ? 'bg-rose-600/20 border-rose-500/50 text-rose-300'
                      : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{micMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button
                  onClick={() => setCamOff((c) => !c)}
                  className={`p-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    camOff
                      ? 'bg-rose-600/20 border-rose-500/50 text-rose-300'
                      : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {camOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  <span>{camOff ? 'Camera Off' : 'Camera On'}</span>
                </button>

                <button
                  onClick={() => setSharingEcg((s) => !s)}
                  className={`p-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    sharingEcg
                      ? 'bg-teal-600 border-teal-500 text-white'
                      : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>{sharingEcg ? 'Hide Telemetry' : 'Share ECG Telemetry'}</span>
                </button>

                {callActive && (
                  <button
                    onClick={() => setCallActive(false)}
                    className="p-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>End Call</span>
                  </button>
                )}
              </div>
            </div>

            {/* Patient Vitals & Allergy Telemetry Bar */}
            <div className="bg-slate-900 border-t border-slate-800 px-5 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="text-slate-400">Heart Rate</div>
                <div className="font-mono tabular-nums font-bold text-white mt-0.5">{vitalsSnapshot.heartRate} bpm</div>
              </div>
              <div>
                <div className="text-slate-400">Blood Pressure</div>
                <div className="font-mono tabular-nums font-bold text-white mt-0.5">{vitalsSnapshot.bloodPressure} mmHg</div>
              </div>
              <div>
                <div className="text-slate-400">SpO2</div>
                <div className="font-mono tabular-nums font-bold text-emerald-400 mt-0.5">{vitalsSnapshot.spo2}%</div>
              </div>
              <div>
                <div className="text-slate-400">Allergies</div>
                <div className="font-semibold text-rose-400 mt-0.5 truncate">
                  {patient.allergies.length > 0 ? patient.allergies.join(', ') : 'NKDA'}
                </div>
              </div>
            </div>
          </div>

          {/* Patient Context Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs space-y-2">
            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-500" />
              <span>Clinical Context &amp; Reason for Visit</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{currentApt.reasonForVisit}</p>
            <div className="pt-2 text-slate-500 dark:text-slate-400">
              Chronic Conditions: {patient.chronicConditions.length > 0 ? patient.chronicConditions.join(' · ') : 'None recorded'}
            </div>
          </div>
        </div>

        {/* Right: SOAP Clinical Notes & E-Prescription Suite */}
        <div className="xl:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
              <button
                onClick={() => setDocTab('soap')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  docTab === 'soap'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                SOAP Clinical Note
              </button>
              <button
                onClick={() => setDocTab('rx')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  docTab === 'rx'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                E-Prescriptions ({prescriptions.length})
              </button>
            </div>

            {docTab === 'soap' && (
              <button
                onClick={handleDraftSoapAi}
                disabled={draftingSoap}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/70 hover:bg-teal-100 dark:hover:bg-teal-900/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{draftingSoap ? 'Drafting...' : 'Draft SOAP with AI'}</span>
              </button>
            )}
          </div>

          <div className="p-5 space-y-4">
            {docTab === 'soap' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subjective (Chief Complaint &amp; HPI)
                  </label>
                  <textarea
                    rows={3}
                    value={soap.subjective}
                    onChange={(e) => setSoap({ ...soap, subjective: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                    placeholder="Patient's reported symptoms, onset, duration..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Objective (Telemetry, Exam &amp; Lab Review)
                  </label>
                  <textarea
                    rows={3}
                    value={soap.objective}
                    onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                    placeholder="Vital signs, visual exam findings, CGM/ECG telemetry..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assessment (Clinical Impression &amp; ICD-10 Context)
                  </label>
                  <textarea
                    rows={2}
                    value={soap.assessment}
                    onChange={(e) => setSoap({ ...soap, assessment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                    placeholder="Primary diagnosis and differential status..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Plan (Therapeutics, Diagnostics &amp; Follow-up)
                  </label>
                  <textarea
                    rows={3}
                    value={soap.plan}
                    onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                    placeholder="Medication adjustments, labs ordered, CarePulse follow-up schedule..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Add Medication Form */}
                <form onSubmit={handleAddPrescription} className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-teal-500" />
                    <span>Add E-Prescription</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      required
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      placeholder="Medication name (e.g. Amoxicillin)"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                    />
                    <input
                      required
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      placeholder="Dosage (e.g. 500 mg)"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                    />
                    <input
                      value={medFreq}
                      onChange={(e) => setMedFreq(e.target.value)}
                      placeholder="Frequency (e.g. Twice daily)"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                    />
                    <input
                      value={medDuration}
                      onChange={(e) => setMedDuration(e.target.value)}
                      placeholder="Duration (e.g. 14 days)"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={medInstructions}
                      onChange={(e) => setMedInstructions(e.target.value)}
                      placeholder="Patient instructions (optional)"
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-md cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Rx</span>
                    </button>
                  </div>
                </form>

                {/* Active Prescriptions */}
                {prescriptions.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 dark:text-slate-400">
                    No medications added to this encounter yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prescriptions.map((rx) => (
                      <div
                        key={rx.id}
                        className="flex items-start justify-between gap-3 p-3 border border-slate-200 dark:border-slate-800 rounded-lg"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {rx.medicationName} · {rx.dosage}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                            {rx.frequency} · {rx.duration}
                          </div>
                          <div className="text-slate-600 dark:text-slate-300 mt-1">{rx.instructions}</div>
                        </div>
                        <button
                          onClick={() => setPrescriptions((prev) => prev.filter((x) => x.id !== rx.id))}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                          title="Remove medication"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={handleRunDrugCheck}
                      disabled={checkingDrugs}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>{checkingDrugs ? 'Checking Interactions...' : 'Run Drug & Allergy Interaction Check (AI)'}</span>
                    </button>
                  </div>
                )}

                {drugCheckResult && (
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {drugCheckResult}
                  </div>
                )}
              </div>
            )}

            {/* Footer Save / Sign Controls */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
              <button
                disabled={saving}
                onClick={() => handleSaveSession(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>

              <button
                disabled={saving}
                onClick={() => handleSaveSession(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Signing...' : 'Sign & Complete Visit'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
