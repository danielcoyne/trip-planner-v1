import { startOfDay } from 'date-fns';

/**
 * Date-only utilities to avoid UTC/timezone drift.
 *
 * IMPORTANT: All trip/segment dates are DATE-ONLY values.
 * Use these helpers to ensure "2026-01-10" always means Jan 10 in local time.
 */

/**
 * Convert a Date to local YYYY-MM-DD string.
 * Use this when submitting dates to API/server actions.
 */
export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to local Date.
 * Use this when receiving date-only strings from API/DB.
 */
export function fromYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/**
 * Normalize a Date to start of local day (00:00:00.000).
 * Use for date comparisons.
 */
export function startOfLocalDay(date: Date): Date {
  return startOfDay(date);
}
