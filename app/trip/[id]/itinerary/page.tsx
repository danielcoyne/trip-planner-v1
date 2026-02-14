'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  buildDisplaySegments,
  findDisplaySegmentForDay,
  type TripSegment as TripSegmentType,
  type DisplaySegment,
} from '@/lib/tripSegments';
import { coerceDateOnly } from '@/lib/dateOnly';
import type { Trip, TripIdea, TripSegment, Place, HotelSummary } from '@/types/trip';

export default function ItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [ideas, setIdeas] = useState<TripIdea[]>([]);
  const [placesCache, setPlacesCache] = useState<Record<string, Place>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTripData();
  }, [id]);

  const fetchTripData = async () => {
    try {
      const response = await fetch(`/api/trips?id=${id}`);
      const data = await response.json();
      setTrip(data.trip);

      const ideasResponse = await fetch(`/api/ideas?tripId=${id}`);
      const ideasData = await ideasResponse.json();
      setIdeas(ideasData.ideas);

      // Fetch place details for each unique placeId
      const placeIds = [...new Set(ideasData.ideas.map((idea: TripIdea) => idea.placeId))];
      const places: Record<string, Place> = {};

      for (const placeId of placeIds) {
        if (typeof placeId !== 'string') continue;

        try {
          const placeResponse = await fetch(`/api/places/${placeId}`);
          const placeData = await placeResponse.json();
          if (placeData.place) {
            places[placeId] = {
              ...placeData.place,
              placeId: placeId,
            };
          }
        } catch (error) {
          console.error(`Error fetching place ${placeId}:`, error);
        }
      }

      setPlacesCache(places);
    } catch (error) {
      console.error('Error fetching trip data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="text-center text-gray-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="text-center text-gray-900 dark:text-white">Trip not found</div>
      </div>
    );
  }

  // Calculate trip days
  const getTripDays = () => {
    const start = coerceDateOnly(trip.startDate);
    const end = coerceDateOnly(trip.endDate);
    const days = [];
    let currentDate = new Date(start);
    let dayNumber = 1;

    while (currentDate <= end) {
      days.push({
        number: dayNumber,
        date: new Date(currentDate),
        formatted: currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      });
      currentDate.setDate(currentDate.getDate() + 1);
      dayNumber++;
    }
    return days;
  };

  const tripDays = getTripDays();

  // Segment logic - use REAL segments for conversion
  const realSegments: TripSegmentType[] = (trip.segments || []).map((seg) => ({
    ...seg,
    startDate: coerceDateOnly(seg.startDate),
    endDate: coerceDateOnly(seg.endDate),
  }));

  // Build display segments (includes TBD gaps)
  const displaySegments: DisplaySegment[] = buildDisplaySegments(
    coerceDateOnly(trip.startDate),
    coerceDateOnly(trip.endDate),
    realSegments
  );

  const hasMultipleDisplaySegments = displaySegments.length > 1;

  // Build segment summary from display segments
  const tripStartDate = coerceDateOnly(trip.startDate);
  const segmentSummary = hasMultipleDisplaySegments
    ? displaySegments.map((seg) => ({
        id: seg.id,
        placeName: seg.placeName,
        dayStart:
          Math.floor((seg.startDate.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24)) +
          1,
        dayEnd:
          Math.floor((seg.endDate.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      }))
    : [];

  // Header location line uses only REAL segments
  const headerLocationLine =
    realSegments.length === 1 ? realSegments[0].placeName : trip.destination || '';

  // Get lodging summary (hotels grouped by day ranges)
  const getLodgingSummary = (): HotelSummary[] => {
    const hotels = ideas.filter((idea) => idea.category === 'HOTEL' && idea.day);
    const summaries: HotelSummary[] = [];

    hotels.forEach((hotel) => {
      const place = placesCache[hotel.placeId];
      if (!place) return;

      const dayRange =
        hotel.endDay && hotel.endDay > hotel.day!
          ? `Days ${hotel.day}–${hotel.endDay}`
          : `Day ${hotel.day}`;

      summaries.push({
        hotel,
        place,
        dayRange,
      });
    });

    return summaries.sort((a, b) => (a.hotel.day || 0) - (b.hotel.day || 0));
  };

  const lodgingSummary = getLodgingSummary();

  // Group ideas by day
  const getIdeasForDay = (dayNumber: number) => {
    return ideas.filter((idea) => {
      if (!idea.day) return false;
      // Single-day idea
      if (!idea.endDay) return idea.day === dayNumber;
      // Multi-day idea: show on all days in range
      return idea.day <= dayNumber && dayNumber <= idea.endDay;
    });
  };

  // Get unassigned ideas
  const unassignedIdeas = ideas.filter((idea) => !idea.day);

  // Sort ideas within a day
  const sortIdeasForDay = (dayIdeas: TripIdea[]) => {
    const mealOrder = { BREAKFAST: 1, LUNCH: 2, DINNER: 3, SNACK: 4 };

    return dayIdeas.sort((a, b) => {
      // Hotels first
      if (a.category === 'HOTEL' && b.category !== 'HOTEL') return -1;
      if (a.category !== 'HOTEL' && b.category === 'HOTEL') return 1;

      // Restaurants next, ordered by meal slot
      if (a.category === 'RESTAURANT' && b.category !== 'RESTAURANT') return -1;
      if (a.category !== 'RESTAURANT' && b.category === 'RESTAURANT') return 1;

      // Within restaurants, sort by meal slot
      if (a.category === 'RESTAURANT' && b.category === 'RESTAURANT') {
        const aMeal = a.mealSlot ? mealOrder[a.mealSlot as keyof typeof mealOrder] || 99 : 99;
        const bMeal = b.mealSlot ? mealOrder[b.mealSlot as keyof typeof mealOrder] || 99 : 99;
        if (aMeal !== bMeal) return aMeal - bMeal;
      }

      // Then by creation time
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });
  };

  // State emoji and color mapping
  const stateEmojis = {
    ANCHOR: '🎯',
    FLEXIBLE: '🔄',
    SPONTANEOUS: '✨',
  };

  const stateColors = {
    ANCHOR: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    FLEXIBLE: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    SPONTANEOUS: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  };

  const categoryEmojis: Record<string, string> = {
    HOTEL: '🏨',
    AIRBNB: '🏠',
  };

  // Format time "19:30" → "7:30 PM"
  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const renderIdeaCard = (
    idea: TripIdea,
    isMultiDayView = false,
    currentDayNumber: number | null = null
  ) => {
    const place = placesCache[idea.placeId];
    if (!place) return null;

    const isAccommodation = idea.category === 'HOTEL' || idea.category === 'AIRBNB';
    const isFirstDayOfStay = idea.day === currentDayNumber || currentDayNumber === null;

    // Compact "continued" card for subsequent days
    if (isAccommodation && !isFirstDayOfStay) {
      return (
        <div
          key={idea.id}
          className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <span className="text-base">{categoryEmojis[idea.category] || '📍'}</span>
            <span className="font-medium text-gray-900 dark:text-white">{place.displayName}</span>
            <span className="text-gray-400 dark:text-gray-500 italic">(continued)</span>
            <span className="text-gray-400 dark:text-gray-500">•</span>
            <span className="text-gray-500 dark:text-gray-400 truncate max-w-xs">
              {place.formattedAddress}
            </span>
            {idea.externalUrl && (
              <>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <a
                  href={idea.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Property →
                </a>
              </>
            )}
            <a
              href={place.googleMapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Map →
            </a>
          </div>
        </div>
      );
    }

    // Full-size accommodation card (first day of stay or unassigned)
    if (isAccommodation && isFirstDayOfStay) {
      const nights = idea.day && idea.endDay ? idea.endDay - idea.day : null;
      const checkinDay = idea.day ? tripDays.find((d) => d.number === idea.day) : null;
      const checkoutDay = idea.endDay ? tripDays.find((d) => d.number === idea.endDay) : null;
      const checkinFormatted = checkinDay
        ? checkinDay.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null;
      const checkoutFormatted = checkoutDay
        ? checkoutDay.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null;

      // Get reaction badges
      const hasReactions = idea.reactions && idea.reactions.length > 0;
      const reactionTypes = hasReactions ? [...new Set(idea.reactions.map((r) => r.reaction))] : [];
      const reactionBadges = {
        LOVE: {
          emoji: '❤️',
          color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200',
        },
        MAYBE: {
          emoji: '🤔',
          color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
        },
        PASS: {
          emoji: '👎',
          color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
        },
      };

      return (
        <div
          key={idea.id}
          className="border-2 rounded-lg p-5 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"
        >
          <div className="flex gap-4">
            {idea.photos && idea.photos.length > 0 && (
              <img
                src={idea.photos[0].url}
                alt=""
                className="w-[120px] h-20 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-xl text-gray-900 dark:text-white mb-1">
                    {categoryEmojis[idea.category] || '📍'} {place.displayName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {place.formattedAddress}
                  </p>
                  {place.rating && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      ⭐ {place.rating}
                    </p>
                  )}
                </div>
                {hasReactions && (
                  <div className="flex gap-1 ml-4">
                    {reactionTypes.map((reaction) => {
                      const badge = reactionBadges[reaction as keyof typeof reactionBadges];
                      return (
                        <span
                          key={reaction}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
                        >
                          {badge.emoji}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {checkinFormatted && (
                <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                  Check-in {checkinFormatted}
                  {checkoutFormatted && ` → Check-out ${checkoutFormatted}`}
                  {nights && ` (${nights} night${nights > 1 ? 's' : ''})`}
                </p>
              )}

              {idea.agentNotes && (
                <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">
                    Why we recommend this:
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {idea.agentNotes}
                  </p>
                </div>
              )}

              <div className="mt-3">
                {idea.category === 'AIRBNB' && idea.externalUrl ? (
                  <a
                    href={idea.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                  >
                    View Property →
                  </a>
                ) : (
                  <a
                    href={place.googleMapsUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                  >
                    View on Google Maps →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Get reaction badge if reactions exist
    const hasReactions = idea.reactions && idea.reactions.length > 0;
    const reactionTypes = hasReactions ? [...new Set(idea.reactions.map((r) => r.reaction))] : [];

    const reactionBadges = {
      LOVE: {
        emoji: '❤️',
        color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200',
      },
      MAYBE: {
        emoji: '🤔',
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      },
      PASS: { emoji: '👎', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' },
    };

    const cardContent = (
      <>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-xl text-gray-900 dark:text-white mb-1">
              {idea.time && (
                <span className="font-semibold text-gray-500 dark:text-gray-400">
                  {formatTime(idea.time)} —{' '}
                </span>
              )}
              {stateEmojis[idea.state as keyof typeof stateEmojis]} {place.displayName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{place.formattedAddress}</p>
          </div>
          {hasReactions && (
            <div className="flex gap-1 ml-4">
              {reactionTypes.map((reaction) => {
                const badge = reactionBadges[reaction as keyof typeof reactionBadges];
                return (
                  <span
                    key={reaction}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
                  >
                    {badge.emoji}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex gap-4 items-center">
            <span className="font-medium text-gray-700 dark:text-gray-300">{idea.category}</span>
            <span className="text-gray-500 dark:text-gray-400">•</span>
            <span className="text-gray-600 dark:text-gray-400">{idea.state}</span>
            {idea.mealSlot && (
              <>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="text-gray-600 dark:text-gray-400">{idea.mealSlot}</span>
              </>
            )}
            {place.rating && (
              <>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="text-gray-600 dark:text-gray-400">⭐ {place.rating}</span>
              </>
            )}
          </div>

          {idea.agentNotes && (
            <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">
                Why we recommend this:
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{idea.agentNotes}</p>
            </div>
          )}
        </div>

        <a
          href={place.googleMapsUri}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
        >
          View on Google Maps →
        </a>
      </>
    );

    return (
      <div
        key={idea.id}
        className={`border-2 rounded-lg p-5 ${stateColors[idea.state as keyof typeof stateColors]}`}
      >
        {idea.photos && idea.photos.length > 0 ? (
          <div className="flex gap-4">
            <img
              src={idea.photos[0].url}
              alt=""
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">{cardContent}</div>
          </div>
        ) : (
          cardContent
        )}
      </div>
    );
  };

  // Format date range for cover
  const formatDateRange = () => {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);

    const startFormatted = start.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const endFormatted = end.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return `${startFormatted} – ${endFormatted}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Cover / Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 dark:from-blue-800 dark:via-purple-800 dark:to-pink-800 text-white">
        {/* Cover Image Background (if present) */}
        {trip.coverImageUrl && (
          <>
            <img
              src={trip.coverImageUrl}
              alt="Trip cover"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60"></div>
          </>
        )}
        {!trip.coverImageUrl && <div className="absolute inset-0 bg-black opacity-10"></div>}
        <div className="relative max-w-5xl mx-auto px-8 py-20">
          {/* Back button */}
          <button
            onClick={() => router.push(`/trip/${id}`)}
            className="mb-8 text-white/90 hover:text-white hover:underline flex items-center gap-2"
          >
            <span>←</span> Back to Trip Dashboard
          </button>

          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">{trip.name}</h1>
            <p className="text-2xl md:text-3xl font-light mb-2">{headerLocationLine}</p>
            <p className="text-lg md:text-xl text-white/90">{formatDateRange()}</p>

            {/* Segment summary line - only for multiple display segments */}
            {hasMultipleDisplaySegments && segmentSummary.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-base md:text-lg">
                {segmentSummary.map((s, idx) => (
                  <span key={s.id} className="inline-flex items-center">
                    <span className="font-medium">{s.placeName}</span>
                    <span className="opacity-90 ml-1">
                      (Days {s.dayStart}–{s.dayEnd})
                    </span>
                    {idx < segmentSummary.length - 1 && <span className="mx-3 opacity-70">·</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Overview */}
          {trip.requirements && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8 border border-white/20">
              <h2 className="text-xl font-semibold mb-3">Trip Overview</h2>
              <p className="text-white/95 leading-relaxed">{trip.requirements}</p>
            </div>
          )}

          {/* Lodging Summary */}
          {lodgingSummary.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h2 className="text-xl font-semibold mb-4">Lodging</h2>
              <div className="space-y-3">
                {lodgingSummary.map((summary) => (
                  <div key={summary.hotel.id} className="flex items-start gap-3">
                    <span className="font-semibold text-white/90">{summary.dayRange}:</span>
                    <div className="flex-1">
                      <p className="font-medium">{summary.place.displayName}</p>
                      <p className="text-sm text-white/80">{summary.place.formattedAddress}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Itinerary Content */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Day-by-Day Sections */}
        <div className="space-y-12">
          {tripDays.map((day) => {
            const dayIdeas = sortIdeasForDay(getIdeasForDay(day.number));
            const daySegment = hasMultipleDisplaySegments
              ? findDisplaySegmentForDay(displaySegments, day.date)
              : null;

            // Check if this day is the first day of a segment with notes
            const segmentWithNotes = realSegments.find(
              (seg) => seg.startDate.getTime() === day.date.getTime() && seg.notes
            );

            return (
              <div key={day.number} className="scroll-mt-8">
                {/* Segment narrative intro */}
                {segmentWithNotes && segmentWithNotes.notes && (
                  <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-200">
                      {segmentWithNotes.placeName} —{' '}
                      {segmentWithNotes.startDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                      –
                      {segmentWithNotes.endDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </h4>
                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-300 whitespace-pre-line">
                      {segmentWithNotes.notes}
                    </p>
                  </div>
                )}
                {/* Day Header */}
                <div className="mb-6">
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="flex items-baseline gap-4">
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Day {day.number}
                      </h2>
                      <p className="text-lg text-gray-600 dark:text-gray-400">{day.formatted}</p>
                    </div>

                    {/* Base badge - only for multi-segment trips */}
                    {hasMultipleDisplaySegments && (
                      <span className="rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                        Base: {daySegment?.placeName ?? 'TBD'}
                      </span>
                    )}
                  </div>
                  <div className="h-1 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 rounded-full w-24"></div>
                </div>

                {/* Ideas for this day */}
                {dayIdeas.length > 0 ? (
                  <div className="space-y-4">
                    {dayIdeas.map((idea) => renderIdeaCard(idea, true, day.number))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      No activities scheduled for this day yet
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Unassigned / Flexible Options */}
        {unassignedIdeas.length > 0 && (
          <div className="mt-16 pt-12 border-t-4 border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Flexible Options
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Additional ideas to consider during your trip
              </p>
            </div>
            <div className="space-y-4">
              {unassignedIdeas.map((idea) => renderIdeaCard(idea, false, null))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This itinerary is always up-to-date with the latest changes to your trip.
          </p>
        </div>
      </div>
    </div>
  );
}
