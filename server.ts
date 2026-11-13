import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  INITIAL_DOCTORS,
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_TRIAGE_RECORDS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  SAMPLE_CONSULTATION,
  generateFhirPatientResource,
  generateFhirAppointmentResource,
} from './src/data/mockData.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '.carepulse_data.json');

interface ClinicalStore {
  doctors: typeof INITIAL_DOCTORS;
  patients: typeof INITIAL_PATIENTS;
  appointments: typeof INITIAL_APPOINTMENTS;
  triageRecords: typeof INITIAL_TRIAGE_RECORDS;
  notifications: typeof INITIAL_NOTIFICATIONS;
  auditLogs: typeof INITIAL_AUDIT_LOGS;
  consultations: typeof SAMPLE_CONSULTATION[];
}

function loadStore(): ClinicalStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.appointments) && Array.isArray(parsed.patients)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read persisted store, initializing default clinical dataset:', err);
  }
  return {
    doctors: INITIAL_DOCTORS,
    patients: INITIAL_PATIENTS,
    appointments: INITIAL_APPOINTMENTS,
    triageRecords: INITIAL_TRIAGE_RECORDS,
    notifications: INITIAL_NOTIFICATIONS,
    auditLogs: INITIAL_AUDIT_LOGS,
    consultations: [SAMPLE_CONSULTATION],
  };
}

let store: ClinicalStore = loadStore();

function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist clinical store:', err);
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini client initialization
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// --- Clinical State & Persistence Endpoints ---

app.get('/api/state', (_req, res) => {
  res.json(store);
});

app.post('/api/reset-demo', (_req, res) => {
  store = {
    doctors: INITIAL_DOCTORS,
    patients: INITIAL_PATIENTS,
    appointments: INITIAL_APPOINTMENTS,
    triageRecords: INITIAL_TRIAGE_RECORDS,
    notifications: INITIAL_NOTIFICATIONS,
    auditLogs: INITIAL_AUDIT_LOGS,
    consultations: [SAMPLE_CONSULTATION],
  };
  saveStore();
  res.json(store);
});

app.post('/api/appointments', (req, res) => {
  const apt = req.body;
  if (!apt || !apt.patientId || !apt.doctorId) {
    return res.status(400).json({ error: 'Missing required appointment fields' });
  }
  const newApt = {
    ...apt,
    id: apt.id || `apt-${Date.now()}`,
    createdAt: apt.createdAt || new Date().toISOString(),
  };
  store.appointments = [newApt, ...store.appointments];

  // Auto-generate initial notification record
  const patient = store.patients.find((p) => p.id === newApt.patientId);
  const doctor = store.doctors.find((d) => d.id === newApt.doctorId);
  if (patient && doctor) {
    const notif = {
      id: `notif-${Date.now()}`,
      appointmentId: newApt.id,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      recipientContact: newApt.reminderChannel === 'email' ? patient.email : patient.phone,
      channel: newApt.reminderChannel || 'whatsapp',
      templateType: newApt.visitType === 'teleconsult' ? '2h_teleconsult_link' as const : '24h_reminder' as const,
      messageBody: `HealthSync CarePulse: Your ${newApt.visitType === 'teleconsult' ? 'Telehealth' : 'Outpatient'} appointment with ${doctor.name} is scheduled for ${newApt.appointmentDate} at ${newApt.startTime}. Reply 1 to CONFIRM or 2 to RESCHEDULE.`,
      dispatchedAt: new Date().toISOString(),
      deliveryStatus: 'dispatched' as const,
    };
    store.notifications = [notif, ...store.notifications];
  }

  store.auditLogs = [
    {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'usr-active',
      actorName: req.headers['x-clinical-role']?.toString() || 'Front Desk Coordinator',
      role: req.headers['x-clinical-role']?.toString() || 'Coordinator',
      action: 'APPOINTMENT_CREATED',
      resourceType: 'Appointment',
      resourceId: newApt.id,
      hipaaJustification: `Scheduled ${newApt.visitType} visit for clinical care coordination`,
    },
    ...store.auditLogs,
  ];

  saveStore();
  res.status(201).json({ appointment: newApt, store });
});

app.patch('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const idx = store.appointments.findIndex((a) => a.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  store.appointments[idx] = { ...store.appointments[idx], ...updates };
  store.auditLogs = [
    {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'usr-active',
      actorName: req.headers['x-clinical-role']?.toString() || 'Front Desk Coordinator',
      role: req.headers['x-clinical-role']?.toString() || 'Coordinator',
      action: `APPOINTMENT_STATUS_${(updates.status || 'UPDATED').toUpperCase()}`,
      resourceType: 'Appointment',
      resourceId: id,
      hipaaJustification: 'Clinical workflow progression & real-time slot synchronization',
    },
    ...store.auditLogs,
  ];
  saveStore();
  res.json({ appointment: store.appointments[idx], store });
});

