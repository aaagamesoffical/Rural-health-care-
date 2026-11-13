import React, { useState, useMemo } from 'react';
import {
  Search,
  Video,
  MapPin,
  CheckCircle2,
  Clock,
  UserCheck,
  XCircle,
  Bell,
  ArrowUpRight,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { Appointment, Doctor, Patient, AppointmentStatus, ClinicWing } from '../types';

interface AppointmentsViewProps {
  appointments: Appointment[];
  doctors: Doctor[];
  patients: Patient[];
  onUpdateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  onOpenTeleconsult: (appointmentId: string) => void;
  onQuickReminder: (appointment: Appointment) => Promise<void>;
  onOpenBookingWithDoctor: (doctorId: string) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  doctors,
  patients,
  onUpdateStatus,
  onOpenTeleconsult,
  onQuickReminder,
  onOpenBookingWithDoctor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [wingFilter, setWingFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((p) => map.set(p.id, p));
    return map;
  }, [patients]);

  const doctorMap = useMemo(() => {
    const map = new Map<string, Doctor>();
    doctors.forEach((d) => map.set(d.id, d));
    return map;
  }, [doctors]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const patient = patientMap.get(apt.patientId);
      const doctor = doctorMap.get(apt.doctorId);

      if (wingFilter !== 'ALL' && apt.clinicWing !== wingFilter) return false;
      if (statusFilter !== 'ALL' && apt.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const patientName = patient ? `${patient.firstName} ${patient.lastName}`.toLowerCase() : '';
        const mrn = patient?.mrn.toLowerCase() || '';
        const docName = doctor?.name.toLowerCase() || '';
        const reason = apt.reasonForVisit.toLowerCase();
        return (
          patientName.includes(q) ||
          mrn.includes(q) ||
          docName.includes(q) ||
          reason.includes(q)
        );
      }
      return true;
    });
  }, [appointments, wingFilter, statusFilter, searchQuery, patientMap, doctorMap]);

  const stats = useMemo(() => {
    const active = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show');
    const confirmed = appointments.filter(
      (a) => a.status === 'confirmed' || a.status === 'checked_in' || a.status === 'completed' || a.status === 'in_consultation'
    );
    const highRiskUnconfirmed = appointments.filter((a) => {
      const p = patientMap.get(a.patientId);
      return p?.noShowRisk === 'High' && a.status === 'scheduled';
    });
    const teleconsults = active.filter((a) => a.visitType === 'teleconsult');

    const confirmRate = active.length > 0 ? Math.round((confirmed.length / active.length) * 100) : 0;

    return {
      totalActive: active.length,
      confirmRate,
      highRiskCount: highRiskUnconfirmed.length,
      teleconsultCount: teleconsults.length,
    };
  }, [appointments, patientMap]);

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    setBusyId(id);
    try {
      await onUpdateStatus(id, status);
    } finally {
      setBusyId(null);
    }
  };

  const handleNotify = async (apt: Appointment) => {
    setBusyId(apt.id);
    try {
      await onQuickReminder(apt);
    } finally {
      setBusyId(null);
    }
  };

  const wings: ClinicWing[] = [
    'Downtown Medical Center',
    'Westside Specialty Wing',
    'North Suburban Outpatient',
    'Telehealth Virtual Ward',
  ];

  const renderStatus = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Confirmed
          </span>
        );
      case 'checked_in':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400">
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            Checked In
          </span>
        );
      case 'in_consultation':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-400">
            <Video className="w-3.5 h-3.5 shrink-0" />
            In Consultation
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Completed
          </span>
        );
      case 'cancelled':
      case 'no_show':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            {status === 'no_show' ? 'No Show' : 'Cancelled'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            Scheduled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 4-Metric Clinical KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Synchronized Slots</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {stats.totalActive}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Across 4 wings</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Confirmed Attendance</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {stats.confirmRate}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Target ≥ 85%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">High No-Show Risk Pending</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {stats.highRiskCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Outreach flagged</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Teleconsultation Sessions</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-teal-600 dark:text-teal-400">
              {stats.teleconsultCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Encrypted WebRTC</span>
          </div>
        </div>
      </div>

      {/* Live Physician Slot Availability Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Attending Physician Queue &amp; Instant Slot Allocation
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Click any specialist to book an immediate slot</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {doctors.map((doc) => {
            const docApts = appointments.filter(
              (a) => a.doctorId === doc.id && a.status !== 'cancelled'
            ).length;
            return (
              <button
                key={doc.id}
                onClick={() => onOpenBookingWithDoctor(doc.id)}
                className="text-left p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-500/60 dark:hover:border-teal-500/60 bg-slate-50/70 dark:bg-slate-950/60 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {doc.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {doc.specialty} · {doc.clinicWing}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 shrink-0" />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-mono tabular-nums">{doc.roomNumber}</span>
                  <span className="font-mono tabular-nums font-medium text-teal-600 dark:text-teal-400">
                    {docApts} booked
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Segmented Status Filters */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg overflow-x-auto">
            {[
              { id: 'ALL', label: 'All Visits' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'checked_in', label: 'Checked In' },
              { id: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Wing Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, MRN, doctor..."
                className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500"
              />
            </div>

            <select
              value={wingFilter}
              onChange={(e) => setWingFilter(e.target.value)}
              aria-label="Filter by clinic wing"
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="ALL">All Clinic Wings</option>
              {wings.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* High-Density Clinical Schedule Table */}
        {filteredAppointments.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-900 dark:text-white">No matching appointments found</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Adjust your wing or status filter, or schedule a new patient slot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 whitespace-nowrap">Schedule Slot</th>
                  <th className="py-3 px-4">Patient &amp; Clinical Context</th>
                  <th className="py-3 px-4">Specialist &amp; Wing</th>
                  <th className="py-3 px-4 whitespace-nowrap">Modality</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Orchestration Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredAppointments.map((apt) => {
                  const patient = patientMap.get(apt.patientId);
                  const doctor = doctorMap.get(apt.doctorId);
                  const isBusy = busyId === apt.id;

                  return (
                    <tr
                      key={apt.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-white">
                          {apt.startTime} – {apt.endTime}
                        </div>
                        <div className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {apt.appointmentDate} · {apt.durationMinutes}m
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                          </span>
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            {patient?.mrn}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {apt.reasonForVisit}
                        </div>
                        {patient?.noShowRisk === 'High' && apt.status === 'scheduled' && (
                          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>High predictive no-show risk</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {doctor?.name || 'Assigned Physician'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {doctor?.specialty} · {apt.clinicWing}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {apt.visitType === 'teleconsult' ? (
                            <>
                              <Video className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                              <span>Telehealth</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>In-Person</span>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
                          {apt.reminderChannel} ({apt.reminderStatus})
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        {renderStatus(apt.status)}
                      </td>

                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {apt.status === 'scheduled' && (
                            <button
                              disabled={isBusy}
                              onClick={() => handleStatusChange(apt.id, 'confirmed')}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Confirm
                            </button>
                          )}

                          {(apt.status === 'scheduled' || apt.status === 'confirmed') && apt.visitType !== 'teleconsult' && (
                            <button
                              disabled={isBusy}
                              onClick={() => handleStatusChange(apt.id, 'checked_in')}
                              className="px-2.5 py-1 text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/70 rounded-md hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Check In
                            </button>
                          )}

                          {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                            <button
                              onClick={() => onOpenTeleconsult(apt.id)}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 hover:bg-teal-600 dark:hover:bg-teal-600 rounded-md transition-colors cursor-pointer"
                            >
                              Open Visit
                            </button>
                          )}

                          {apt.status === 'scheduled' && (
                            <button
                              disabled={isBusy}
                              onClick={() => handleNotify(apt)}
                              title="Dispatch instant reminder"
                              className="p-1.5 text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Bell className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                            <button
                              disabled={isBusy}
                              onClick={() => handleStatusChange(apt.id, 'cancelled')}
                              title="Cancel appointment"
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
