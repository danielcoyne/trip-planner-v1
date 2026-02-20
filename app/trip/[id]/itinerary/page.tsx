'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { coerceDateOnly } from '@/lib/dateOnly';

interface ProposalStop {
  id: string;
  placeName: string;
  nightsCount: number | null;
  notes: string | null;
  sortOrder: number;
}

interface TripProposal {
  id: string;
  title: string;
  selected: boolean;
  stops: ProposalStop[];
}

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  clientName: string | null;
  startDate: string;
  endDate: string;
  requirements: string;
  coverImageUrl: string | null;
  status: string;
}

interface IdeaComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

interface TripIdea {
  id: string;
  placeId: string;
  category: string;
  state: string;
  day: number | null;
  endDay: number | null;
  mealSlot: string | null;
  agentNotes: string | null;
  time: string | null;
  externalUrl: string | null;
  price: string | null;
  destinationLabel: string | null;
  sortOrder: number;
  photos: Array<{ id: string; url: string; sortOrder: number }>;
  comments: IdeaComment[];
  createdAt?: string;
}

interface Place {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  rating: number | null;
  googleMapsUri: string;
  lat: number;
  lng: number;
}

interface LodgingSummary {
  idea: TripIdea;
  place: Place;
  destination: string;
  nights: number | null;
}