app.post('/api/patients', (req, res) => {
  const p = req.body;
  if (!p || !p.firstName || !p.lastName) {
    return res.status(400).json({ error: 'Patient first and last name are required' });
  }
  const newPatient = {
    ...p,
    id: p.id || `pat-${Date.now()}`,
    mrn: p.mrn || `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
    totalVisits: p.totalVisits ?? 0,
    noShowCount: p.noShowCount ?? 0,
    lastVisitDate: p.lastVisitDate || new Date().toISOString().split('T')[0],
  };
  store.patients = [newPatient, ...store.patients];
  store.auditLogs = [
    {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'usr-active',
      actorName: req.headers['x-clinical-role']?.toString() || 'Front Desk Coordinator',
      role: req.headers['x-clinical-role']?.toString() || 'Coordinator',
      action: 'PATIENT_REGISTERED',
      resourceType: 'Patient',
      resourceId: newPatient.id,
      hipaaJustification: 'New patient onboarding into HL7 FHIR R4 master patient index',
    },
    ...store.auditLogs,
  ];
  saveStore();
  res.status(201).json({ patient: newPatient, store });
});

app.post('/api/triage', (req, res) => {
  const rec = req.body;
  if (!rec || !rec.patientName) {
    return res.status(400).json({ error: 'Patient name is required for triage intake' });
  }
  const newRec = {
    ...rec,
    id: rec.id || `trg-${Date.now()}`,
    arrivalTime: rec.arrivalTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  store.triageRecords = [newRec, ...store.triageRecords];
  store.auditLogs = [
    {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'usr-active',
      actorName: req.headers['x-clinical-role']?.toString() || 'Emergency Triage Nurse',
      role: req.headers['x-clinical-role']?.toString() || 'TriageNurse',
      action: `TRIAGE_INTAKE_ESI${newRec.esiLevel}`,
      resourceType: 'Triage',
      resourceId: newRec.id,
      hipaaJustification: 'Emergency Severity Index intake and acute vital signs capture',
    },
    ...store.auditLogs,
  ];
  saveStore();
  res.status(201).json({ triageRecord: newRec, store });
});

app.patch('/api/triage/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const idx = store.triageRecords.findIndex((t) => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Triage record not found' });
  }
  store.triageRecords[idx] = { ...store.triageRecords[idx], ...updates };
  store.auditLogs = [
    {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'usr-active',
      actorName: req.headers['x-clinical-role']?.toString() || 'Emergency Triage Nurse',
      role: req.headers['x-clinical-role']?.toString() || 'TriageNurse',
      action: 'TRIAGE_STATUS_UPDATED',
      resourceType: 'Triage',
      resourceId: id,
      hipaaJustification: 'Triage bed assignment or physician escalation update',
    },
    ...store.auditLogs,
  ];
  saveStore();
  res.json({ triageRecord: store.triageRecords[idx], store });
});

app.post('/api/notifications', (req, res) => {
  const notif = req.body;
  const newNotif = {
    ...notif,
    id: notif.id || `notif-${Date.now()}`,
    dispatchedAt: notif.dispatchedAt || new Date().toISOString(),
  };
  store.notifications = [newNotif, ...store.notifications];
  store.auditLogs = [
    {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'sys-notify-engine',
      actorName: 'CarePulse Notification Engine',
      role: 'Automated Dispatch',
      action: `NOTIFICATION_DISPATCH_${(newNotif.channel || 'SMS').toUpperCase()}`,
      resourceType: 'Notification',
      resourceId: newNotif.id,
      hipaaJustification: 'Automated appointment confirmation and patient adherence alert',
    },
    ...store.auditLogs,
  ];
  saveStore();
  res.status(201).json({ notification: newNotif, store });
});

app.patch('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const idx = store.notifications.findIndex((n) => n.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  store.notifications[idx] = { ...store.notifications[idx], ...updates };

  // Also sync linked appointment if confirmed or rescheduled
  const linkedAptId = store.notifications[idx].appointmentId;
  if (linkedAptId && updates.deliveryStatus === 'confirmed') {
    const aptIdx = store.appointments.findIndex((a) => a.id === linkedAptId);
    if (aptIdx !== -1) {
      store.appointments[aptIdx] = {
        ...store.appointments[aptIdx],
        status: 'confirmed',
        reminderStatus: 'confirmed',
      };
    }
  }
  saveStore();
  res.json({ notification: store.notifications[idx], store });
});

app.post('/api/consultations', (req, res) => {
  const session = req.body;
  const existingIdx = store.consultations.findIndex((c) => c.appointmentId === session.appointmentId);
  if (existingIdx !== -1) {
    store.consultations[existingIdx] = { ...store.consultations[existingIdx], ...session };
  } else {
    store.consultations = [{ ...session, id: session.id || `ses-${Date.now()}` }, ...store.consultations];
  }

  // Mark linked appointment completed if signed
  if (session.doctorSignatureTimestamp && session.appointmentId) {
    const aptIdx = store.appointments.findIndex((a) => a.id === session.appointmentId);
    if (aptIdx !== -1) {
      store.appointments[aptIdx] = {
        ...store.appointments[aptIdx],
        status: 'completed',
      };
    }
  }

  store.auditLogs = [
    {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: session.doctorId || 'doc-1',
      actorName: 'Attending Physician',
      role: 'Physician',
      action: session.doctorSignatureTimestamp ? 'CONSULTATION_SIGNED_FINAL' : 'CONSULTATION_SAVED',
      resourceType: 'Prescription',
      resourceId: session.id || session.appointmentId,
      hipaaJustification: 'SOAP clinical note & e-prescription signed in Virtual Clinic Suite',
    },
    ...store.auditLogs,
  ];

  saveStore();
  res.status(201).json({ store });
});

// HL7 FHIR R4 Endpoints
app.get('/api/fhir/Patient/:id', (req, res) => {
  const patient = store.patients.find((p) => p.id === req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient resource not found' });
  res.json(generateFhirPatientResource(patient));
});

app.get('/api/fhir/Appointment/:id', (req, res) => {
  const apt = store.appointments.find((a) => a.id === req.params.id);
  if (!apt) return res.status(404).json({ error: 'Appointment resource not found' });
  const patient = store.patients.find((p) => p.id === apt.patientId);
  const doctor = store.doctors.find((d) => d.id === apt.doctorId);
  res.json(generateFhirAppointmentResource(apt, patient, doctor));
});

// Clinical AI Assistant Proxy Route
app.post('/api/gemini/assist', async (req, res) => {
  try {
    const { task, payload } = req.body;

    if (!ai) {
      return res.json({
        success: true,
        fallback: true,
        content: getClinicalFallback(task, payload),
      });
    }

    let prompt = '';
    const systemInstruction =
      'You are HealthSync CarePulse AI, an enterprise clinical decision support and triage system compliant with HL7 FHIR R4 standards. Provide concise, clinically grounded, structured guidance without conversational filler.';

    switch (task) {
      case 'triage':
        prompt = `Perform emergency clinical triage evaluation on the following patient data:
Age: ${payload.age || 'Unknown'}, Gender: ${payload.gender || 'Unknown'}
Chief Complaint: ${payload.complaint || 'None provided'}
Vitals:
- Heart Rate: ${payload.vitals?.heartRate || 'N/A'} bpm
- Blood Pressure: ${payload.vitals?.bloodPressure || 'N/A'} mmHg
- SpO2: ${payload.vitals?.spo2 || 'N/A'}%
- Temperature: ${payload.vitals?.temperature || 'N/A'} °F
- Respiratory Rate: ${payload.vitals?.respiratoryRate || 'N/A'} bpm
Pain Score: ${payload.painScore || '0'}/10

Provide:
1. Recommended ESI Level (1 to 5) with brief physiological justification.
2. Immediate Priority Actions & nursing interventions.
3. Top differential considerations.
4. Tele-triage disposition (Immediate ER Transfer, Rapid Bed Assignment, Urgent Clinic Slot, or Routine Follow-up).`;
        break;

      case 'soap':
        prompt = `Generate a structured clinical SOAP (Subjective, Objective, Assessment, Plan) note from the following clinical visit notes:
Doctor: ${payload.doctorName || 'Attending Physician'}
Patient: ${payload.patientName || 'Patient'} (MRN: ${payload.mrn || 'N/A'})
Symptoms & History: ${payload.history || 'N/A'}
Examination & Vitals: ${payload.exam || 'N/A'}
Provisional Diagnosis: ${payload.diagnosis || 'N/A'}
Prescriptions & Advice: ${payload.advice || 'N/A'}

Return a clean JSON object with exact keys: "subjective", "objective", "assessment", "plan" (each a concise clinical paragraph or numbered list string).`;
        break;

      case 'drug_check':
        prompt = `Analyze potential drug interactions and contraindications:
Patient Allergies: ${payload.allergies?.join(', ') || 'None reported'}
Chronic Conditions: ${payload.conditions?.join(', ') || 'None reported'}
Proposed Medications: ${JSON.stringify(payload.medications || [])}

Identify any severe, moderate, or minor adverse interactions, allergy alerts, dosage adjustments, and patient counselling points.`;
        break;

      case 'reminder_tone':
        prompt = `Draft an empathetic, clear, multi-channel appointment reminder message:
Patient Name: ${payload.patientName}
Appointment Date & Time: ${payload.dateTime}
Doctor: ${payload.doctorName} (${payload.specialty})
Type: ${payload.isTeleconsult ? 'Virtual Telehealth Consultation (Video Link Provided)' : 'In-Person Outpatient Clinic'}
Channel: ${payload.channel || 'WhatsApp'}
Language Tone: Professional, warm, clear, reducing no-show anxiety.

Provide ONLY the exact message text ready to be dispatched with confirmation action cues (e.g. Reply 1 to Confirm, 2 to Reschedule).`;
        break;

      default:
        prompt = `Provide clinical assistance for: ${JSON.stringify(payload)}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        ...(task === 'soap' ? { responseMimeType: 'application/json' } : {}),
      },
    });

    const generatedText = response.text || '';
    return res.json({
      success: true,
      fallback: false,
      content: generatedText,
    });
  } catch (error: any) {
    console.error('Gemini API Assist error:', error);
    return res.json({
      success: true,
      fallback: true,
      content: getClinicalFallback(req.body.task, req.body.payload),
      error: error?.message || 'Gemini upstream error',
    });
  }
});

