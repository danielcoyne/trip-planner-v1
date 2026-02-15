/**
 * Shared date/time formatting utilities.
 */

import { coerceDateOnly } from '@/lib/dateOnly';

/** Format "19:30" → "7:30 PM" */
export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/** Format a date string as "January 5, 2026" */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format a date string as "Jan 5, 10:30 AM" (for timestamps like suggestions) */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Format a date range as "January 5, 2026 – January 12, 2026" */
export function formatDateRange(startDate: string, endDate: string): string {
  const startFormatted = formatDate(startDate);
  const endFormatted = formatDate(endDate);
  return `${startFormatted} – ${endFormatted}`;
}

/**
 * Convert a date string (YYYY-MM-DD) to a 1-based day number relative to
 * the trip start date.
 */
export function dateToDayNumber(dateStr: string, tripStartDate: string): number {
  const tripStart = coerceDateOnly(tripStartDate);
  const selected = coerceDateOnly(dateStr);
  const diffTime = selected.getTime() - tripStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/** Format a date string for display: "January 5, 2026" (using Date constructor) */
export function formatDateDisplay(dateStr: string): string {
  const date = coerceDateOnly(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format a date range for display with day numbers */
export function formatDateRangeDisplay(
  startStr: string,
  endStr: string,
  tripStartDate: string
): string {
  const start = coerceDateOnly(startStr);
  const end = coerceDateOnly(endStr);
  const startDay = dateToDayNumber(startStr, tripStartDate);
  const endDay = dateToDayNumber(endStr, tripStartDate);

  return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (Days ${startDay}-${endDay})`;
}

/** Strip time portion from a date string for use in <input type="date"> */
export function formatDateForInput(dateStr: string): string {
  return dateStr.split('T')[0];
}

/** Format a Date object for short display: "Jan 5" or "Jan 5, 2025" if different year */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}
