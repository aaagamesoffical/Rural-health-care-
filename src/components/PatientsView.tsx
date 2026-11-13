import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  FileJson,
  Download,
  CalendarPlus,
  X,
  Phone,
  Mail,
} from 'lucide-react';
import { Patient, Appointment } from '../types';
import { generateFhirPatientResource } from '../data/mockData';

interface PatientsViewProps {
  patients: Patient[];
  appointments: Appointment[];
  onCreatePatient: (patient: Partial<Patient>) => Promise<void>;
  onBookForPatient: (patientId: string) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  appointments,
  onCreatePatient,
  onBookForPatient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'Low' | 'Moderate' | 'High'>('ALL');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patients[0] || null);
  const [showFhirJson, setShowFhirJson] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add patient form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('1985-06-15');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [allergiesText, setAllergiesText] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('BlueCross BlueShield');
  const [policyNumber, setPolicyNumber] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (riskFilter !== 'ALL' && p.noShowRisk !== riskFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const full = `${p.firstName} ${p.lastName}`.toLowerCase();
        return (
          full.includes(q) ||
          p.mrn.toLowerCase().includes(q) ||
          p.insuranceProvider.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [patients, riskFilter, searchQuery]);

  const patientAppointments = useMemo(() => {
    if (!selectedPatient) return [];
    return appointments.filter((a) => a.patientId === selectedPatient.id);
  }, [appointments, selectedPatient]);

  const handleDownloadFhir = (patient: Patient) => {
    const resource = generateFhirPatientResource(patient);
    const blob = new Blob([JSON.stringify(resource, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FHIR-R4-${patient.mrn}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setSubmitting(true);
    try {
      await onCreatePatient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dob,
        gender,
        phone: phone.trim() || '+1 (555) 019-2834',
        email: email.trim() || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        bloodType,
        allergies: allergiesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        chronicConditions: conditionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        insuranceProvider: insuranceProvider.trim() || 'Self-Pay / Direct',
        policyNumber: policyNumber.trim() || `POL-${Math.floor(10000 + Math.random() * 90000)}`,
        preAuthStatus: 'Approved',
        noShowRisk: 'Low',
        emergencyContact: {
          name: emergencyName.trim() || 'Primary Family Contact',
          relationship: 'Next of Kin',
          phone: emergencyPhone.trim() || phone.trim() || '+1 (555) 019-2834',
        },
      });
      setShowAddModal(false);
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setAllergiesText('');
      setConditionsText('');
      setPolicyNumber('');
      setEmergencyName('');
      setEmergencyPhone('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient name, MRN, insurer..."
              className="w-full sm:w-72 pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
            {(['ALL', 'Low', 'Moderate', 'High'] as const).map((risk) => (
              <button
                key={risk}
                onClick={() => setRiskFilter(risk)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  riskFilter === risk
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {risk === 'ALL' ? 'All Risk Profiles' : `${risk} Risk`}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Patient</span>
        </button>
      </div>

      {/* Master-Detail Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Master Patient Registry Table */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Master Patient Index ({filteredPatients.length})
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">Select row for clinical dossier</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Patient &amp; MRN</th>
                  <th className="py-3 px-4">Allergies / Conditions</th>
                  <th className="py-3 px-4">Insurance &amp; Auth</th>
                  <th className="py-3 px-4 text-right">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredPatients.map((p) => {
                  const isSelected = selectedPatient?.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setShowFhirJson(false);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-teal-50/70 dark:bg-teal-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {p.firstName} {p.lastName}
                        </div>
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          {p.mrn} · {p.gender} · {p.bloodType}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                          {p.allergies.length > 0 ? p.allergies.join(', ') : 'NKDA'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {p.chronicConditions.length > 0 ? p.chronicConditions.join(' · ') : 'No chronic conditions'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {p.insuranceProvider}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Pre-Auth: {p.preAuthStatus}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="font-mono tabular-nums text-xs font-medium text-slate-900 dark:text-slate-100">
                          {p.totalVisits} visits
                        </div>
                        <div
                          className={`text-xs mt-0.5 font-medium ${
                            p.noShowRisk === 'High'
                              ? 'text-rose-600 dark:text-rose-400'
                              : p.noShowRisk === 'Moderate'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {p.noShowRisk} risk
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Patient Dossier Panel */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          {selectedPatient ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h3>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {selectedPatient.mrn} · DOB {selectedPatient.dateOfBirth} · {selectedPatient.bloodType}
                  </div>
                </div>
                <button
                  onClick={() => onBookForPatient(selectedPatient.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Schedule Visit</span>
                </button>
              </div>

              {/* Contact & Emergency Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 font-medium mb-1">Direct Contact</div>
                  <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono tabular-nums">{selectedPatient.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 mt-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{selectedPatient.email}</span>
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 font-medium mb-1">Emergency Contact</div>
                  <div className="text-slate-900 dark:text-slate-100 font-medium">
                    {selectedPatient.emergencyContact.name} ({selectedPatient.emergencyContact.relationship})
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 font-mono tabular-nums mt-1">
                    {selectedPatient.emergencyContact.phone}
                  </div>
                </div>
              </div>

              {/* Clinical Alerts & Insurance */}
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Documented Allergies</span>
                  <span className="text-right font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    {selectedPatient.allergies.length > 0 && <AlertTriangle className="w-3.5 h-3.5" />}
                    {selectedPatient.allergies.length > 0 ? selectedPatient.allergies.join(', ') : 'No Known Drug Allergies'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Chronic Conditions</span>
                  <span className="text-right text-slate-900 dark:text-slate-100">
                    {selectedPatient.chronicConditions.length > 0 ? selectedPatient.chronicConditions.join(', ') : 'None recorded'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Insurance &amp; Policy</span>
                  <span className="text-right text-slate-900 dark:text-slate-100 font-mono">
                    {selectedPatient.insuranceProvider} · {selectedPatient.policyNumber}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Pre-Authorization</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {selectedPatient.preAuthStatus}
                  </span>
                </div>
              </div>

              {/* Appointment History */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-900 dark:text-white mb-2.5">
                  Synchronized Visits ({patientAppointments.length})
                </div>
                {patientAppointments.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No active appointments linked.</p>
                ) : (
                  <div className="space-y-2">
                    {patientAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800/70 last:border-none"
                      >
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{apt.reasonForVisit}</div>
                          <div className="text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {apt.appointmentDate} · {apt.startTime} · {apt.clinicWing}
                          </div>
                        </div>
                        <span className="capitalize font-medium text-teal-600 dark:text-teal-400 shrink-0 ml-2">
                          {apt.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* HL7 FHIR R4 Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={() => setShowFhirJson((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>{showFhirJson ? 'Hide FHIR R4 Payload' : 'Inspect HL7 FHIR R4'}</span>
                </button>

                <button
                  onClick={() => handleDownloadFhir(selectedPatient)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/70 hover:bg-teal-100 dark:hover:bg-teal-900/60 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
              </div>

              {showFhirJson && (
                <pre className="p-3 rounded-lg bg-slate-950 text-teal-300 text-[11px] font-mono overflow-x-auto max-h-64 border border-slate-800">
                  {JSON.stringify(generateFhirPatientResource(selectedPatient), null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              Select a patient from the Master Patient Index to inspect clinical details.
            </div>
          )}
        </div>
      </div>

      {/* Register Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Register New Patient (FHIR R4 Index)</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
                  <input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Julian"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
                  <input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Mercer"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Blood Type</label>
                    <select
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Mobile Phone (WhatsApp/SMS)</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 234-9011"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@example.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Allergies (comma separated)</label>
                  <input
                    value={allergiesText}
                    onChange={(e) => setAllergiesText(e.target.value)}
                    placeholder="e.g. Penicillin, Latex"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Chronic Conditions (comma separated)</label>
                  <input
                    value={conditionsText}
                    onChange={(e) => setConditionsText(e.target.value)}
                    placeholder="e.g. Asthma, Hypertension"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Insurance Provider</label>
                  <input
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Policy Number</label>
                  <input
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Save Patient Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
