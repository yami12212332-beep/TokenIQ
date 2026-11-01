import React from 'react';
import { 
  BarChart3, 
  Sparkles, 
  Bot, 
  Download, 
  Clock,
  LayoutDashboard,
  MessageSquare,

} from 'lucide-react';
import { 
  TimeGrain, 
  TimePeriodOption 
} from '../types/dashboard';

export type TabId = 'overall' | 'copilot' | 'claude' | 'chatgpt';

const TABS: Array<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  activeClass: string;
}> = [
  { id: 'overall', label: 'Overall', icon: LayoutDashboard, activeClass: 'text-indigo-700' },
  { id: 'copilot', label: 'Copilot', icon: Bot, activeClass: 'text-sky-700' },
  { id: 'claude', label: 'Anthropic Claude', icon: BarChart3, activeClass: 'text-orange-700' },
  { id: 'chatgpt', label: 'ChatGPT', icon: MessageSquare, activeClass: 'text-emerald-700' },
];

interface HeaderProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  timeGrain: TimeGrain;
  setTimeGrain: (grain: TimeGrain) => void;
  periodKey: string;
  setPeriodKey: (key: string) => void;
  availablePeriods: TimePeriodOption[];
  onExportExcel: () => void;
  reportDate?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  timeGrain,
  setTimeGrain,
  periodKey,
  setPeriodKey,
  availablePeriods,
  onExportExcel,
}) => {
  const filteredPeriods = availablePeriods.filter((p) => p.type === timeGrain);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar: TokenIQ branding (left), Michaels logo (centered) */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2.5 border-b border-slate-100">
          {/* Left: TokenIQ Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 via-rose-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-rose-100 shrink-0">
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">
                  TokenIQ
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Enterprise
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Intelligent Token &amp; AI Usage Analytics
              </div>
            </div>
          </div>

          {/* Center: Michaels client logo */}
          <div className="flex items-center justify-center">
            <img 
              src="/assets/michaels_logo.png" 
              alt="Michaels" 
              className="h-9 sm:h-10 w-auto object-contain" 
            />
          </div>

          {/* Right: empty column that keeps the logo centered */}
          <div aria-hidden="true" />
        </div>

        {/* Secondary Toolbar: Navigation Tabs on Left, Controls & Filters on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-2 gap-3">
          {/* Left: Main Navigation Tabs */}
          <nav className="flex items-center p-1 bg-slate-100/90 rounded-xl space-x-1 overflow-x-auto" aria-label="Tabs">
            {TABS.map(({ id, label, icon: Icon, activeClass }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === id
                    ? `bg-white ${activeClass} shadow-xs`
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Right: Grain Switcher, Period Selector & Excel Export */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Monthly vs Weekly Switcher */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-medium">
              <button
                onClick={() => {
                  setTimeGrain('MONTHLY');
                  setPeriodKey('2026-10');
                }}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  timeGrain === 'MONTHLY'
                    ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => {
                  setTimeGrain('WEEKLY');
                  setPeriodKey('LATEST_WEEK');
                }}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  timeGrain === 'WEEKLY'
                    ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weekly
              </button>
            </div>

            {/* Period Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <Clock size={13} className="text-slate-400" />
              <select
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
                aria-label="Select Time Period"
              >
                {filteredPeriods.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Excel Export */}
            <button
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg text-white bg-emerald-700 hover:bg-emerald-800 transition-colors border border-emerald-800 shadow-xs cursor-pointer"
              title="Download analytics dataset as Excel"
            >
              <Download size={14} />
              <span>Download Excel</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
