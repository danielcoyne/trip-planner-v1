'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIdeaModal from '@/components/AddIdeaModal';
import TripMap from '@/components/TripMap';
import ReactionsView from '@/components/ReactionsView';
import EditIdeaModal from '@/components/EditIdeaModal';

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  requirements: string;
  reviewToken: string | null;
}

interface TripIdea {
  id: string;
  placeId: string;
  category: string;
  state: string;
  status: string;
  day: number | null;
  endDay: number | null;
  mealSlot: string | null;
  agentNotes: string | null;
  createdAt?: string;
  reactions: Array<{
    id: string;
    reaction: string;
    clientNotes: string | null;
    createdAt: string;
  }>;
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

export default function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [ideas, setIdeas] = useState<TripIdea[]>([]);
  const [placesCache, setPlacesCache] = useState<Record<string, Place>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState<TripIdea | null>(null);
  const [activeTab, setActiveTab] = useState<'ideas' | 'feedback' | 'map'>('ideas');
  const [feedbackCount, setFeedbackCount] = useState(0);

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

      // Count feedback (ideas with reactions)
      const reactedIdeas = ideasData.ideas.filter((idea: any) => 
        idea.reactions && idea.reactions.length > 0
      );
      setFeedbackCount(reactedIdeas.length);

      // Fetch place details for each unique placeId
      const placeIds = [...new Set(ideasData.ideas.map((idea: TripIdea) => idea.placeId))];
      const places: Record<string, Place> = {};

