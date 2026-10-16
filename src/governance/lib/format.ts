/** Number formatting for KPI tiles, axes and tables. */

// Snowflake sends decimal columns as strings ("80.6"), so everything here
// coerces before formatting.
export type Numeric = number | string | null | undefined;

function num(value: Numeric): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatNumber(value: Numeric, decimals = 0) {
  const n = num(value);
  if (n === null) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 1240000 -> "1.2M". Use on axes and dense tiles. */
export function formatCompact(value: Numeric) {
  const n = num(value);
  if (n === null) return '—';
  return n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
}

export function formatCurrency(value: Numeric, compact = false) {
  const n = num(value);
  if (n === null) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  });
}

/** 0.042 -> "+4.2%". Pass `alreadyPercent` when the value is 4.2, not 0.042. */
export function formatPercent(
  value: Numeric,
  { decimals = 1, sign = false, alreadyPercent = false } = {}
) {
  const n = num(value);
  if (n === null) return '—';
  const pct = alreadyPercent ? n : n * 100;
  const prefix = sign && pct > 0 ? '+' : '';
  return `${prefix}${pct.toFixed(decimals)}%`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
