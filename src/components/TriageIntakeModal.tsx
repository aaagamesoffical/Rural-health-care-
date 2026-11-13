import React, { useState } from 'react';
import { X, AlertCircle, Sparkles } from 'lucide-react';
import { Patient, Doctor, TriageRecord, EsiLevel } from '../types';
import { requestGeminiAssist } from '../utils/api';

interface TriageIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  doctors: Doctor[];
  onSubmitTriage: (record: Partial<TriageRecord>) => Promise<void>;
}

export const TriageIntakeModal: React.FC<TriageIntakeModalProps> = ({
  isOpen,
  onClose,
  patients,
  doctors,
  onSubmitTriage,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || 'walkin');
  const [walkInName, setWalkInName] = useState('');
  const [age, setAge] = useState(44);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [symptoms, setSymptoms] = useState('');
  const [heartRate, setHeartRate] = useState(108);
  const [bloodPressure, setBloodPressure] = useState('148/92');
  const [spo2, setSpo2] = useState(95);
  const [temperature, setTemperature] = useState(99.2);
  const [respiratoryRate, setRespiratoryRate] = useState(22);
  const [painScale, setPainScale] = useState(7);
  const [esiLevel, setEsiLevel] = useState<EsiLevel>(2);
  const [assignedDoctorId, setAssignedDoctorId] = useState(doctors[3]?.id || doctors[0]?.id || '');
  const [bedLocation, setBedLocation] = useState('Acute Triage Bay 2');
  const [aiPreview, setAiPreview] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const handleRunAiCheck = async () => {
    setAnalyzing(true);
    try {
      const assignedDoc = doctors.find((d) => d.id === assignedDoctorId);
      const res = await requestGeminiAssist('triage', {
        age: selectedPatient
          ? new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()
          : age,
        gender: selectedPatient ? selectedPatient.gender : gender,
        complaint: symptoms || 'Acute clinical presentation',
        vitals: { heartRate, bloodPressure, spo2, temperature, respiratoryRate },
        painScore: painScale,
        doctorName: assignedDoc?.name,
      });
      setAiPreview(res.content);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patientName = selectedPatient
      ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
      : walkInName.trim() || 'Walk-In Emergency Patient';

    if (!symptoms.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitTriage({
        patientId: selectedPatient ? selectedPatient.id : `walkin-${Date.now()}`,
        patientName,
        mrn: selectedPatient ? selectedPatient.mrn : `MRN-W${Math.floor(10000 + Math.random() * 89999)}`,
        age: selectedPatient
          ? new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()
          : age,
        gender: selectedPatient ? selectedPatient.gender : gender,
        vitals: { heartRate, bloodPressure, spo2, temperature, respiratoryRate },
        painScale,
        esiLevel,
        primarySymptoms: symptoms
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        status: bedLocation.trim() ? 'bed_assigned' : 'triage_queue',
        assignedDoctorId,
        bedLocation: bedLocation.trim() || undefined,
        aiDifferentialSummary: aiPreview || undefined,
      });
      setSymptoms('');
      setAiPreview('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Emergency Tele-Triage Intake
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
                Patient Record
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.mrn})
                  </option>
                ))}
                <option value="walkin">+ Walk-In / Unregistered Patient</option>
              </select>
            </div>

            {selectedPatientId === 'walkin' ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    required
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="Patient name"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Routing Physician
                </label>
                <select
                  value={assignedDoctorId}
                  onChange={(e) => setAssignedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Presenting Symptoms (comma separated) *
            </label>
            <input
              required
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. Acute dyspnea, Substernal chest pressure, Diaphoresis"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Vitals Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">HR (bpm)</label>
              <input
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">BP (mmHg)</label>
              <input
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">SpO2 (%)</label>
              <input
                type="number"
                value={spo2}
                onChange={(e) => setSpo2(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Temp (°F)</label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">RR (/min)</label>
              <input
                type="number"
                value={respiratoryRate}
                onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Pain (0–10)</label>
              <input
                type="number"
                min={0}
                max={10}
                value={painScale}
                onChange={(e) => setPainScale(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                ESI Acuity Level
              </label>
              <select
                value={esiLevel}
                onChange={(e) => setEsiLevel(Number(e.target.value) as EsiLevel)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white cursor-pointer"
              >
                <option value={1}>ESI 1 - Resuscitation (Immediate)</option>
                <option value={2}>ESI 2 - Emergent (&lt;10 min)</option>
                <option value={3}>ESI 3 - Urgent</option>
                <option value={4}>ESI 4 - Less Urgent</option>
                <option value={5}>ESI 5 - Non-Urgent</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Triage Bay / Bed
              </label>
              <input
                value={bedLocation}
                onChange={(e) => setBedLocation(e.target.value)}
                placeholder="e.g. Acute Cardiac Bay 2"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Instant AI Acuity Check */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleRunAiCheck}
              disabled={analyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/70 hover:bg-teal-100 dark:hover:bg-teal-900/60 rounded-lg cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{analyzing ? 'Evaluating Acuity...' : 'Run AI Acuity & Disposition Check'}</span>
            </button>

            {aiPreview && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                {aiPreview}
              </div>
            )}
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !symptoms.trim()}
              className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Admitting...' : 'Admit to Triage Queue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
