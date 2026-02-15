/**
 * Shared trip planning logic — day calculation, idea sorting, and filtering.
 */

import { coerceDateOnly } from '@/lib/dateOnly';
import type { TripIdea } from '@/types/trip';

export interface TripDay {
  number: number;
  date: Date;
  formatted: string;
}

/**
 * Build an array of day objects for the trip's date range.
 * `formatOptions` controls the weekday inclusion:
 *   - 'short' (default): "January 5, 2026"
 *   - 'long': "Monday, January 5, 2026"
 */
export function getTripDays(
  startDate: string,
  endDate: string,
  formatOptions: 'short' | 'long' = 'short'
): TripDay[] {
  const start = coerceDateOnly(startDate);
  const end = coerceDateOnly(endDate);
  const days: TripDay[] = [];
  const currentDate = new Date(start);
  let dayNumber = 1;

  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  };
  if (formatOptions === 'long') {
    options.weekday = 'long';
  }

  while (currentDate <= end) {
    days.push({
      number: dayNumber,
      date: new Date(currentDate),
      formatted: currentDate.toLocaleDateString('en-US', options),
    });
    currentDate.setDate(currentDate.getDate() + 1);
    dayNumber++;
  }
  return days;
}

/** Return ideas assigned to a given day number (including multi-day spans). */
export function getIdeasForDay(ideas: TripIdea[], dayNumber: number): TripIdea[] {
  return ideas.filter((idea) => {
    if (!idea.day) return false;
    if (!idea.endDay) return idea.day === dayNumber;
    return idea.day <= dayNumber && dayNumber <= idea.endDay;
  });
}

/**
 * Sort ideas within a day for the planning view.
 *
 * Priority: sortOrder → lodging first → time → meal slot → createdAt
 */
export function sortIdeasForDay(dayIdeas: TripIdea[]): TripIdea[] {
  const mealOrder: Record<string, number> = { BREAKFAST: 1, LUNCH: 2, DINNER: 3, SNACK: 4 };

  return [...dayIdeas].sort((a, b) => {
    // 1. sortOrder ascending (nulls last)
    const aSort = a.sortOrder ?? Infinity;
    const bSort = b.sortOrder ?? Infinity;
    if (aSort !== bSort) return aSort - bSort;

    // 2. Hotels/Airbnbs first
    const aIsLodging = a.category === 'HOTEL' || a.category === 'AIRBNB';
    const bIsLodging = b.category === 'HOTEL' || b.category === 'AIRBNB';
    if (aIsLodging && !bIsLodging) return -1;
    if (!aIsLodging && bIsLodging) return 1;

    // 3. Time ascending (HH:MM strings sort correctly)
    const aTime = a.time || '';
    const bTime = b.time || '';
    if (aTime !== bTime) return aTime < bTime ? -1 : 1;

    // 4. Meal slot order
    const aMeal = a.mealSlot ? mealOrder[a.mealSlot] || 99 : 99;
    const bMeal = b.mealSlot ? mealOrder[b.mealSlot] || 99 : 99;
    if (aMeal !== bMeal) return aMeal - bMeal;

    // 5. createdAt
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });
}

/**
 * Sort ideas for the itinerary (read-only) view.
 *
 * Priority: lodging first → restaurants by meal slot → createdAt
 */
export function sortIdeasForItinerary(dayIdeas: TripIdea[]): TripIdea[] {
  const mealOrder: Record<string, number> = { BREAKFAST: 1, LUNCH: 2, DINNER: 3, SNACK: 4 };

  return [...dayIdeas].sort((a, b) => {
    // Hotels first
    if (a.category === 'HOTEL' && b.category !== 'HOTEL') return -1;
    if (a.category !== 'HOTEL' && b.category === 'HOTEL') return 1;

    // Restaurants next, ordered by meal slot
    if (a.category === 'RESTAURANT' && b.category !== 'RESTAURANT') return -1;
    if (a.category !== 'RESTAURANT' && b.category === 'RESTAURANT') return 1;

    if (a.category === 'RESTAURANT' && b.category === 'RESTAURANT') {
      const aMeal = a.mealSlot ? mealOrder[a.mealSlot] || 99 : 99;
      const bMeal = b.mealSlot ? mealOrder[b.mealSlot] || 99 : 99;
      if (aMeal !== bMeal) return aMeal - bMeal;
    }

    // Then by creation time
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });
}
