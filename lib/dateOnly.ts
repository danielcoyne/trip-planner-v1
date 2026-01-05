import { startOfDay, isValid } from 'date-fns';

/**
 * Date-only utilities to avoid UTC/timezone drift.
 *
 * IMPORTANT: All trip/segment dates are DATE-ONLY values.
 * Use these helpers to ensure "2026-01-10" always means Jan 10 in local time.
 *
 * CONTRACT:
 * - SERVER → CLIENT: Always serialize dates as YYYY-MM-DD strings (use toYMD)
 * - CLIENT → SERVER: Always parse date strings using fromYMD or coerceDateOnly
 * - NEVER use new Date("YYYY-MM-DD"), toISOString(), or parseISO on date-only values
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
 * Coerce any date value (string or Date) to a local date-only Date object.
 *
 * This is the universal safe coercion function that handles:
 * - YYYY-MM-DD strings (date-only)
 * - ISO datetime strings (strips time and converts to local date)
 * - Date objects (normalizes to local day)
 *
 * Use this when you're unsure what format the date is in (e.g., API responses).
 */
export function coerceDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return startOfDay(value);
  }

  // If it's a YYYY-MM-DD string (10 chars), use fromYMD
  if (typeof value === 'string' && value.length === 10 && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return fromYMD(value);
  }

  // If it's an ISO datetime string (contains 'T'), extract date part
  if (typeof value === 'string' && value.includes('T')) {
    const datePart = value.split('T')[0];
    return fromYMD(datePart);
  }

  // Fallback: parse as-is but normalize
  return startOfDay(new Date(value));
}

/**
 * Normalize a Date to start of local day (00:00:00.000).
 * Use for date comparisons.
 */
export function startOfLocalDay(date: Date): Date {
  return startOfDay(date);
}

/**
 * Check if a Date object is valid (not Invalid Date).
 * Use before formatting or displaying dates.
 */
export function isValidDate(date: Date): boolean {
  return isValid(date);
}

/**
 * Safely format a date that might be invalid.
 * Returns formatted string or fallback if date is invalid.
 */
export function safeFormatDate(
  date: Date | undefined | null,
  formatter: (d: Date) => string,
  fallback: string = 'Invalid Date'
): string {
  if (!date || !isValidDate(date)) {
    return fallback;
  }
  try {
    return formatter(date);
  } catch {
    return fallback;
  }
}
