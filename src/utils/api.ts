import { Appointment, Patient, TriageRecord, NotificationLog, ConsultationSession } from '../types';

export interface ClinicalStateResponse {
  doctors: any[];
  patients: Patient[];
  appointments: Appointment[];
  triageRecords: TriageRecord[];
  notifications: NotificationLog[];
  auditLogs: any[];
  consultations: ConsultationSession[];
}

export async function fetchClinicalState(): Promise<ClinicalStateResponse> {
  const res = await fetch('/api/state');
  if (!res.ok) throw new Error('Failed to load clinical state');
  return res.json();
}

export async function resetDemoData(): Promise<ClinicalStateResponse> {
  const res = await fetch('/api/reset-demo', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset clinical data');
  return res.json();
}

export async function createAppointment(appointment: Partial<Appointment>, role: string): Promise<ClinicalStateResponse> {
  const res = await fetch('/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-clinical-role': role,
    },
    body: JSON.stringify(appointment),
  });
  if (!res.ok) throw new Error('Failed to create appointment');
  const data = await res.json();
  return data.store;
}

export async function updateAppointment(id: string, updates: Partial<Appointment>, role: string): Promise<ClinicalStateResponse> {
  const res = await fetch(`/api/appointments/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-clinical-role': role,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update appointment');
  const data = await res.json();
  return data.store;
}

export async function createPatient(patient: Partial<Patient>, role: string): Promise<ClinicalStateResponse> {
  const res = await fetch('/api/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-clinical-role': role,
    },
    body: JSON.stringify(patient),
  });
  if (!res.ok) throw new Error('Failed to register patient');
  const data = await res.json();
  return data.store;
}

export async function createTriageRecord(record: Partial<TriageRecord>, role: string): Promise<ClinicalStateResponse> {
  const res = await fetch('/api/triage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-clinical-role': role,
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error('Failed to submit triage intake');
  const data = await res.json();
  return data.store;
}

export async function updateTriageRecord(id: string, updates: Partial<TriageRecord>, role: string): Promise<ClinicalStateResponse> {
  const res = await fetch(`/api/triage/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-clinical-role': role,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update triage record');
  const data = await res.json();
  return data.store;
}

export async function dispatchNotification(notification: Partial<NotificationLog>): Promise<ClinicalStateResponse> {
  const res = await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notification),
  });
  if (!res.ok) throw new Error('Failed to dispatch notification');
  const data = await res.json();
  return data.store;
}

export async function updateNotificationStatus(id: string, updates: Partial<NotificationLog>): Promise<ClinicalStateResponse> {
  const res = await fetch(`/api/notifications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update notification status');
  const data = await res.json();
  return data.store;
}

export async function saveConsultationSession(session: ConsultationSession): Promise<ClinicalStateResponse> {
  const res = await fetch('/api/consultations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error('Failed to save consultation record');
  const data = await res.json();
  return data.store;
}

export async function requestGeminiAssist(
  task: 'triage' | 'soap' | 'drug_check' | 'reminder_tone',
  payload: Record<string, any>
): Promise<{ content: string; fallback: boolean }> {
  const res = await fetch('/api/gemini/assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, payload }),
  });
  if (!res.ok) throw new Error('Clinical AI assistant request failed');
  return res.json();
}
