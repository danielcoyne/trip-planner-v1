'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currentRound: number;
  requirements: string | null;
}

interface TripIdea {
  id: string;
  placeId: string;
  category: string;
  state: string;
  day: number | null;
  mealSlot: string | null;
  agentNotes: string | null;
  reactions: IdeaReaction[];
}

interface IdeaReaction {
  id: string;
  reaction: string;
  clientNotes: string | null;
}

interface PlaceCache {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  rating: number | null;
  googleMapsUri: string;
}

export default function ReviewPage() {
  const params = useParams();
  const token = params.token as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [ideas, setIdeas] = useState<TripIdea[]>([]);
  const [placesCache, setPlacesCache] = useState<Record<string, PlaceCache>>({});
  const [reactions, setReactions] = useState<Record<string, { reaction: string; notes: string }>>({});
  const [suggestionText, setSuggestionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchTripData();
  }, [token]);

  const fetchTripData = async () => {
    setLoading(true);
    try {
      // Fetch trip by token
      const response = await fetch(`/api/review/${token}`);
      
      if (!response.ok) {
        throw new Error('Trip not found');
      }

      const data = await response.json();
      setTrip(data.trip);
      setIdeas(data.trip.ideas || []);

      // Load existing reactions
      const existingReactions: Record<string, { reaction: string; notes: string }> = {};
      data.trip.ideas?.forEach((idea: TripIdea) => {
        if (idea.reactions && idea.reactions.length > 0) {
          const reaction = idea.reactions[0];
          existingReactions[idea.id] = {
            reaction: reaction.reaction,
            notes: reaction.clientNotes || ''
          };
        }
      });
      setReactions(existingReactions);

      // Fetch place details for each unique placeId
const placeIds = [...new Set(ideas.map((idea) => idea.placeId))];
const places: Record<string, any> = {};

for (const placeId of placeIds) {
  if (typeof placeId !== 'string') continue; // Type guard
  
  try {
    const placeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/places/${placeId}`
    );
    const placeData = await placeResponse.json();
    if (placeData.place) {
      places[placeId] = placeData.place;
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

  const handleReaction = (ideaId: string, reaction: string) => {
    setReactions(prev => ({
      ...prev,
      [ideaId]: {
        reaction,
        notes: prev[ideaId]?.notes || ''
      }
    }));
  };

  const handleNotes = (ideaId: string, notes: string) => {
    setReactions(prev => ({
      ...prev,
      [ideaId]: {
        reaction: prev[ideaId]?.reaction || '',
        notes
      }
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      // Submit all reactions
      const reactionPromises = Object.entries(reactions)
        .filter(([_, data]) => data.reaction)
        .map(([ideaId, data]) =>
          fetch('/api/reactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ideaId,
              reaction: data.reaction,
              clientNotes: data.notes || null
            })
          })
        );

      await Promise.all(reactionPromises);

      // Submit suggestion if provided
      if (suggestionText.trim() && trip) {
        await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId: trip.id,
            suggestionText: suggestionText.trim()
          })
        });
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Trip Not Found</h1>
          <p className="text-gray-600">This review link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Feedback Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your feedback. Your travel agent will review your responses and refine the itinerary.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              fetchTripData();
            }}
            className="text-blue-600 hover:underline"
          >
            View your responses
          </button>
        </div>
      </div>
    );
  }

  const hasReactions = Object.values(reactions).some(r => r.reaction);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{trip.name}</h1>
          <p className="text-gray-600 text-lg">{trip.destination}</p>
          <p className="text-gray-600">
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
          </p>
          
          {trip.requirements && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">Your Requirements:</p>
              <p className="text-gray-700">{trip.requirements}</p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Round {trip.currentRound} • Review each idea and let us know what you think!
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">How to Review:</h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• ❤️ <strong>Love It</strong> - Definitely want to do this</li>
            <li>• 🤔 <strong>Maybe</strong> - Interested but not sure</li>
            <li>• ❌ <strong>Pass</strong> - Not interested</li>
            <li>• Add notes to explain your thoughts or preferences</li>
          </ul>
        </div>

        {/* Ideas */}
        <div className="space-y-4 mb-6">
          {ideas.map((idea) => {
            const place = placesCache[idea.placeId];
            const currentReaction = reactions[idea.id];

            return (
              <div key={idea.id} className="bg-white rounded-lg shadow p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {place?.displayName || 'Loading...'}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {place?.formattedAddress}
                  </p>
                  
                  <div className="flex gap-2 flex-wrap mb-3">
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      {idea.category}
                    </span>
                    {idea.day && (
                      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        Day {idea.day}
                      </span>
                    )}
                    {place?.rating && (
                      <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                        ⭐ {place.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {idea.agentNotes && (
                    <div className="p-3 bg-blue-50 border-l-4 border-blue-600 rounded">
                      <p className="text-sm font-medium text-blue-900 mb-1">Why this place:</p>
                      <p className="text-gray-700 text-sm">{idea.agentNotes}</p>
                    </div>
                  )}
                </div>

                {/* Reaction Buttons */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Your reaction:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReaction(idea.id, 'LOVE')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                        currentReaction?.reaction === 'LOVE'
                          ? 'bg-red-50 border-red-500 text-red-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-red-300'
                      }`}
                    >
                      ❤️ Love It
                    </button>
                    <button
                      onClick={() => handleReaction(idea.id, 'MAYBE')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                        currentReaction?.reaction === 'MAYBE'
                          ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-yellow-300'
                      }`}
                    >
                      🤔 Maybe
                    </button>
                    <button
                      onClick={() => handleReaction(idea.id, 'PASS')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                        currentReaction?.reaction === 'PASS'
                          ? 'bg-gray-100 border-gray-500 text-gray-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      ❌ Pass
                    </button>
                  </div>
                </div>

                {/* Notes */}
                {currentReaction?.reaction && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your notes (optional):
                    </label>
                    <textarea
                      value={currentReaction.notes}
                      onChange={(e) => handleNotes(idea.id, e.target.value)}
                      rows={2}
                      placeholder="Any preferences or questions about this place?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Suggestions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Anything we're missing?
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Have a place you'd like to visit? Let us know!
          </p>
          <textarea
            value={suggestionText}
            onChange={(e) => setSuggestionText(e.target.value)}
            rows={3}
            placeholder="e.g., My friend recommended Rimessa Roscioli for lunch"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={handleSubmit}
              disabled={!hasReactions || submitting}
              className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            {!hasReactions && (
              <p className="text-center text-sm text-gray-500 mt-2">
                Please react to at least one idea before submitting
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}