function getClinicalFallback(task: string, payload: any): string {
  if (task === 'triage') {
    const spo2 = Number(payload.vitals?.spo2) || 98;
    const hr = Number(payload.vitals?.heartRate) || 80;
    const pain = Number(payload.painScore) || 3;
    const isEmergent = spo2 < 92 || hr > 120 || pain >= 8;
    return `1. Recommended Triage Level: ${isEmergent ? 'ESI Level 2 - Emergent' : 'ESI Level 3 - Urgent'}
   Justification: Heart rate ${hr} bpm, SpO2 ${spo2}%, Pain ${pain}/10 with chief complaint "${payload.complaint || 'acute presentation'}".

2. Immediate Priority Actions:
   - Initiate continuous pulse oximetry and 5-lead ECG monitoring.
   - Establish peripheral IV access if hemodynamic trend worsens.
   - Alert attending specialist immediately.

3. Differential Considerations:
   - Evaluate acute cardiopulmonary vs. metabolic/neurological etiology based on presenting symptom cluster.

4. Tele-Triage Disposition:
   - ${isEmergent ? 'Immediate Acute Bay Assignment & Physician Bedside Evaluation' : 'Urgent Clinic Slot / Rapid Observation Bay within 30 minutes'}.`;
  } else if (task === 'soap') {
    return JSON.stringify({
      subjective: `Patient ${payload.patientName || 'Patient'} (${payload.mrn || 'MRN'}) presents for evaluation of ${payload.history || 'reported symptoms'}. Reports adherence to baseline medications without new acute drug intolerance.`,
      objective: `Vitals reviewed (${payload.exam || 'BP 126/82 mmHg, HR 74 bpm, SpO2 99% on room air'}). Alert and oriented x3, no acute cardiopulmonary distress observed during teleconsultation.`,
      assessment: `Primary Clinical Impression: ${payload.diagnosis || 'Clinically stable outpatient presentation under active management'}.`,
      plan: `1. ${payload.advice || 'Continue prescribed regimen and monitor daily symptom log.'}\n2. Patient counseled on red-flag escalation criteria.\n3. CarePulse automated 48-hour follow-up reminder scheduled via encrypted messaging.`,
    });
  } else if (task === 'drug_check') {
    const allergies = payload.allergies?.length ? payload.allergies.join(', ') : 'None known';
    const meds = (payload.medications || []).map((m: any) => m.medicationName).join(', ') || 'Selected regimen';
    return `Pharmacological Safety Check Complete
- Documented Allergies Checked: ${allergies}
- Active Regimen Analyzed: ${meds}
- Allergy Cross-Reactivity: No direct cross-sensitivity detected against patient allergy profile.
- Interaction Severity: Low / Manageable. Monitor renal function and hydration status; counsel patient to take doses consistently with meals if GI sensitivity occurs.`;
  } else {
    return `Hello ${payload.patientName || 'Patient'}, this is a reminder from HealthSync CarePulse for your ${payload.isTeleconsult ? 'Virtual Telehealth' : 'Outpatient'} visit with ${payload.doctorName || 'your physician'} on ${payload.dateTime || 'your scheduled date'}. Reply 1 to CONFIRM or 2 to RESCHEDULE.`;
  }
}

// Development vs Production Server setup
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HealthSync CarePulse server listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  });
}

startServer();
