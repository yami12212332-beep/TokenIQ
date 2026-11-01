import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: {
    text: string;
    variant?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  };
  icon?: LucideIcon;
  variant?: 'default' | 'highlight' | 'warning';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  badge,
  icon: Icon,
  variant = 'default',
}) => {
  const getCardBg = () => {
    switch (variant) {
      case 'highlight':
        return 'bg-gradient-to-br from-indigo-50/80 to-white border-indigo-100 shadow-sm';
      case 'warning':
        return 'bg-gradient-to-br from-amber-50/70 to-white border-amber-200 shadow-sm';
      default:
        return 'bg-white border-slate-200 shadow-xs';
    }
  };

  const getBadgeClass = (v?: string) => {
    switch (v) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rose':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className={`p-4 rounded-xl border transition-all hover:border-slate-300 ${getCardBg()}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-slate-100/80 text-slate-600">
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {badge && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getBadgeClass(badge.variant)}`}>
            {badge.text}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-1.5 text-xs text-slate-500 leading-relaxed truncate" title={subtext}>
          {subtext}
        </p>
      )}
    </div>
  );
};
