import React from 'react';
import {
  CalendarClock,
  Users,
  HeartPulse,
  Video,
  BellRing,
  FileCode2,
  Activity,
  Sun,
  Moon,
  RotateCcw,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeRole: string;
  setActiveRole: (role: string) => void;
  pendingTriageCount: number;
  unconfirmedCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
  onResetDemo: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeRole,
  setActiveRole,
  pendingTriageCount,
  unconfirmedCount,
  isDark,
  onToggleTheme,
  onResetDemo,
  mobileOpen,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'appointments', label: 'Clinical Schedule', icon: CalendarClock },
    { id: 'patients', label: 'Patient Orchestration', icon: Users },
    {
      id: 'triage',
      label: 'Emergency Tele-Triage',
      icon: HeartPulse,
      count: pendingTriageCount > 0 ? pendingTriageCount : undefined,
      countTone: 'rose',
    },
    { id: 'teleconsult', label: 'Virtual Clinic Room', icon: Video },
    {
      id: 'notifications',
      label: 'Notification Engine',
      icon: BellRing,
      count: unconfirmedCount > 0 ? unconfirmedCount : undefined,
      countTone: 'amber',
    },
    { id: 'analytics', label: 'FHIR R4 & Audit', icon: FileCode2 },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 select-none">
      {/* Brand Zone */}
      <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <button
          onClick={() => {
            setActiveTab('appointments');
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-md"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-600/10 dark:bg-teal-500/15 border border-teal-600/20 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            HealthSync CarePulse
          </span>
        </button>
        <button
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Clinical Modules">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                isActive
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {item.count !== undefined && (
                <span
                  className={`font-mono text-xs tabular-nums font-semibold ${
                    isActive
                      ? 'text-teal-100'
                      : item.countTone === 'rose'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Clinical Role & Preferences */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <div>
          <label
            htmlFor="clinical-role-select"
            className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5"
          >
            Active Clinical Role
          </label>
          <select
            id="clinical-role-select"
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="Coordinator">Front Desk Coordinator</option>
            <option value="Physician">Attending Physician (Dr. Vance)</option>
            <option value="TriageNurse">Emergency Triage Nurse (Elena)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            onClick={onResetDemo}
            title="Restore initial clinical dataset"
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-500 pt-1 leading-relaxed">
          HL7 FHIR R4 · HIPAA Audit Active
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
