'use client';

import { useState } from 'react';

interface ClientSuggestion {
  id: string;
  suggestionText: string;
  round: number;
  status: string;
  resolvedPlaceId: string | null;
  agentNotes: string | null;
  createdAt: string;
}

interface SuggestionsListProps {
  suggestions: ClientSuggestion[];
  onRefresh: () => void;
}

export default function SuggestionsList({ suggestions, onRefresh }: SuggestionsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [agentNotes, setAgentNotes] = useState<Record<string, string>>({});
  const [updatingSuggestion, setUpdatingSuggestion] = useState<string | null>(null);

  const handleMarkResolved = async (suggestionId: string) => {
    setUpdatingSuggestion(suggestionId);
    try {
      const response = await fetch(`/api/suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESOLVED',
          agentNotes: agentNotes[suggestionId] || null
        })
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating suggestion:', error);
      alert('Failed to update suggestion');
    } finally {
      setUpdatingSuggestion(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'DISMISSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'PENDING');
  const resolvedSuggestions = suggestions.filter(s => s.status === 'RESOLVED');

  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500">No client suggestions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Suggestions */}
      {pendingSuggestions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            New Suggestions ({pendingSuggestions.length})
          </h3>
          <div className="space-y-4">
            {pendingSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(suggestion.status)}`}>
                        {suggestion.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        Round {suggestion.round} • {formatDate(suggestion.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium">
                      "{suggestion.suggestionText}"
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your notes (optional):
                    </label>
                    <textarea
                      value={agentNotes[suggestion.id] || ''}
                      onChange={(e) => setAgentNotes({ ...agentNotes, [suggestion.id]: e.target.value })}
                      rows={2}
                      placeholder="e.g., Added Rimessa Roscioli as Day 3 lunch option"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkResolved(suggestion.id)}
                      disabled={updatingSuggestion === suggestion.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 text-sm font-medium"
                    >
                      {updatingSuggestion === suggestion.id ? 'Updating...' : 'Mark as Resolved'}
                    </button>
                    <button
                      onClick={() => {
                        const query = encodeURIComponent(suggestion.suggestionText);
                        window.open(`https://www.google.com/maps/search/${query}`, '_blank');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Search on Google Maps
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Suggestions */}
      {resolvedSuggestions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Resolved Suggestions ({resolvedSuggestions.length})
          </h3>
          <div className="space-y-3">
            {resolvedSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="border border-green-200 bg-green-50 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium mb-1">
                      "{suggestion.suggestionText}"
                    </p>
                    {suggestion.agentNotes && (
                      <p className="text-sm text-gray-600 italic">
                        Note: {suggestion.agentNotes}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Round {suggestion.round} • {formatDate(suggestion.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}