/**
 * Shared label and emoji mappings for trip idea categories and states.
 */

export const CATEGORY_EMOJIS: Record<string, string> = {
  RESTAURANT: '🍽️',
  COFFEE: '☕',
  BAR: '🍸',
  ATTRACTION: '📍',
  MUSEUM: '🏛️',
  TOUR: '🚶',
  HOTEL: '🏨',
  AIRBNB: '🏠',
  ACTIVITY: '🎯',
  TRANSPORT: '🚗',
};

export const CATEGORY_LABELS: Record<string, string> = {
  RESTAURANT: 'Restaurant',
  COFFEE: 'Coffee & Café',
  BAR: 'Bar & Cocktails',
  ATTRACTION: 'Attraction',
  MUSEUM: 'Museum',
  TOUR: 'Tour',
  HOTEL: 'Hotel',
  AIRBNB: 'Airbnb / VRBO',
  ACTIVITY: 'Activity',
  TRANSPORT: 'Transport',
};

/** Planning view state display — colored dots with labels */
export const STATE_DISPLAY: Record<string, { dot: string; label: string }> = {
  ANCHOR: { dot: '🔴', label: 'Must-do' },
  FLEXIBLE: { dot: '🟡', label: 'May-do' },
  SPONTANEOUS: { dot: '🟢', label: 'Spontaneous' },
};

/** Itinerary view state emojis */
export const STATE_EMOJIS: Record<string, string> = {
  ANCHOR: '🎯',
  FLEXIBLE: '🔄',
  SPONTANEOUS: '✨',
};

/** Itinerary view state card colors (Tailwind classes) */
export const STATE_COLORS: Record<string, string> = {
  ANCHOR: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  FLEXIBLE: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  SPONTANEOUS: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
};