      for (const placeId of placeIds) {
        if (typeof placeId !== 'string') continue;
        
        try {
          const placeResponse = await fetch(`/api/places/${placeId}`);
          const placeData = await placeResponse.json();
          if (placeData.place) {
            // Add placeId to the place object
            places[placeId] = {
              ...placeData.place,
              placeId: placeId
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

  const handleGenerateReviewLink = async () => {
    try {
      const response = await fetch('/api/review/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: id }),
      });
      const data = await response.json();
      
      // Refresh trip data to get the new token
      await fetchTripData();
      
      alert('Review link generated! Copy the URL from the box below.');
    } catch (error) {
      console.error('Error generating review link:', error);
      alert('Failed to generate review link');
    }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (!confirm('Are you sure you want to delete this idea?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ideas/${ideaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the ideas list
        await fetchTripData();
      } else {
        alert('Failed to delete idea');
      }
    } catch (error) {
      console.error('Error deleting idea:', error);
      alert('Failed to delete idea');
    }
  };

  const handleEditIdea = (idea: TripIdea) => {
    setEditingIdea(idea);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (ideaId: string, updates: any) => {
    try {
      const response = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingIdea(null);
        // Refresh the ideas list
        await fetchTripData();
      } else {
        alert('Failed to update idea');
      }
    } catch (error) {
      console.error('Error updating idea:', error);
      alert('Failed to update idea');
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

  const reviewUrl = trip.reviewToken
    ? `${window.location.origin}/review/${trip.reviewToken}`
    : null;

  // Calculate trip days
  const getTripDays = () => {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const days = [];
    let currentDate = new Date(start);
    let dayNumber = 1;

    while (currentDate <= end) {
      days.push({
        number: dayNumber,
        date: new Date(currentDate),
        formatted: currentDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      });
      currentDate.setDate(currentDate.getDate() + 1);
      dayNumber++;
    }
    return days;
  };

  const tripDays = getTripDays();

  // Group ideas by day
  const getIdeasForDay = (dayNumber: number) => {
    return ideas.filter(idea => {
      if (!idea.day) return false;
      // Single-day idea
      if (!idea.endDay) return idea.day === dayNumber;
      // Multi-day idea: show on all days in range
      return idea.day <= dayNumber && dayNumber <= idea.endDay;
    });
  };

  // Get unassigned ideas
  const unassignedIdeas = ideas.filter(idea => !idea.day);

  // Sort ideas within a day
  const sortIdeasForDay = (dayIdeas: TripIdea[]) => {
    const mealOrder = { BREAKFAST: 1, LUNCH: 2, DINNER: 3, SNACK: 4 };

    return dayIdeas.sort((a, b) => {
      // Hotels first
      if (a.category === 'HOTEL' && b.category !== 'HOTEL') return -1;
      if (a.category !== 'HOTEL' && b.category === 'HOTEL') return 1;

      // Then by meal slot
      const aMeal = a.mealSlot ? mealOrder[a.mealSlot as keyof typeof mealOrder] || 99 : 99;
      const bMeal = b.mealSlot ? mealOrder[b.mealSlot as keyof typeof mealOrder] || 99 : 99;
      if (aMeal !== bMeal) return aMeal - bMeal;

      // Then by creation time
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });
  };

  // State emoji mapping
  const stateEmojis = {
    ANCHOR: '🎯',
    FLEXIBLE: '🔄',
    SPONTANEOUS: '✨'
  };

  const renderIdeaCard = (idea: TripIdea, showDayRange = false) => {
    const place = placesCache[idea.placeId];
    if (!place) return null;

    const stateColors = {
      ANCHOR: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      FLEXIBLE: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      SPONTANEOUS: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    };

    // Multi-day range text
    const dayRangeText = showDayRange && idea.day && idea.endDay
      ? `(Days ${idea.day}-${idea.endDay})`
      : '';

    return (
      <div
        key={idea.id}
        className={`border-2 rounded-lg p-4 ${stateColors[idea.state as keyof typeof stateColors]}`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              {stateEmojis[idea.state as keyof typeof stateEmojis]} {place.displayName}
              {dayRangeText && (
                <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2">{dayRangeText}</span>
              )}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{place.formattedAddress}</p>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => handleEditIdea(idea)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteIdea(idea.id)}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex gap-4">
            <span className="font-medium">Category:</span>
            <span>{idea.category}</span>
          </div>
          {idea.mealSlot && (
            <div className="flex gap-4">
              <span className="font-medium">Meal:</span>
              <span>{idea.mealSlot}</span>
            </div>
          )}
          {place.rating && (
            <div className="flex gap-4">
              <span className="font-medium">Rating:</span>
              <span>⭐ {place.rating}</span>
            </div>
          )}
          {idea.agentNotes && (
            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <p className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Agent Notes:</p>
              <p className="text-gray-700 dark:text-gray-300">{idea.agentNotes}</p>
            </div>
          )}
        </div>

        <a
          href={place.googleMapsUri}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          View on Google Maps →
        </a>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Trips
          </button>
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">{trip.name}</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {trip.destination} • {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
          </p>
        </div>

        {/* Client Requirements */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Client Requirements</h2>
          <p className="text-gray-700 dark:text-gray-300">{trip.requirements}</p>
        </div>

        {/* Itinerary Link */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                View Itinerary
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                See your trip as a polished, day-by-day itinerary
              </p>
            </div>
            <button
              onClick={() => router.push(`/trip/${id}/itinerary`)}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
            >
              Open Itinerary →
            </button>
          </div>
        </div>

        {/* Review Link Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Share with Client</h2>
          {reviewUrl ? (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Copy this link to share with your client:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reviewUrl}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(reviewUrl);
                    alert('Link copied to clipboard!');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Copy Link
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleGenerateReviewLink}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Generate Review Link
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('ideas')}
                className={`pb-4 px-2 font-medium ${
                  activeTab === 'ideas'
                    ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Ideas ({ideas.length})
              </button>
              <button
                onClick={() => setActiveTab('feedback')}
                className={`pb-4 px-2 font-medium relative ${
                  activeTab === 'feedback'
                    ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Client Feedback
                {feedbackCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-600 rounded-full">
                    {feedbackCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`pb-4 px-2 font-medium ${
                  activeTab === 'map'
                    ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Map
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'ideas' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trip Ideas</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                + Add Idea
              </button>
            </div>

            {ideas.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No ideas yet. Start adding some!</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Day-by-Day Sections */}
                {tripDays.map(day => {
                  const dayIdeas = sortIdeasForDay(getIdeasForDay(day.number));
                  if (dayIdeas.length === 0) return null;

                  return (
                    <div key={day.number}>
                      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                        Day {day.number} - {day.formatted}
                      </h3>
                      <div className="grid gap-4">
                        {dayIdeas.map(idea => renderIdeaCard(idea, true))}
                      </div>
                    </div>
                  );
                })}

                {/* Unassigned Ideas */}
                {unassignedIdeas.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-300">
                      Ideas Not Yet Assigned to Days
                    </h3>
                    <div className="grid gap-4">
                      {unassignedIdeas.map(idea => renderIdeaCard(idea, false))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'feedback' && (
          <ReactionsView ideas={ideas} placesCache={placesCache} />
        )}

        {activeTab === 'map' && (
          <TripMap ideas={ideas} placesCache={placesCache} />
        )}

        {/* Add Idea Modal */}
        <AddIdeaModal
          tripId={id}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onIdeaAdded={fetchTripData}
        />

        {/* Edit Idea Modal */}
        {showEditModal && editingIdea && (
          <EditIdeaModal
            idea={editingIdea}
            tripStartDate={trip.startDate}
            tripEndDate={trip.endDate}
            placeName={placesCache[editingIdea.placeId]?.displayName || 'Unknown Place'}
            onClose={() => {
              setShowEditModal(false);
              setEditingIdea(null);
            }}
            onSave={handleSaveEdit}
          />
        )}
      </div>
    </div>
  );
}