export default function ItineraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [ideas, setIdeas] = useState<TripIdea[]>([]);
  const [proposals, setProposals] = useState<TripProposal[]>([]);
  const [placesCache, setPlacesCache] = useState<Record<string, Place>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTripData();
  }, [id]);

  const fetchTripData = async () => {
    try {
      const [tripRes, ideasRes, proposalsRes] = await Promise.all([
        fetch(`/api/trips?id=${id}`),
        fetch(`/api/ideas?tripId=${id}`),
        fetch(`/api/proposals?tripId=${id}`),
      ]);

      const tripData = await tripRes.json();
      setTrip(tripData.trip);

      const ideasData = await ideasRes.json();
      setIdeas(ideasData.ideas);

      const proposalsData = await proposalsRes.json();
      setProposals(proposalsData.proposals || []);

      // Fetch place details for each unique placeId
      const placeIds = [...new Set(ideasData.ideas.map((idea: TripIdea) => idea.placeId))];
      const places: Record<string, Place> = {};

      await Promise.all(
        placeIds.map(async (placeId) => {
          if (typeof placeId !== 'string') return;
          try {
            const placeRes = await fetch(`/api/places/${placeId}`);
            const placeData = await placeRes.json();
            if (placeData.place) {
              places[placeId] = { ...placeData.place, placeId };
            }
          } catch {
            // ignore individual place fetch failures
          }
        })
      );

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

  // Selected proposal gives us the canonical stop order
  const selectedProposal = proposals.find(p => p.selected) || null;
  const orderedStops = selectedProposal
    ? [...selectedProposal.stops].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  // Build ordered destination list: stops first, then any extra labels from ideas
  const stopLabels = orderedStops.map(s => s.placeName);
  const extraLabels = [
    ...new Set(
      ideas
        .map(i => i.destinationLabel)
        .filter((l): l is string => !!l && !stopLabels.includes(l))
    ),
  ];
  const orderedDestinations = [...stopLabels, ...extraLabels];

  // Ideas without a destinationLabel → "Flexible Options"
  const unassignedIdeas = ideas.filter(i => !i.destinationLabel);

  // Get ideas for a specific destination, sorted (hotels first, then by category/mealSlot)
  const getIdeasForDestination = (label: string): TripIdea[] => {
    const mealOrder: Record<string, number> = { BREAKFAST: 1, LUNCH: 2, DINNER: 3, SNACK: 4 };
    return ideas
      .filter(i => i.destinationLabel === label)
      .sort((a, b) => {
        const aIsAccom = a.category === 'HOTEL' || a.category === 'AIRBNB';
        const bIsAccom = b.category === 'HOTEL' || b.category === 'AIRBNB';
        if (aIsAccom && !bIsAccom) return -1;
        if (!aIsAccom && bIsAccom) return 1;
        if (a.category === 'RESTAURANT' && b.category !== 'RESTAURANT') return -1;
        if (a.category !== 'RESTAURANT' && b.category === 'RESTAURANT') return 1;
        if (a.category === 'RESTAURANT' && b.category === 'RESTAURANT') {
          const am = a.mealSlot ? (mealOrder[a.mealSlot] ?? 99) : 99;
          const bm = b.mealSlot ? (mealOrder[b.mealSlot] ?? 99) : 99;
          if (am !== bm) return am - bm;
        }
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
  };

  // Lodging summary: hotels/airbnbs, grouped by destination
  const getLodgingSummary = (): LodgingSummary[] => {
    const accommodations = ideas.filter(
      i => (i.category === 'HOTEL' || i.category === 'AIRBNB') && i.destinationLabel
    );
    return accommodations.map(idea => {
      const place = placesCache[idea.placeId];
      const stop = orderedStops.find(s => s.placeName === idea.destinationLabel);
      const nights = stop?.nightsCount ?? (idea.day && idea.endDay ? idea.endDay - idea.day : null);
      return { idea, place, destination: idea.destinationLabel!, nights };
    }).filter(s => !!s.place);
  };
  const lodgingSummary = getLodgingSummary();

  // Format date range for cover
  const formatDateRange = () => {
    const start = coerceDateOnly(trip.startDate);
    const end = coerceDateOnly(trip.endDate);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  // Header location line
  const headerLine = orderedStops.length > 0
    ? orderedStops.map(s => s.placeName).join(' · ')
    : (trip.destination || '');

  // Category emojis
  const categoryEmojis: Record<string, string> = {
    HOTEL: '🏨',
    AIRBNB: '🏠',
    RESTAURANT: '🍽️',
    ACTIVITY: '🎯',
    EXPERIENCE: '✨',
    TRANSPORT: '✈️',
    SHOPPING: '🛍️',
  };

  // Format time "19:30" → "7:30 PM"
  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const renderIdeaCard = (idea: TripIdea) => {
    const place = placesCache[idea.placeId];
    if (!place) return null;

    const isAccommodation = idea.category === 'HOTEL' || idea.category === 'AIRBNB';
    const clientComments = idea.comments?.filter(c => c.author === 'CLIENT') ?? [];
    const agentComments = idea.comments?.filter(c => c.author === 'AGENT') ?? [];

    if (isAccommodation) {
      return (
        <div
          key={idea.id}
          className="border-2 rounded-xl p-5 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"
        >
          <div className="flex gap-4">
            {idea.photos && idea.photos.length > 0 && (
              <img
                src={idea.photos[0].url}
                alt=""
                className="w-[140px] h-24 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-xl text-gray-900 dark:text-white mb-1">
                    {categoryEmojis[idea.category] || '📍'} {place.displayName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{place.formattedAddress}</p>
                  {place.rating && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">⭐ {place.rating}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 ml-4">
                  {idea.price && (
                    <span className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-full text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      {idea.price}
                    </span>
                  )}
                  {idea.day && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Day {idea.day}{idea.endDay && idea.endDay > idea.day ? `–${idea.endDay}` : ''}</span>
                  )}
                </div>
              </div>

              {idea.agentNotes && (
                <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-100 dark:border-indigo-900">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Why we recommend this:</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{idea.agentNotes}</p>
                </div>
              )}

              {agentComments.length > 0 && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                  {agentComments.map(c => (
                    <p key={c.id} className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">{c.text}</p>
                  ))}
                </div>
              )}

              {clientComments.length > 0 && (
                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Client feedback:</p>
                  {clientComments.map(c => (
                    <p key={c.id} className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{c.text}</p>
                  ))}
                </div>
              )}

              <div className="mt-3 flex gap-3">
                {idea.category === 'AIRBNB' && idea.externalUrl ? (
                  <a href={idea.externalUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                    View Property →
                  </a>
                ) : (
                  <a href={place.googleMapsUri} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                    View on Google Maps →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Non-accommodation card
    return (
      <div
        key={idea.id}
        className="border rounded-xl p-5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      >
        <div className="flex gap-4">
          {idea.photos && idea.photos.length > 0 && (
            <img
              src={idea.photos[0].url}
              alt=""
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-0.5">
                  {idea.time && (
                    <span className="text-gray-400 dark:text-gray-500 font-normal">{formatTime(idea.time)} — </span>
                  )}
                  {categoryEmojis[idea.category] || '📍'} {place.displayName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{place.formattedAddress}</p>
              </div>
              <div className="flex flex-col items-end gap-1 ml-4 flex-shrink-0">
                {idea.price && (
                  <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
                    {idea.price}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  {place.rating && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">⭐ {place.rating}</span>
                  )}
                  {idea.mealSlot && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{idea.mealSlot}</span>
                  )}
                  {idea.day && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Day {idea.day}</span>
                  )}
                </div>
              </div>
            </div>

            {idea.agentNotes && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{idea.agentNotes}</p>
              </div>
            )}

            {agentComments.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                {agentComments.map(c => (
                  <p key={c.id} className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">{c.text}</p>
                ))}
              </div>
            )}

            {clientComments.length > 0 && (
              <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Client feedback:</p>
                {clientComments.map(c => (
                  <p key={c.id} className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{c.text}</p>
                ))}
              </div>
            )}

            <div className="mt-3 flex gap-3">
              <a href={place.googleMapsUri} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Google Maps →
              </a>
              {idea.externalUrl && (
                <a href={idea.externalUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  More Info →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Cover / Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 dark:from-blue-800 dark:via-purple-800 dark:to-pink-800 text-white">
        {trip.coverImageUrl && (
          <>
            <img
              src={trip.coverImageUrl}
              alt="Trip cover"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
          </>
        )}
        {!trip.coverImageUrl && (
          <div className="absolute inset-0 bg-black opacity-10" />
        )}

        <div className="relative max-w-5xl mx-auto px-8 py-20">
          {/* Back button */}
          <button
            onClick={() => router.push(`/trip/${id}`)}
            className="mb-8 text-white/90 hover:text-white hover:underline flex items-center gap-2"
          >
            ← Back to Trip Dashboard
          </button>

          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
              {trip.name}
            </h1>
            {trip.clientName && (
              <p className="text-xl md:text-2xl font-light text-white/80 mb-2">
                Curated for {trip.clientName}
              </p>
            )}
            {headerLine && (
              <p className="text-2xl md:text-3xl font-light mb-3">{headerLine}</p>
            )}
            <p className="text-lg md:text-xl text-white/90">{formatDateRange()}</p>

            {/* Stop pills */}
            {orderedStops.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2 text-base">
                {orderedStops.map((stop, idx) => (
                  <span key={stop.id} className="inline-flex items-center">
                    <span className="font-medium">{stop.placeName}</span>
                    {stop.nightsCount && (
                      <span className="ml-1 opacity-80 text-sm">({stop.nightsCount}n)</span>
                    )}
                    {idx < orderedStops.length - 1 && (
                      <span className="mx-3 opacity-60">→</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Trip Overview */}
          {trip.requirements && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/20">
              <h2 className="text-xl font-semibold mb-3">Trip Overview</h2>
              <p className="text-white/95 leading-relaxed">{trip.requirements}</p>
            </div>
          )}

          {/* Lodging Summary */}
          {lodgingSummary.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold mb-4">Lodging</h2>
              <div className="space-y-3">
                {lodgingSummary.map(({ idea, place, destination, nights }) => (
                  <div key={idea.id} className="flex items-start gap-3">
                    <span className="font-semibold text-white/90 min-w-[80px]">{destination}:</span>
                    <div className="flex-1">
                      <p className="font-medium">{place.displayName}</p>
                      {nights && (
                        <p className="text-sm text-white/80">{nights} night{nights !== 1 ? 's' : ''}</p>
                      )}
                      {idea.price && (
                        <p className="text-sm text-white/80">{idea.price}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Itinerary Body */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        <div className="space-y-16">
          {orderedDestinations.map(destination => {
            const destIdeas = getIdeasForDestination(destination);
            if (destIdeas.length === 0) return null;

            const stop = orderedStops.find(s => s.placeName === destination);

            return (
              <div key={destination}>
                {/* Destination header */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-4 mb-2">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                      {destination}
                    </h2>
                    {stop?.nightsCount && (
                      <span className="text-lg text-gray-500 dark:text-gray-400 font-light">
                        {stop.nightsCount} night{stop.nightsCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="h-1 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 rounded-full w-24 mb-3" />
                  {stop?.notes && (
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl">
                      {stop.notes}
                    </p>
                  )}
                </div>

                {/* Ideas for this destination */}
                <div className="space-y-4">
                  {destIdeas.map(idea => renderIdeaCard(idea))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Flexible Options */}
        {unassignedIdeas.length > 0 && (
          <div className="mt-16 pt-12 border-t-4 border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Also Worth Considering
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Additional ideas to explore whenever the moment feels right
              </p>
            </div>
            <div className="space-y-4">
              {unassignedIdeas.map(idea => renderIdeaCard(idea))}
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
