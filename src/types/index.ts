export type ClinicWing = 
  | 'Downtown Medical Center'
  | 'Westside Specialty Wing'
  | 'North Suburban Outpatient'
  | 'Telehealth Virtual Ward';

export type MedicalSpecialty =
  | 'Cardiology'
  | 'Neurology'
  | 'Pediatrics'
  | 'Orthopedics'
  | 'General Practice'
  | 'Dermatology'
  | 'Oncology'
  | 'Emergency Medicine';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type VisitType = 'in_person' | 'teleconsult' | 'rapid_triage';

export type UrgencyLevel = 'routine' | 'urgent' | 'emergency_code_red';

export type NotificationChannel = 'whatsapp' | 'sms' | 'email' | 'push';

export type NotificationStatus = 'dispatched' | 'delivered' | 'read' | 'confirmed' | 'failed';

export type EsiLevel = 1 | 2 | 3 | 4 | 5; // Emergency Severity Index

export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: MedicalSpecialty;
  department: string;
  clinicWing: ClinicWing;
  rating: number;
  availableDays: string[];
  roomNumber: string;
  isTeleconsultReady: boolean;
  activeQueueCount: number;
  contactEmail: string;
  contactPhone: string;
  bio: string;
}

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email: string;
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  insuranceProvider: string;
  policyNumber: string;
  preAuthStatus: 'Approved' | 'Pending' | 'Exempt';
  noShowRisk: 'Low' | 'Moderate' | 'High';
  totalVisits: number;
  noShowCount: number;
  lastVisitDate: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  clinicWing: ClinicWing;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  visitType: VisitType;
  status: AppointmentStatus;
  reasonForVisit: string;
  urgency: UrgencyLevel;
  reminderChannel: NotificationChannel;
  reminderStatus: 'pending' | 'dispatched' | 'confirmed' | 'failed';
  teleconsultRoomId?: string;
  notes?: string;
  createdAt: string;
}

export interface PatientVitals {
  heartRate: number; // bpm
  bloodPressure: string; // e.g. "120/80"
  spo2: number; // %
  temperature: number; // Fahrenheit
  respiratoryRate: number; // breaths/min
}

export interface TriageRecord {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  arrivalTime: string;
  vitals: PatientVitals;
  painScale: number; // 0-10
  esiLevel: EsiLevel;
  primarySymptoms: string[];
  status: 'triage_queue' | 'bed_assigned' | 'physician_eval' | 'discharged';
  assignedDoctorId?: string;
  bedLocation?: string;
  clinicalNotes?: string;
  aiDifferentialSummary?: string;
}

export interface NotificationLog {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  recipientContact: string;
  channel: NotificationChannel;
  templateType: '24h_reminder' | '2h_teleconsult_link' | 'queue_alert' | 'prescription_sent' | 'reschedule_prompt';
  messageBody: string;
  dispatchedAt: string;
  deliveryStatus: NotificationStatus;
  responsePayload?: string;
}

export interface PrescriptionItem {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface ConsultationSession {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startTime: string;
  endTime?: string;
  soapNote: SoapNote;
  prescriptions: PrescriptionItem[];
  vitalsSnapshot: PatientVitals;
  doctorSignatureTimestamp?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  role: string;
  action: string;
  resourceType: 'Patient' | 'Appointment' | 'Prescription' | 'Triage' | 'Notification';
  resourceId: string;
  hipaaJustification: string;
}
