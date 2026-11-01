import React, { useState } from 'react';
import { formatNumber, formatPercent, formatUSD } from '../../utils/analytics';

export interface LineSeries {
  key: string;
  name: string;
  color: string;
  strokeWidth?: number;
  dashed?: boolean;
}

export interface TrendChartProps {
  data: Array<{ label: string; [key: string]: any }>;
  series: LineSeries[];
  height?: number;
  yUnit?: string;
  title?: string;
  subtitle?: string;
}

export const TrendLineChart: React.FC<TrendChartProps> = ({
  data,
  series,
  height = 240,
  yUnit = '',
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-sm text-slate-400">No trend data available</div>;
  }

  // Calculate scales
  let maxValue = 0;
  for (const pt of data) {
    for (const s of series) {
      const val = Number(pt[s.key] ?? 0);
      if (val > maxValue) maxValue = val;
    }
  }
  maxValue = Math.ceil(maxValue * 1.15) || 100;

  const width = 600;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const getX = (index: number) => paddingLeft + (data.length > 1 ? index / (data.length - 1) : 0.5) * plotWidth;
  const getY = (value: number) => paddingTop + plotHeight - (value / maxValue) * plotHeight;

  const yTicks = [0, Math.round(maxValue * 0.33), Math.round(maxValue * 0.66), maxValue];

  // Which points get an x-axis label: evenly spaced, never more than MAX_X_LABELS
  const MAX_X_LABELS = 6;
  const labelCount = Math.min(data.length, MAX_X_LABELS);
  const labelIndices = Array.from(new Set(
    Array.from({ length: labelCount }, (_, k) =>
      labelCount === 1 ? 0 : Math.round((k * (data.length - 1)) / (labelCount - 1)),
    ),
  ));
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const axisLabel = (pt: { label: string; date?: string }) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(pt.date || '');
    if (m) return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}`;      // 2026-10-01 -> "Oct 1"
    return String(pt.label).replace(/,?\s*\d{4}$/, '');               // "Oct 01, 2026" -> "Oct 01"
  };

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Horizontal Grid lines */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick}{yUnit}
              </text>
            </g>
          );
        })}

        {/* X-axis labels: at most ~6, evenly spaced from first to last point, short format (e.g. "Oct 1") */}
        {labelIndices.map((i) => {
          const x = getX(i);
          return (
            <g key={i}>
              <line x1={x} y1={paddingTop + plotHeight} x2={x} y2={paddingTop + plotHeight + 4} stroke="#cbd5e1" strokeWidth="1" />
              <text
                x={x}
                y={height - 12}
                textAnchor="middle"
                className="text-[10px] fill-slate-400"
              >
                {axisLabel(data[i])}
              </text>
            </g>
          );
        })}

        {/* Lines */}
        {series.map((s) => {
          const points = data.map((pt, i) => `${getX(i)},${getY(Number(pt[s.key] ?? 0))}`).join(' ');
          return (
            <g key={s.key}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={s.strokeWidth || 2.5}
                strokeDasharray={s.dashed ? '4 4' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
              {data.map((pt, i) => (
                <circle
                  key={i}
                  cx={getX(i)}
                  cy={getY(Number(pt[s.key] ?? 0))}
                  r={hoverIndex === i ? 4.5 : 2.5}
                  fill={s.color}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              ))}
            </g>
          );
        })}

        {/* Hover overlay columns */}
        {data.map((_, i) => {
          const x = getX(i);
          const colWidth = plotWidth / data.length;
          return (
            <rect
              key={i}
              x={x - colWidth / 2}
              y={paddingTop}
              width={colWidth}
              height={plotHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}

        {/* Active hover line */}
        {hoverIndex !== null && (
          <line
            x1={getX(hoverIndex)}
            y1={paddingTop}
            x2={getX(hoverIndex)}
            y2={paddingTop + plotHeight}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        )}
      </svg>

      {/* Floating Tooltip */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900/95 text-white p-2.5 rounded-lg shadow-xl text-xs backdrop-blur-xs border border-slate-700 -translate-x-1/2 -translate-y-full"
          style={{
            left: `${((getX(hoverIndex) / width) * 100)}%`,
            top: `${(getY(Number(data[hoverIndex][series[0]?.key] ?? 0)) / height) * 100}%`,
          }}
        >
          <div className="font-semibold text-slate-200 border-b border-slate-700/80 pb-1 mb-1.5 flex items-center justify-between gap-4">
            <span>{data[hoverIndex].label}</span>
            <span className="text-[10px] text-slate-400 font-mono">{data[hoverIndex].date || ''}</span>
          </div>
          <div className="space-y-1">
            {series.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}:
                </span>
                <span className="font-mono font-medium text-white">
                  {formatNumber(Number(data[hoverIndex][s.key] ?? 0))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export interface BarItem {
  /** Optional stable key; used for selection when names can repeat (e.g. EVPs grouped by user id) */
  id?: string;
  name: string;
  active: number;
  idle: number;
  total: number;
  pct: number;
  cost?: number;
  prompts?: number;
}

export const StackedHorizontalBarChart: React.FC<{
  data: BarItem[];
  activeColor?: string;
  idleColor?: string;
  activeLabel?: string;
  idleLabel?: string;
  onSelect?: (name: string) => void;
  selectedName?: string | null;
  /** Max height of the scrollable list (px). Rows scroll inside; summary and legend stay fixed. */
  maxListHeight?: number;
}> = ({
  data,
  activeColor = '#4f46e5',
  idleColor = '#e2e8f0',
  activeLabel = 'Active Users',
  idleLabel = 'Idle',
  onSelect,
  selectedName,
  maxListHeight = 340,
}) => {
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  // Spend highlighting (only when the rows carry a cost)
  const hasCost = data.some((d) => d.cost !== undefined);
  const totalCost = data.reduce((sum, d) => sum + (d.cost || 0), 0);
  const topCost = data.reduce((best, d) => ((d.cost || 0) > (best?.cost || 0) ? d : best), data[0]);
  // soft tints derived from the chart's own accent colour, so the card keeps the page theme
  const tint = (alpha: string) => `${activeColor}${alpha}`;

  return (
    <div className="space-y-2.5 w-full">
      {/* Scrollable list: keeps the card a fixed height however many groups there are */}
      <div
        className="space-y-2.5 overflow-y-auto pr-1.5 -mr-1.5"
        style={{ maxHeight: maxListHeight, scrollbarWidth: 'thin' }}
        tabIndex={0}
        aria-label="Scrollable list"
      >
        {data.map((item) => {
          const activePct = (item.active / item.total) * 100;
          const idlePct = 100 - activePct;
          const isSelected = selectedName === (item.id ?? item.name);
          const isTop = hasCost && totalCost > 0 && (item.cost || 0) === (topCost?.cost || 0); // ties are all highlighted
          const share = totalCost > 0 && item.cost !== undefined ? (item.cost / totalCost) * 100 : 0;

          return (
            <div
              key={item.id ?? item.name}
              onClick={() => onSelect?.(item.id ?? item.name)}
              className={`group p-2 rounded-lg transition-colors cursor-pointer border ${
                isSelected ? 'bg-indigo-50/70 border-indigo-200' : 'bg-transparent border-transparent hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="font-semibold text-slate-800 text-[13px] truncate">{item.name}</span>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-mono text-[11px] text-slate-600">
                    <strong className="text-slate-900">{item.active}</strong> of {item.total}{' '}
                    <span className="text-slate-400">({formatPercent(item.pct)})</span>
                  </span>
                  {item.cost !== undefined && (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold font-mono border shadow-2xs"
                      style={
                        isTop
                          ? { backgroundColor: activeColor, color: '#ffffff', borderColor: activeColor }
                          : { backgroundColor: tint('14'), color: activeColor, borderColor: tint('33') }
                      }
                      title={`Seat spend${totalCost > 0 ? `: ${share.toFixed(1)}% of total` : ''}`}
                    >
                      {formatUSD(item.cost)}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${(item.active / maxTotal) * 100}%`, backgroundColor: activeColor }}
                  className="h-full transition-all duration-300"
                  title={`${activeLabel}: ${item.active}`}
                />
                <div
                  style={{ width: `${(item.idle / maxTotal) * 100}%`, backgroundColor: idleColor }}
                  className="h-full transition-all duration-300"
                  title={`${idleLabel}: ${item.idle}`}
                />
              </div>

              {item.cost !== undefined && totalCost > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: tint('14') }}>
                    <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: tint('99') }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium w-24 text-right">{share.toFixed(0)}% of total spend</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-4 pt-1 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: activeColor }} />
          <span>{activeLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: idleColor }} />
          <span>{idleLabel}</span>
        </div>
      </div>
    </div>
  );
};

export interface DonutSegment {
  name: string;
  count: number;
  cost?: number;
  color: string;
  definition?: string;
}

export const DonutChart: React.FC<{
  segments: DonutSegment[];
  totalLabel?: string;
  size?: number;
}> = ({ segments, totalLabel = 'Total Users', size = 180 }) => {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const [hoverSegment, setHoverSegment] = useState<DonutSegment | null>(null);

  // SVG coordinates
  const center = size / 2;
  const radius = size * 0.38;
  const strokeWidth = size * 0.18;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
      <div className="relative shrink-0 select-none">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {segments.map((seg) => {
            const pct = total > 0 ? seg.count / total : 0;
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += pct * circumference;

            const isHovered = hoverSegment?.name === seg.name;

            return (
              <circle
                key={seg.name}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoverSegment(seg)}
                onMouseLeave={() => setHoverSegment(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xl font-bold text-slate-800 tracking-tight font-mono">
            {hoverSegment ? formatNumber(hoverSegment.count) : formatNumber(total)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
            {hoverSegment ? hoverSegment.name.split(' (')[0] : totalLabel}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 w-full text-xs">
        {segments.map((seg) => {
          const pct = total > 0 ? (seg.count / total) * 100 : 0;
          return (
            <div
              key={seg.name}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100"
              onMouseEnter={() => setHoverSegment(seg)}
              onMouseLeave={() => setHoverSegment(null)}
            >
              <div className="flex items-start gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: seg.color }} />
                <div>
                  <div className="font-semibold text-slate-800 leading-tight">{seg.name}</div>
                  {seg.definition && (
                    <div className="text-[10.5px] text-slate-500 font-normal leading-tight mt-0.5">{seg.definition}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono shrink-0 pl-2">
                <span className="font-bold text-slate-900">{formatNumber(seg.count)}</span>
                <span className="text-slate-400 text-[11px]">({formatPercent(pct, 0)})</span>
                {seg.cost !== undefined && (
                  <span className="text-slate-500 font-medium text-[11px] ml-1">{formatUSD(seg.cost)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface ScatterPoint {
  name: string;
  x: number; // utilization / adoption %
  y: number; // prompts or tokens per active
  size: number; // headcount or licenses
}

export const AdoptionScatterPlot: React.FC<{
  points: ScatterPoint[];
  xLabel?: string;
  yLabel?: string;
  avgX?: number;
  avgY?: number;
}> = ({
  points,
  xLabel = 'Adoption Rate (%)',
  yLabel = 'Prompts / Active User',
  avgX,
  avgY,
}) => {
  const [hoverPoint, setHoverPoint] = useState<ScatterPoint | null>(null);

  const width = 500;
  const height = 260;
  const padL = 45;
  const padR = 25;
  const padT = 20;
  const padB = 40;

  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxX = 100;
  const maxY = Math.max(...points.map((p) => p.y), 1) * 1.25;

  const getX = (val: number) => padL + (val / maxX) * plotW;
  const getY = (val: number) => padT + plotH - (val / maxY) * plotH;

  const computedAvgX = avgX ?? (points.reduce((a, b) => a + b.x, 0) / points.length || 50);
  const computedAvgY = avgY ?? (points.reduce((a, b) => a + b.y, 0) / points.length || maxY / 2);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {/* Background Grid */}
        <line x1={padL} y1={padT} x2={width - padR} y2={padT} stroke="#f1f5f9" />
        <line x1={padL} y1={padT + plotH / 2} x2={width - padR} y2={padT + plotH / 2} stroke="#f1f5f9" />
        <line x1={padL} y1={padT + plotH} x2={width - padR} y2={padT + plotH} stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#cbd5e1" strokeWidth="1.5" />

        {/* Quadrant averages */}
        <line
          x1={getX(computedAvgX)}
          y1={padT}
          x2={getX(computedAvgX)}
          y2={padT + plotH}
          stroke="#94a3b8"
          strokeDasharray="4 4"
        />
        <line
          x1={padL}
          y1={getY(computedAvgY)}
          x2={width - padR}
          y2={getY(computedAvgY)}
          stroke="#94a3b8"
          strokeDasharray="4 4"
        />

        {/* Quadrant Labels */}
        <text x={padL + plotW - 10} y={padT + 16} textAnchor="end" className="text-[9px] fill-indigo-400 font-medium">
          Wide & Deep (High Adoption, High Depth)
        </text>
        <text x={padL + 10} y={padT + plotH - 10} textAnchor="start" className="text-[9px] fill-amber-500 font-medium">
          Under-utilized (Needs Enablement)
        </text>

        {/* Axis Labels */}
        <text x={padL + plotW / 2} y={height - 10} textAnchor="middle" className="text-[11px] fill-slate-500 font-medium">
          {xLabel}
        </text>
        <text
          x={14}
          y={padT + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${padT + plotH / 2})`}
          className="text-[11px] fill-slate-500 font-medium"
        >
          {yLabel}
        </text>

        {/* Points */}
        {points.map((pt) => {
          const cx = getX(pt.x);
          const cy = getY(pt.y);
          const r = Math.min(18, Math.max(7, Math.sqrt(pt.size) * 1.8));
          const isHover = hoverPoint?.name === pt.name;

          return (
            <g key={pt.name} className="cursor-pointer" onMouseEnter={() => setHoverPoint(pt)} onMouseLeave={() => setHoverPoint(null)}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={isHover ? '#3730a3' : '#4f46e5'}
                fillOpacity={isHover ? 0.85 : 0.6}
                stroke="#312e81"
                strokeWidth={isHover ? 2 : 1}
                className="transition-all"
              />
              <text
                x={cx}
                y={cy - r - 4}
                textAnchor="middle"
                className="text-[9px] font-medium fill-slate-700 pointer-events-none"
              >
                {pt.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoverPoint && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900 text-white p-2 rounded shadow-lg text-xs border border-slate-700 -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(getX(hoverPoint.x) / width) * 100}%`,
            top: `${(getY(hoverPoint.y) / height) * 100}%`,
          }}
        >
          <div className="font-semibold text-slate-100">{hoverPoint.name}</div>
          <div className="text-[11px] text-slate-300">
            Adoption: <span className="font-mono text-emerald-400 font-semibold">{hoverPoint.x.toFixed(1)}%</span>
          </div>
          <div className="text-[11px] text-slate-300">
            Activity: <span className="font-mono text-indigo-300 font-semibold">{formatNumber(hoverPoint.y)}</span> per active
          </div>
          <div className="text-[10px] text-slate-400">Headcount: {hoverPoint.size}</div>
        </div>
      )}
    </div>
  );
};