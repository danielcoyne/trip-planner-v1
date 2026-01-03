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
  day: number | null;
  mealSlot: string | null;
  agentNotes: string | null;
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
  location: {
    latitude: number;
    longitude: number;
  };
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">Trip not found</div>
      </div>
    );
  }

  const reviewUrl = trip.reviewToken
    ? `${window.location.origin}/review/${trip.reviewToken}`
    : null;

  // Group ideas by state for display
  const anchorIdeas = ideas.filter(i => i.state === 'ANCHOR');
  const flexibleIdeas = ideas.filter(i => i.state === 'FLEXIBLE');
  const spontaneousIdeas = ideas.filter(i => i.state === 'SPONTANEOUS');

  const renderIdeaCard = (idea: TripIdea) => {
    const place = placesCache[idea.placeId];
    if (!place) return null;

    const stateColors = {
      ANCHOR: 'bg-red-50 border-red-200',
      FLEXIBLE: 'bg-blue-50 border-blue-200',
      SPONTANEOUS: 'bg-green-50 border-green-200',
    };

    return (
      <div
        key={idea.id}
        className={`border-2 rounded-lg p-4 ${stateColors[idea.state as keyof typeof stateColors]}`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{place.displayName}</h3>
            <p className="text-sm text-gray-600">{place.formattedAddress}</p>
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
        
        <div className="space-y-2 text-sm">
          <div className="flex gap-4">
            <span className="font-medium">Category:</span>
            <span>{idea.category}</span>
          </div>
          {idea.day && (
            <div className="flex gap-4">
              <span className="font-medium">Day:</span>
              <span>{idea.day}</span>
            </div>
          )}
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
            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
              <p className="font-medium text-sm mb-1">Agent Notes:</p>
              <p className="text-gray-700">{idea.agentNotes}</p>
            </div>
          )}
        </div>
        
        <a
          href={place.googleMapsUri}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-blue-600 hover:underline text-sm"
        >
          View on Google Maps →
        </a>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-blue-600 hover:underline"
          >
            ← Back to Trips
          </button>
          <h1 className="text-4xl font-bold mb-2">{trip.name}</h1>
          <p className="text-xl text-gray-600">
            {trip.destination} • {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
          </p>
        </div>

        {/* Client Requirements */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Client Requirements</h2>
          <p className="text-gray-700">{trip.requirements}</p>
        </div>

        {/* Review Link Section */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Share with Client</h2>
          {reviewUrl ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">Copy this link to share with your client:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reviewUrl}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-white"
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
          <div className="border-b border-gray-200">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('ideas')}
                className={`pb-4 px-2 font-medium ${
                  activeTab === 'ideas'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Ideas ({ideas.length})
              </button>
              <button
                onClick={() => setActiveTab('feedback')}
                className={`pb-4 px-2 font-medium relative ${
                  activeTab === 'feedback'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
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
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
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
              <h2 className="text-2xl font-bold">Trip Ideas</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                + Add Idea
              </button>
            </div>

            {ideas.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500 mb-4">No ideas yet. Start adding some!</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Anchor Ideas */}
                {anchorIdeas.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-red-700">
                      🎯 Anchor (Must-Do) - {anchorIdeas.length}
                    </h3>
                    <div className="grid gap-4">
                      {anchorIdeas.map(renderIdeaCard)}
                    </div>
                  </div>
                )}

                {/* Flexible Ideas */}
                {flexibleIdeas.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-blue-700">
                      🔄 Flexible (Do If Nearby) - {flexibleIdeas.length}
                    </h3>
                    <div className="grid gap-4">
                      {flexibleIdeas.map(renderIdeaCard)}
                    </div>
                  </div>
                )}

                {/* Spontaneous Ideas */}
                {spontaneousIdeas.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-green-700">
                      ✨ Spontaneous (Nice-to-Have) - {spontaneousIdeas.length}
                    </h3>
                    <div className="grid gap-4">
                      {spontaneousIdeas.map(renderIdeaCard)}
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
        {showAddModal && (
          <AddIdeaModal
            tripId={id}
            onClose={() => setShowAddModal(false)}
            onIdeaAdded={fetchTripData}
          />
        )}

        {/* Edit Idea Modal */}
        {showEditModal && editingIdea && (
          <EditIdeaModal
            idea={editingIdea}
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