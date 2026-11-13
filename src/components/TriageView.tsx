import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  HeartPulse,
  Sparkles,
  BedDouble,
  CheckCircle2,
  UserPlus,
  Stethoscope,
} from 'lucide-react';
import { TriageRecord, Doctor, EsiLevel } from '../types';
import { requestGeminiAssist } from '../utils/api';

interface TriageViewProps {
  triageRecords: TriageRecord[];
  doctors: Doctor[];
  onUpdateTriage: (id: string, updates: Partial<TriageRecord>) => Promise<void>;
  onOpenNewTriage: () => void;
}

export const TriageView: React.FC<TriageViewProps> = ({
  triageRecords,
  doctors,
  onUpdateTriage,
  onOpenNewTriage,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [editingBedId, setEditingBedId] = useState<string | null>(null);
  const [bedInput, setBedInput] = useState('');

  const sortedRecords = useMemo(() => {
    return [...triageRecords]
      .filter((r) => (statusFilter === 'ALL' ? true : r.status === statusFilter))
      .sort((a, b) => a.esiLevel - b.esiLevel);
  }, [triageRecords, statusFilter]);

  const counts = useMemo(() => {
    const active = triageRecords.filter((r) => r.status !== 'discharged');
    const critical = active.filter((r) => r.esiLevel <= 2);
    const awaitingBed = active.filter((r) => r.status === 'triage_queue');
    return {
      totalActive: active.length,
      criticalCount: critical.length,
      awaitingBed: awaitingBed.length,
      dischargedCount: triageRecords.filter((r) => r.status === 'discharged').length,
    };
  }, [triageRecords]);

  const esiLabel = (level: EsiLevel) => {
    switch (level) {
      case 1:
        return { text: 'ESI 1 · Resuscitation', cls: 'text-rose-600 dark:text-rose-400' };
      case 2:
        return { text: 'ESI 2 · Emergent', cls: 'text-rose-600 dark:text-rose-400' };
      case 3:
        return { text: 'ESI 3 · Urgent', cls: 'text-amber-600 dark:text-amber-400' };
      case 4:
        return { text: 'ESI 4 · Less Urgent', cls: 'text-teal-600 dark:text-teal-400' };
      default:
        return { text: 'ESI 5 · Non-Urgent', cls: 'text-slate-600 dark:text-slate-400' };
    }
  };

  const handleRunAiTriage = async (rec: TriageRecord) => {
    setEvaluatingId(rec.id);
    try {
      const assignedDoc = doctors.find((d) => d.id === rec.assignedDoctorId);
      const res = await requestGeminiAssist('triage', {
        age: rec.age,
        gender: rec.gender,
        complaint: rec.primarySymptoms.join('; '),
        vitals: rec.vitals,
        painScore: rec.painScale,
        doctorName: assignedDoc?.name,
      });
      await onUpdateTriage(rec.id, { aiDifferentialSummary: res.content });
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleAssignBed = async (id: string) => {
    if (!bedInput.trim()) return;
    await onUpdateTriage(id, {
      bedLocation: bedInput.trim(),
      status: 'bed_assigned',
    });
    setEditingBedId(null);
    setBedInput('');
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Triage Cases</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
            {counts.totalActive}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Critical Acuity (ESI 1–2)</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-rose-600 dark:text-rose-400">
            {counts.criticalCount}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Awaiting Bed Routing</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-amber-600 dark:text-amber-400">
            {counts.awaitingBed}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Discharged / Cleared</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {counts.dischargedCount}
          </div>
        </div>
      </div>

      {/* Filter & Intake Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Acuity Levels' },
            { id: 'triage_queue', label: 'Triage Queue' },
            { id: 'bed_assigned', label: 'Bed Assigned' },
            { id: 'physician_eval', label: 'Physician Eval' },
            { id: 'discharged', label: 'Discharged' },
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

        <button
          onClick={onOpenNewTriage}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>New Tele-Triage Intake</span>
        </button>
      </div>

      {/* Triage Queue List */}
      {sortedRecords.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-16 px-6 text-center">
          <HeartPulse className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <div className="text-sm font-medium text-slate-900 dark:text-white">No triage cases in this view</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            All acute cases matching this filter have been routed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedRecords.map((rec) => {
            const esi = esiLabel(rec.esiLevel);
            const assignedDoc = doctors.find((d) => d.id === rec.assignedDoctorId);
            const isEvaluating = evaluatingId === rec.id;

            return (
              <div
                key={rec.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
              >
                {/* Header Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${esi.cls}`}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        {esi.text}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {rec.patientName}
                      </h3>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {rec.mrn} · {rec.age}y {rec.gender} · Arrived {rec.arrivalTime}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs text-slate-700 dark:text-slate-300">
                      Presenting Symptoms: {rec.primarySymptoms.join(' · ')}
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRunAiTriage(rec)}
                      disabled={isEvaluating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/70 hover:bg-teal-100 dark:hover:bg-teal-900/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isEvaluating ? 'Analyzing Vitals...' : 'AI Acuity Review'}</span>
                    </button>

                    {rec.status === 'triage_queue' && (
                      <button
                        onClick={() => {
                          setEditingBedId(rec.id);
                          setBedInput(rec.bedLocation || 'Acute Bay 1');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <BedDouble className="w-3.5 h-3.5" />
                        <span>Assign Bed</span>
                      </button>
                    )}

                    {rec.status === 'bed_assigned' && (
                      <button
                        onClick={() => onUpdateTriage(rec.id, { status: 'physician_eval' })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors cursor-pointer"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Start Physician Eval</span>
                      </button>
                    )}

                    {rec.status !== 'discharged' && (
                      <button
                        onClick={() => onUpdateTriage(rec.id, { status: 'discharged' })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Clear / Discharge</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Bed Assignment Prompt */}
                {editingBedId === rec.id && (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <input
                      type="text"
                      value={bedInput}
                      onChange={(e) => setBedInput(e.target.value)}
                      placeholder="e.g. Acute Cardiac Bay 4"
                      className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                    />
                    <button
                      onClick={() => handleAssignBed(rec.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-md cursor-pointer"
                    >
                      Confirm Bay
                    </button>
                    <button
                      onClick={() => setEditingBedId(null)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Vitals Telemetry Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Heart Rate</div>
                    <div
                      className={`mt-1 font-mono tabular-nums text-base font-bold ${
                        rec.vitals.heartRate > 110 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {rec.vitals.heartRate} <span className="text-xs font-normal text-slate-500">bpm</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Blood Pressure</div>
                    <div className="mt-1 font-mono tabular-nums text-base font-bold text-slate-900 dark:text-white">
                      {rec.vitals.bloodPressure} <span className="text-xs font-normal text-slate-500">mmHg</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">SpO2 Sat</div>
                    <div
                      className={`mt-1 font-mono tabular-nums text-base font-bold ${
                        rec.vitals.spo2 < 95 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {rec.vitals.spo2}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Temperature</div>
                    <div className="mt-1 font-mono tabular-nums text-base font-bold text-slate-900 dark:text-white">
                      {rec.vitals.temperature}°F
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Resp Rate</div>
                    <div className="mt-1 font-mono tabular-nums text-base font-bold text-slate-900 dark:text-white">
                      {rec.vitals.respiratoryRate} <span className="text-xs font-normal text-slate-500">/min</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Pain Scale</div>
                    <div
                      className={`mt-1 font-mono tabular-nums text-base font-bold ${
                        rec.painScale >= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {rec.painScale}/10
                    </div>
                  </div>
                </div>

                {/* Routing & AI Decision Support */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500 dark:text-slate-400">Current Bay / Location</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {rec.bedLocation || 'Unassigned (Waiting Triage)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500 dark:text-slate-400">Routing Physician</span>
                      <select
                        value={rec.assignedDoctorId || ''}
                        onChange={(e) => onUpdateTriage(rec.id, { assignedDoctorId: e.target.value })}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 cursor-pointer"
                      >
                        <option value="">Assign Specialist...</option>
                        {doctors.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.specialty})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500 dark:text-slate-400">Workflow Stage</span>
                      <span className="font-semibold capitalize text-teal-600 dark:text-teal-400">
                        {rec.status.replace('_', ' ')}
                        {assignedDoc ? ` · ${assignedDoc.name}` : ''}
                      </span>
                    </div>
                    {rec.clinicalNotes && (
                      <div className="pt-1 text-slate-600 dark:text-slate-400">
                        <span className="font-medium text-slate-800 dark:text-slate-200">Nursing Notes: </span>
                        {rec.clinicalNotes}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
                    <div className="font-semibold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                      <span>Clinical Differential &amp; Tele-Triage Guidance</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {rec.aiDifferentialSummary || 'Click "AI Acuity Review" to generate automated ESI justification and differential priorities.'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
