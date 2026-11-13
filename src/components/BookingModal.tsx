import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertTriangle, CalendarCheck2 } from 'lucide-react';
import {
  Patient,
  Doctor,
  Appointment,
  VisitType,
  UrgencyLevel,
  NotificationChannel,
  ClinicWing,
} from '../types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  doctors: Doctor[];
  existingAppointments: Appointment[];
  preselectedDoctorId?: string | null;
  preselectedPatientId?: string | null;
  onSubmitBooking: (apt: Partial<Appointment>) => Promise<void>;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  patients,
  doctors,
  existingAppointments,
  preselectedDoctorId,
  preselectedPatientId,
  onSubmitBooking,
}) => {
  const [patientId, setPatientId] = useState(patients[0]?.id || '');
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || '');
  const [appointmentDate, setAppointmentDate] = useState('2026-11-13');
  const [startTime, setStartTime] = useState('09:30');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [visitType, setVisitType] = useState<VisitType>('in_person');
  const [urgency, setUrgency] = useState<UrgencyLevel>('routine');
  const [reminderChannel, setReminderChannel] = useState<NotificationChannel>('whatsapp');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedDoctorId) setDoctorId(preselectedDoctorId);
  }, [preselectedDoctorId]);

  useEffect(() => {
    if (preselectedPatientId) setPatientId(preselectedPatientId);
  }, [preselectedPatientId]);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === doctorId) || doctors[0],
    [doctors, doctorId]
  );

  const computedEndTime = useMemo(() => {
    const [h, m] = startTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return startTime;
    const total = h * 60 + m + durationMinutes;
    const endH = Math.floor(total / 60) % 24;
    const endM = total % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }, [startTime, durationMinutes]);

  const hasConflict = useMemo(() => {
    return existingAppointments.some(
      (a) =>
        a.doctorId === doctorId &&
        a.appointmentDate === appointmentDate &&
        a.startTime === startTime &&
        a.status !== 'cancelled'
    );
  }, [existingAppointments, doctorId, appointmentDate, startTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !doctorId || !reasonForVisit.trim()) return;
    setSubmitting(true);
    try {
      const clinicWing: ClinicWing =
        visitType === 'teleconsult'
          ? 'Telehealth Virtual Ward'
          : selectedDoctor?.clinicWing || 'Downtown Medical Center';

      await onSubmitBooking({
        patientId,
        doctorId,
        clinicWing,
        appointmentDate,
        startTime,
        endTime: computedEndTime,
        durationMinutes,
        visitType,
        status: 'scheduled',
        reasonForVisit: reasonForVisit.trim(),
        urgency,
        reminderChannel,
        reminderStatus: 'dispatched',
        ...(visitType === 'teleconsult'
          ? { teleconsultRoomId: `tele-room-${Math.floor(100 + Math.random() * 899)}` }
          : {}),
      });
      setReasonForVisit('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4 text-teal-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Schedule Clinical Appointment
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Patient (Master Index)
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.mrn})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Attending Specialist
              </label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Appointment Date
              </label>
              <input
                type="date"
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Slot Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          </div>

          {hasConflict && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Note: {selectedDoctor?.name} already has a slot at {startTime} on {appointmentDate}. Double-booking will mark as concurrent queue.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Consultation Modality
              </label>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as VisitType)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="in_person">In-Person Clinic</option>
                <option value="teleconsult">Telehealth Virtual Room</option>
                <option value="rapid_triage">Rapid Urgent Slot</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Clinical Urgency
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency_code_red">Emergency Priority</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Auto-Reminder Channel
              </label>
              <select
                value={reminderChannel}
                onChange={(e) => setReminderChannel(e.target.value as NotificationChannel)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="whatsapp">WhatsApp 2-Way Bot</option>
                <option value="sms">SMS Shortcode</option>
                <option value="email">Encrypted Email</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Chief Complaint / Reason for Visit *
            </label>
            <textarea
              required
              rows={3}
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
              placeholder="Describe clinical reason, lab follow-up, or presenting symptoms..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 font-mono">
              Slot: {startTime} – {computedEndTime}
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reasonForVisit.trim()}
                className="px-4 py-2 font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Synchronizing...' : 'Confirm & Dispatch Alert'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
