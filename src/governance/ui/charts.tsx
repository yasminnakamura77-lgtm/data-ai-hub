import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

import { cn } from '@/governance/lib/utils';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

/**
 * Chart colors. Charts draw on a canvas where `var(--token)` never resolves,
 * so these are literal colors — a CSS variable here renders as nothing.
 */
export const CHART = {
  primary: 'oklch(0.55 0.18 260)',
  green: 'oklch(0.65 0.18 160)',
  amber: 'oklch(0.75 0.16 80)',
  red: 'oklch(0.55 0.18 20)',
  purple: 'oklch(0.55 0.16 300)',
  blue: 'oklch(0.65 0.14 220)',
  orange: 'oklch(0.6 0.2 40)',
  teal: 'oklch(0.5 0.1 150)',
  muted: 'oklch(0.72 0.03 260)',
} as const;

export const CATEGORICAL = [
  CHART.primary,
  CHART.green,
  CHART.amber,
  CHART.red,
  CHART.purple,
  CHART.blue,
  CHART.orange,
  CHART.teal,
];

export interface Series {
  label: string;
  /** Strings are fine — Snowflake returns decimals as strings, and these are coerced. */
  data: Array<number | string | null>;
  color?: string;
}

const nums = (data: Series['data']) => data.map((value) => (value === null ? null : Number(value)));

/** Canvas text does not inherit CSS color tokens, so observe the document theme and
 * pass explicit contrast-safe colors to Chart.js. */
function useChartTheme() {
  const readDark = () => {
    if (typeof document === 'undefined') return false;
    const elements = [document.documentElement, document.body].filter(Boolean);
    return elements.some((element) =>
      element.classList.contains('dark') || element.dataset.theme === 'dark' || element.dataset.mode === 'dark'
    );
  };
  const [dark, setDark] = useState(readDark);

  useEffect(() => {
    const sync = () => setDark(readDark());
    const observer = new MutationObserver(sync);
    const attributes = { attributes: true, attributeFilter: ['class', 'data-theme', 'data-mode'] } as const;
    observer.observe(document.documentElement, attributes);
    if (document.body) observer.observe(document.body, attributes);
    sync();
    return () => observer.disconnect();
  }, []);

  return {
    dark,
    text: dark ? '#d6e0ef' : '#64748b',
    grid: dark ? 'rgba(180,196,218,0.18)' : 'rgba(100,116,139,0.16)',
    border: dark ? '#34445a' : '#d7dee8',
    tooltipBackground: dark ? '#111c2d' : '#ffffff',
    tooltipBorder: dark ? '#34445a' : '#dbe3ed',
    tooltipText: dark ? '#edf3fc' : '#243247',
  };
}

function chartChrome(theme: ReturnType<typeof useChartTheme>) {
  return {
    legend: {
      labels: { color: theme.text },
    },
    tooltip: {
      backgroundColor: theme.tooltipBackground,
      titleColor: theme.tooltipText,
      bodyColor: theme.tooltipText,
      borderColor: theme.tooltipBorder,
      borderWidth: 1,
      padding: 10,
    },
  };
}

function translucent(color: string) {
  return color.startsWith('oklch(') ? color.replace(')', ' / 18%)') : color;
}

function Frame({ height, className, children }: { height: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      {children}
    </div>
  );
}

export function LineChart({
  labels,
  series,
  area = false,
  height = 240,
  options,
  className,
}: {
  labels: string[];
  series: Series[];
  /** Fill under the line. */
  area?: boolean;
  height?: number;
  options?: ChartOptions<'line'>;
  className?: string;
}) {
  const theme = useChartTheme();
  const data: ChartData<'line'> = {
    labels,
    datasets: series.map((s, i) => {
      const color = s.color ?? CATEGORICAL[i % CATEGORICAL.length];
      return {
        label: s.label,
        data: nums(s.data),
        borderColor: color,
        backgroundColor: area ? translucent(color) : color,
        fill: area,
        tension: 0.3,
        pointRadius: 2,
      };
    }),
  };

  return (
    <Frame height={height} className={className}>
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { ...chartChrome(theme), legend: { ...chartChrome(theme).legend, display: series.length > 1, position: 'bottom' } },
          scales: {
            x: { ticks: { color: theme.text }, grid: { display: false }, border: { color: theme.border } },
            y: { ticks: { color: theme.text }, grid: { color: theme.grid }, border: { color: theme.border } },
          },
          ...options,
        }}
      />
    </Frame>
  );
}

export function BarChart({
  labels,
  series,
  stacked = false,
  horizontal = false,
  height = 240,
  options,
  className,
}: {
  labels: string[];
  series: Series[];
  stacked?: boolean;
  /** Bars run left-to-right. Use when labels are long, like plant or customer names. */
  horizontal?: boolean;
  height?: number;
  options?: ChartOptions<'bar'>;
  className?: string;
}) {
  const theme = useChartTheme();
  const data: ChartData<'bar'> = {
    labels,
    datasets: series.map((s, i) => ({
      label: s.label,
      data: nums(s.data),
      backgroundColor: s.color ?? CATEGORICAL[i % CATEGORICAL.length],
      borderRadius: 4,
      borderSkipped: false,
      maxBarThickness: 28,
    })),
  };

  return (
    <Frame height={height} className={className}>
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: horizontal ? 'y' : 'x',
          plugins: { ...chartChrome(theme), legend: { ...chartChrome(theme).legend, display: series.length > 1, position: 'bottom' } },
          scales: {
            x: { stacked, ticks: { color: theme.text }, grid: { display: horizontal, color: theme.grid }, border: { color: theme.border }, beginAtZero: horizontal },
            y: { stacked, ticks: { color: theme.text }, grid: { display: !horizontal, color: theme.grid }, border: { color: theme.border }, beginAtZero: !horizontal },
          },
          ...options,
        }}
      />
    </Frame>
  );
}

export function DoughnutChart({
  slices,
  centerLabel,
  height = 240,
  options,
  className,
}: {
  slices: Array<{ label: string; value: number | string; color?: string }>;
  centerLabel?: React.ReactNode;
  height?: number;
  options?: ChartOptions<'doughnut'>;
  className?: string;
}) {
  const theme = useChartTheme();
  const data: ChartData<'doughnut'> = {
    labels: slices.map((s) => s.label),
    datasets: [
      {
        data: slices.map((s) => Number(s.value)),
        backgroundColor: slices.map((s, i) => s.color ?? CATEGORICAL[i % CATEGORICAL.length]),
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      <Doughnut
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: { ...chartChrome(theme), legend: { ...chartChrome(theme).legend, position: 'bottom' } },
          ...options,
        }}
      />
      {centerLabel && (
        <div className="pointer-events-none absolute inset-0 mb-10 flex items-center justify-center">
          {centerLabel}
        </div>
      )}
    </div>
  );
}

/**
 * Keeps the biggest `max` items and sums the rest into "Other", so a chart
 * never spends more than eight colors on identity.
 */
export function groupIntoOther<T extends { label: string; value: number | string }>(items: T[], max = 7) {
  if (items.length <= max) return items;
  const sorted = [...items].sort((a, b) => Number(b.value) - Number(a.value));
  const kept = sorted.slice(0, max);
  const other = sorted.slice(max).reduce((sum, item) => sum + Number(item.value), 0);
  return [...kept, { label: 'Other', value: other } as T];
}
