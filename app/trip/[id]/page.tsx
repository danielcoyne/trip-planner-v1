'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AddIdeaModal from '@/components/AddIdeaModal';
import TripMap from '@/components/TripMap';
import ReactionsView from '@/components/ReactionsView';
import SuggestionsList from '@/components/SuggestionsList';

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currentRound: number;
  status: string;
  requirements: string | null;
  reviewToken: string | null;
}

interface TripIdea {
  id: string;
  placeId: string;
  category: string;
  state: string;
  day: number | null;
  mealSlot: string | null;
  agentNotes: string | null;
  status: string;
  roundCreated: number;
  reactions: IdeaReaction[];
}

interface IdeaReaction {
  id: string;
  reaction: string;
  clientNotes: string | null;
  createdAt: string;
}

interface ClientSuggestion {
  id: string;
  suggestionText: string;
  round: number;
  status: string;
  resolvedPlaceId: string | null;
  agentNotes: string | null;
  createdAt: string;
}

interface PlaceCache {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  rating: number | null;
  googleMapsUri: string;
  lat: number;
  lng: number;
}

export default function TripDetailPage() {
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [ideas, setIdeas] = useState<TripIdea[]>([]);
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [placesCache, setPlacesCache] = useState<Record<string, PlaceCache>>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ideas' | 'feedback' | 'map'>('ideas');
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const fetchTripData = async () => {
    setLoading(true);
    try {
      // Fetch trip details
      const tripResponse = await fetch(`/api/trips?id=${tripId}`);
      const tripData = await tripResponse.json();
      setTrip(tripData.trip);

      // Set review URL if token exists
      if (tripData.trip.reviewToken) {
        const baseUrl = window.location.origin;
        setReviewUrl(`${baseUrl}/review/${tripData.trip.reviewToken}`);
      }

      // Fetch ideas with reactions
      const ideasResponse = await fetch(`/api/ideas?tripId=${tripId}`);
      const ideasData = await ideasResponse.json();
      
      // Fetch reactions for each idea
      const ideasWithReactions = await Promise.all(
        (ideasData.ideas || []).map(async (idea: TripIdea) => {
          try {
            const reactionsResponse = await fetch(`/api/reactions?ideaId=${idea.id}`);
            const reactionsData = await reactionsResponse.json();
            return {
              ...idea,
              reactions: reactionsData.reactions || []
            };
          } catch (error) {
            console.error(`Error fetching reactions for idea ${idea.id}:`, error);
            return { ...idea, reactions: [] };
          }
        })
      );
      
      setIdeas(ideasWithReactions);

      // Fetch suggestions
      const suggestionsResponse = await fetch(`/api/suggestions?tripId=${tripId}`);
      const suggestionsData = await suggestionsResponse.json();
      setSuggestions(suggestionsData.suggestions || []);

      // Fetch place details for all ideas
      const placeIds = [...new Set((ideasWithReactions || []).map((idea: TripIdea) => idea.placeId))];
      const places: Record<string, PlaceCache> = {};

      for (const placeId of placeIds) {
        try {
          const response = await fetch(`/api/places/${placeId}`);
          const data = await response.json();
          if (data.place) {
            places[placeId] = data.place;
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

  useEffect(() => {
    fetchTripData();
  }, [tripId]);

  const handleIdeaAdded = () => {
    fetchTripData();
  };

  const handleGenerateReviewLink = async () => {
    setGeneratingLink(true);
    try {
      const response = await fetch('/api/review/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId })
      });

      const data = await response.json();
      setReviewUrl(data.reviewUrl);
      
      if (trip) {
        setTrip({ ...trip, reviewToken: data.reviewToken });
      }
    } catch (error) {
      console.error('Error generating review link:', error);
      alert('Failed to generate review link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (reviewUrl) {
      navigator.clipboard.writeText(reviewUrl);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    }
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Trip not found</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to trips
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const tripDays = Math.ceil(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const getStateColor = (state: string) => {
    switch (state) {
      case 'ANCHOR': return 'bg-red-100 text-red-800';
      case 'FLEXIBLE': return 'bg-blue-100 text-blue-800';
      case 'SPONTANEOUS': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'ANCHOR': return '⚓';
      case 'FLEXIBLE': return '↕️';
      case 'SPONTANEOUS': return '⏱️';
      default: return '📍';
    }
  };

  // Count reactions for badge
  const totalReactions = ideas.filter(idea => idea.reactions.length > 0).length;
  const totalSuggestions = suggestions.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to trips
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{trip.name}</h1>
          <p className="text-gray-600">{trip.destination}</p>
          <p className="text-gray-600">
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)} ({tripDays} days)
          </p>
          <div className="mt-2">
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
              Round {trip.currentRound} • {trip.status}
            </span>
          </div>
        </div>

        {/* Requirements */}
        {trip.requirements && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Client Requirements</h2>
            <p className="text-gray-700">{trip.requirements}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('ideas')}
              className={`pb-4 px-1 border-b-2 font-medium ${
                activeTab === 'ideas'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Ideas ({ideas.length})
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`pb-4 px-1 border-b-2 font-medium relative ${
                activeTab === 'feedback'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Client Feedback
              {(totalReactions > 0 || totalSuggestions > 0) && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {totalReactions + totalSuggestions}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`pb-4 px-1 border-b-2 font-medium ${
                activeTab === 'map'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Map
            </button>
          </nav>
        </div>

        {/* Ideas Tab */}
        {activeTab === 'ideas' && (
          <div>
            {ideas.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center border-2 border-dashed border-gray-300">
                <p className="text-gray-500 mb-4">No ideas added yet</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  + Add First Idea
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex justify-between items-center">
                  <p className="text-gray-600">{ideas.length} ideas</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    + Add Idea
                  </button>
                </div>

                <div className="space-y-4">
                  {ideas.map((idea) => {
                    const place = placesCache[idea.placeId];
                    
                    return (
                      <div key={idea.id} className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">
                              {place?.displayName || 'Loading...'}
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">
                              {place?.formattedAddress}
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              <span className={`inline-block px-3 py-1 rounded-full text-sm ${getStateColor(idea.state)}`}>
                                {getStateIcon(idea.state)} {idea.state}
                              </span>
                              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                                {idea.category}
                              </span>
                              {idea.day && (
                                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                                  Day {idea.day}
                                </span>
                              )}
                              {idea.mealSlot && (
                                <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                                  {idea.mealSlot}
                                </span>
                              )}
                              {place?.rating && (
                                <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                  ⭐ {place.rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          {place?.googleMapsUri && (
                            <a
                              href={place.googleMapsUri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-4 text-blue-600 hover:text-blue-700"
                            >
                              View on Maps →
                            </a>
                          )}
                        </div>

                        {idea.agentNotes && (
                          <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
                            <p className="text-sm font-medium text-blue-900 mb-1">Agent Notes:</p>
                            <p className="text-gray-700">{idea.agentNotes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Share Section */}
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Share with Client</h3>
              
              {!reviewUrl ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    Generate a shareable review link to get client feedback on these ideas.
                  </p>
                  <button
                    onClick={handleGenerateReviewLink}
                    disabled={generatingLink || ideas.length === 0}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                  >
                    {generatingLink ? 'Generating...' : 'Generate Review Link'}
                  </button>
                  {ideas.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">Add some ideas first</p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-3">Share this link with your client:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={reviewUrl}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      {showCopySuccess ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    This link allows your client to review and provide feedback on all ideas.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Client Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="space-y-6">
            <ReactionsView ideas={ideas} placesCache={placesCache} />
            
            {suggestions.length > 0 && (
              <div className="mt-8">
                <SuggestionsList 
                  suggestions={suggestions} 
                  onRefresh={fetchTripData}
                />
              </div>
            )}
          </div>
        )}

        {/* Map Tab */}
        {activeTab === 'map' && (
          <TripMap ideas={ideas} placesCache={placesCache} />
        )}
      </div>

      {/* Add Idea Modal */}
      <AddIdeaModal
        tripId={tripId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onIdeaAdded={handleIdeaAdded}
      />
    </div>
  );
}