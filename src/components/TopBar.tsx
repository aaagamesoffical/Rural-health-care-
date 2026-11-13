import React from 'react';
import { Menu, Plus, AlertCircle } from 'lucide-react';

interface TopBarProps {
  activeTabLabel: string;
  activeRole: string;
  onOpenMobileMenu: () => void;
  onOpenBooking: () => void;
  onOpenQuickTriage: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTabLabel,
  activeRole,
  onOpenMobileMenu,
  onOpenBooking,
  onOpenQuickTriage,
}) => {
  const roleDisplay =
    activeRole === 'Physician'
      ? 'Dr. Aris Vance'
      : activeRole === 'TriageNurse'
      ? 'Elena Rostova, RN/MD'
      : 'Sarah Jenkins';

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
      {/* Left: Contextual Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline text-slate-500 dark:text-slate-400 whitespace-nowrap">
            CarePulse Clinical
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">/</span>
          <h1 className="font-semibold text-slate-900 dark:text-white truncate">
            {activeTabLabel}
          </h1>
          <span className="hidden md:inline text-slate-300 dark:text-slate-700">·</span>
          <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400 truncate">
            Signed in as {roleDisplay}
          </span>
        </div>
      </div>

      {/* Right: At most 2 primary actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenQuickTriage}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/70 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span className="hidden sm:inline">Rapid Triage</span>
          <span className="sm:hidden">Triage</span>
        </button>

        <button
          onClick={onOpenBooking}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Book Appointment</span>
          <span className="sm:hidden">Book</span>
        </button>
      </div>
    </header>
  );
};
