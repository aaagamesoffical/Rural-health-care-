import React, { useState, useMemo } from 'react';
import {
  Send,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  Mail,
  Smartphone,
  Bell,
  Clock,
} from 'lucide-react';
import {
  NotificationLog,
  Appointment,
  Patient,
  Doctor,
  NotificationChannel,
} from '../types';
import { requestGeminiAssist } from '../utils/api';

interface NotificationsViewProps {
  notifications: NotificationLog[];
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  onDispatchNotification: (notif: Partial<NotificationLog>) => Promise<void>;
  onSimulatePatientReply: (id: string, confirmed: boolean) => Promise<void>;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  appointments,
  patients,
  doctors,
  onDispatchNotification,
  onSimulatePatientReply,
}) => {
  const [channelFilter, setChannelFilter] = useState<'ALL' | NotificationChannel>('ALL');
  const [selectedAptId, setSelectedAptId] = useState<string>(appointments[0]?.id || '');
  const [channel, setChannel] = useState<NotificationChannel>('whatsapp');
  const [messageText, setMessageText] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const selectedApt = useMemo(
    () => appointments.find((a) => a.id === selectedAptId) || appointments[0] || null,
    [appointments, selectedAptId]
  );

  const filteredLogs = useMemo(() => {
    return notifications.filter((n) => (channelFilter === 'ALL' ? true : n.channel === channelFilter));
  }, [notifications, channelFilter]);

  const stats = useMemo(() => {
    const total = notifications.length;
    const confirmed = notifications.filter((n) => n.deliveryStatus === 'confirmed').length;
    const pending = notifications.filter(
      (n) => n.deliveryStatus === 'dispatched' || n.deliveryStatus === 'delivered'
    ).length;
    const confirmPct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    return { total, confirmed, pending, confirmPct };
  }, [notifications]);

  const handleAiDraft = async () => {
    if (!selectedApt) return;
    const patient = patients.find((p) => p.id === selectedApt.patientId);
    const doctor = doctors.find((d) => d.id === selectedApt.doctorId);
    if (!patient || !doctor) return;

    setDrafting(true);
    try {
      const res = await requestGeminiAssist('reminder_tone', {
        patientName: `${patient.firstName} ${patient.lastName}`,
        dateTime: `${selectedApt.appointmentDate} at ${selectedApt.startTime}`,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        isTeleconsult: selectedApt.visitType === 'teleconsult',
        channel,
      });
      setMessageText(res.content);
    } finally {
      setDrafting(false);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApt || !messageText.trim()) return;
    const patient = patients.find((p) => p.id === selectedApt.patientId);
    if (!patient) return;

    setDispatching(true);
    try {
      await onDispatchNotification({
        appointmentId: selectedApt.id,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        recipientContact: channel === 'email' ? patient.email : patient.phone,
        channel,
        templateType: selectedApt.visitType === 'teleconsult' ? '2h_teleconsult_link' : '24h_reminder',
        messageBody: messageText.trim(),
        deliveryStatus: 'dispatched',
      });
      setMessageText('');
    } finally {
      setDispatching(false);
    }
  };

  const channelIcon = (ch: NotificationChannel) => {
    switch (ch) {
      case 'whatsapp':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
      case 'sms':
        return <Smartphone className="w-3.5 h-3.5 text-sky-500" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-teal-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Alerts Dispatched</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
            {stats.total}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Two-Way Confirmations</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.confirmed} <span className="text-xs font-normal text-slate-500">({stats.confirmPct}%)</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Awaiting Patient Reply</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.pending}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">No-Show Rate vs Baseline</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-teal-600 dark:text-teal-400">
            4.2% <span className="text-xs font-normal text-slate-500">vs 18.4% avg</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Composer */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Multi-Channel Alert Dispatcher
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compose and transmit HIPAA-safe appointment reminders across WhatsApp, SMS, and Email.
            </p>
          </div>

          <form onSubmit={handleDispatch} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Appointment
              </label>
              <select
                value={selectedAptId}
                onChange={(e) => setSelectedAptId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {appointments
                  .filter((a) => a.status !== 'cancelled')
                  .map((apt) => {
                    const p = patients.find((x) => x.id === apt.patientId);
                    const d = doctors.find((x) => x.id === apt.doctorId);
                    return (
                      <option key={apt.id} value={apt.id}>
                        {apt.appointmentDate} {apt.startTime} · {p ? `${p.firstName} ${p.lastName}` : 'Patient'} ({d?.specialty})
                      </option>
                    );
                  })}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Delivery Channel
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
                {(['whatsapp', 'sms', 'email', 'push'] as NotificationChannel[]).map((ch) => (
                  <button
                    type="button"
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`py-1.5 text-xs font-medium rounded-md capitalize transition-colors cursor-pointer ${
                      channel === ch
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Message Payload</label>
                <button
                  type="button"
                  onClick={handleAiDraft}
                  disabled={drafting || !selectedApt}
                  className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-semibold hover:underline cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{drafting ? 'Drafting...' : 'Draft Empathetic Copy (AI)'}</span>
                </button>
              </div>
              <textarea
                required
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Click 'Draft Empathetic Copy (AI)' or enter custom reminder instructions..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={dispatching || !messageText.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{dispatching ? 'Dispatching...' : `Dispatch via ${channel.toUpperCase()}`}</span>
            </button>
          </form>
        </div>

        {/* Right: Dispatch Ledger & Two-Way Simulator */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Two-Way Notification Ledger ({filteredLogs.length})
            </h2>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
              {(['ALL', 'whatsapp', 'sms', 'email'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(ch)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors cursor-pointer ${
                    channelFilter === ch
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {ch === 'ALL' ? 'All Channels' : ch}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {channelIcon(log.channel)}
                    <span className="font-semibold text-slate-900 dark:text-white">{log.patientName}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">{log.recipientContact}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.deliveryStatus === 'confirmed' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400 capitalize">
                        <Clock className="w-3.5 h-3.5" />
                        {log.deliveryStatus}
                      </span>
                    )}
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {new Date(log.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                  {log.messageBody}
                </p>

                {log.responsePayload ? (
                  <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                    Inbound Webhook: {log.responsePayload}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-500 dark:text-slate-400">Simulate patient reply:</span>
                    <button
                      onClick={() => onSimulatePatientReply(log.id, true)}
                      className="px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer"
                    >
                      Reply "1 - Confirm"
                    </button>
                    <button
                      onClick={() => onSimulatePatientReply(log.id, false)}
                      className="px-2.5 py-1 font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer"
                    >
                      Reply "2 - Reschedule"
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
