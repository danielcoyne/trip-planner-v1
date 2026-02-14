/**
 * Shared client-side types for trip planning data.
 *
 * These represent the JSON shapes returned by the API (dates serialized as
 * YYYY-MM-DD strings, relations inlined). Field names and optionality are
 * aligned with the Prisma schema in prisma/schema.prisma.
 */

// ---------------------------------------------------------------------------
// Nested / reusable types
// ---------------------------------------------------------------------------

export interface EventPhoto {
  id: string;
  url: string;
  sortOrder: number;
}

export interface IdeaReaction {
  id: string;
  reaction: string;
  clientNotes: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

export interface TripSegment {
  id: string;
  startDate: string;
  endDate: string;
  placeName: string;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
  notes: string | null;
}

export interface Trip {
  id: string;
  name: string;
  destination: string | null;
  startDate: string;
  endDate: string;
  currentRound: number;
  status: string;
  requirements: string | null;
  reviewToken: string | null;
  coverImageUrl: string | null;
  coverImageUpdatedAt: string | null;
  segments?: TripSegment[];
}

export interface TripIdea {
  id: string;
  placeId: string;
  category: string;
  state: string;
  status: string;
  day: number | null;
  endDay: number | null;
  sortOrder: number | null;
  mealSlot: string | null;
  agentNotes: string | null;
  time: string | null;
  externalUrl: string | null;
  photos: EventPhoto[];
  createdAt?: string;
  reactions: IdeaReaction[];
}

// ---------------------------------------------------------------------------
// Google Places cache (matches GooglePlaceCache model)
// ---------------------------------------------------------------------------

export interface Place {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  rating: number | null;
  googleMapsUri: string;
  lat: number;
  lng: number;
}

/**
 * Place result from the search API — a subset of Place with additional fields.
 * Used by PlaceSearch and AddIdeaModal when selecting from search results.
 */
export interface PlaceSearchResult {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  types: string[];
  rating?: number;
}

// ---------------------------------------------------------------------------
// Composite / view-specific types
// ---------------------------------------------------------------------------

export interface HotelSummary {
  hotel: TripIdea;
  place: Place;
  dayRange: string;
}
