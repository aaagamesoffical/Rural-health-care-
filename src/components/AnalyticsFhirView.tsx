import React, { useState, useMemo } from 'react';
import {
  FileCode2,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Search,
} from 'lucide-react';
import {
  Patient,
  Appointment,
  Doctor,
  TriageRecord,
  AuditLogEntry,
} from '../types';
import {
  generateFhirPatientResource,
  generateFhirAppointmentResource,
} from '../data/mockData';

interface AnalyticsFhirViewProps {
  patients: Patient[];
  appointments: Appointment[];
  doctors: Doctor[];
  triageRecords: TriageRecord[];
  auditLogs: AuditLogEntry[];
}

export const AnalyticsFhirView: React.FC<AnalyticsFhirViewProps> = ({
  patients,
  appointments,
  doctors,
  triageRecords,
  auditLogs,
}) => {
  const [resourceType, setResourceType] = useState<'Patient' | 'Appointment'>('Patient');
  const [selectedId, setSelectedId] = useState<string>(patients[0]?.id || '');
  const [copied, setCopied] = useState(false);
  const [auditQuery, setAuditQuery] = useState('');

  // Keep selectedId valid when switching resourceType
  const handleSwitchResourceType = (type: 'Patient' | 'Appointment') => {
    setResourceType(type);
    if (type === 'Patient') {
      setSelectedId(patients[0]?.id || '');
    } else {
      setSelectedId(appointments[0]?.id || '');
    }
  };

  const fhirPayload = useMemo(() => {
    if (resourceType === 'Patient') {
      const p = patients.find((x) => x.id === selectedId) || patients[0];
      return p ? generateFhirPatientResource(p) : {};
    } else {
      const a = appointments.find((x) => x.id === selectedId) || appointments[0];
      if (!a) return {};
      const p = patients.find((x) => x.id === a.patientId);
      const d = doctors.find((x) => x.id === a.doctorId);
      return generateFhirAppointmentResource(a, p, d);
    }
  }, [resourceType, selectedId, patients, appointments, doctors]);

  const fhirString = useMemo(() => JSON.stringify(fhirPayload, null, 2), [fhirPayload]);

  const wingDistribution = useMemo(() => {
    const wings = [
      'Downtown Medical Center',
      'Westside Specialty Wing',
      'North Suburban Outpatient',
      'Telehealth Virtual Ward',
    ];
    const total = Math.max(appointments.length, 1);
    return wings.map((wing) => {
      const count = appointments.filter((a) => a.clinicWing === wing).length;
      const pct = Math.round((count / total) * 100);
      return { wing, count, pct };
    });
  }, [appointments]);

  const filteredAudits = useMemo(() => {
    if (!auditQuery.trim()) return auditLogs;
    const q = auditQuery.toLowerCase();
    return auditLogs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.actorName.toLowerCase().includes(q) ||
        l.resourceType.toLowerCase().includes(q) ||
        l.hipaaJustification.toLowerCase().includes(q)
    );
  }, [auditLogs, auditQuery]);

  const handleCopy = () => {
    navigator.clipboard.writeText(fhirString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([fhirString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HL7-FHIR-R4-${resourceType}-${selectedId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Operational KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Registered Patient Index</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
            {patients.length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Care Encounters</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-teal-600 dark:text-teal-400">
            {appointments.length + triageRecords.length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">FHIR R4 Conformance</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            100%
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">HIPAA Audit Events</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
            {auditLogs.length}
          </div>
        </div>
      </div>

      {/* Wing Utilization + HL7 FHIR R4 Resource Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Wing Distribution */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Clinic Wing Load &amp; Slot Synchronization
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time distribution across physical outpatient wings and virtual telehealth beds.
            </p>
          </div>

          <div className="space-y-4">
            {wingDistribution.map((w) => (
              <div key={w.wing} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{w.wing}</span>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {w.count} slots ({w.pct}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(w.pct, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            CarePulse automated reminders and two-way confirmation webhooks reduce outpatient no-show variance below 5% across all synchronized clinics.
          </div>
        </div>

        {/* Live HL7 FHIR R4 Payload Inspector */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-teal-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                HL7 FHIR R4 Resource Inspector
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
                {(['Patient', 'Appointment'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleSwitchResourceType(t)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                      resourceType === t
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {resourceType === 'Patient'
                  ? patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.mrn})
                      </option>
                    ))
                  : appointments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.id} · {a.appointmentDate} {a.startTime}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-500 dark:text-slate-400">
                GET /api/fhir/{resourceType}/{selectedId}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/70 rounded-md hover:bg-teal-100 dark:hover:bg-teal-900/60 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-lg bg-slate-950 text-teal-300 text-xs font-mono overflow-x-auto max-h-72 border border-slate-800">
              {fhirString}
            </pre>
          </div>
        </div>
      </div>

      {/* HIPAA Audit Trail Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Immutable HIPAA Security &amp; Access Audit Log
            </h2>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={auditQuery}
              onChange={(e) => setAuditQuery(e.target.value)}
              placeholder="Filter action, actor, resource..."
              className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 whitespace-nowrap">Timestamp (UTC)</th>
                <th className="py-3 px-4">Clinical Actor &amp; Role</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">HIPAA Clinical Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredAudits.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900 dark:text-white">{log.actorName}</div>
                    <div className="text-slate-500 dark:text-slate-400">{log.role}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {log.resourceType}/{log.resourceId}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{log.hipaaJustification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
