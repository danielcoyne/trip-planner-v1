'use client';

import type { TripIdea, Place } from '@/types/trip';

interface ReactionsViewProps {
  ideas: TripIdea[];
  placesCache: Record<string, Place>;
}

export default function ReactionsView({ ideas, placesCache }: ReactionsViewProps) {
  // Group ideas by reaction type
  const groupedIdeas = {
    LOVE: ideas.filter((idea) => idea.reactions.some((r) => r.reaction === 'LOVE')),
    MAYBE: ideas.filter((idea) => idea.reactions.some((r) => r.reaction === 'MAYBE')),
    PASS: ideas.filter((idea) => idea.reactions.some((r) => r.reaction === 'PASS')),
    NO_REACTION: ideas.filter((idea) => idea.reactions.length === 0),
  };

  const getReactionForIdea = (idea: TripIdea) => {
    return idea.reactions.find((r) => ['LOVE', 'MAYBE', 'PASS'].includes(r.reaction));
  };

  const renderIdeaCard = (idea: TripIdea, reactionType: string) => {
    const place = placesCache[idea.placeId];
    const reaction = getReactionForIdea(idea);

    const reactionColors = {
      LOVE: 'border-red-200 bg-red-50',
      MAYBE: 'border-yellow-200 bg-yellow-50',
      PASS: 'border-gray-200 bg-gray-50',
    };

    const reactionEmojis = {
      LOVE: '❤️',
      MAYBE: '🤔',
      PASS: '❌',
    };

    return (
      <div
        key={idea.id}
        className={`border-2 rounded-lg p-4 ${reactionColors[reactionType as keyof typeof reactionColors]}`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{place?.displayName || 'Loading...'}</h4>
            <p className="text-sm text-gray-600">{place?.formattedAddress}</p>
          </div>
          <span className="text-2xl ml-2">
            {reactionEmojis[reactionType as keyof typeof reactionEmojis]}
          </span>
        </div>

        <div className="flex gap-2 flex-wrap mb-2">
          <span className="inline-block px-2 py-1 bg-white rounded text-xs font-medium text-gray-700">
            {idea.category}
          </span>
          {idea.day && (
            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
              Day {idea.day}
            </span>
          )}
          {place?.rating && (
            <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
              ⭐ {place.rating.toFixed(1)}
            </span>
          )}
        </div>

        {idea.agentNotes && (
          <div className="mb-3 p-2 bg-blue-50 border-l-2 border-blue-400 rounded text-sm">
            <p className="font-medium text-blue-900 text-xs mb-1">Your notes:</p>
            <p className="text-gray-700 text-sm">{idea.agentNotes}</p>
          </div>
        )}

        {reaction?.clientNotes && (
          <div className="p-3 bg-white border border-gray-200 rounded">
            <p className="font-medium text-gray-900 text-xs mb-1">Client feedback:</p>
            <p className="text-gray-700 text-sm italic">"{reaction.clientNotes}"</p>
          </div>
        )}

        {place?.googleMapsUri && (
          <a
            href={place.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm mt-2 inline-block"
          >
            View on Maps →
          </a>
        )}
      </div>
    );
  };

  const totalReactions =
    groupedIdeas.LOVE.length + groupedIdeas.MAYBE.length + groupedIdeas.PASS.length;

  if (totalReactions === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500">
          No client feedback yet. Share the review link to get feedback!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-red-700">{groupedIdeas.LOVE.length}</div>
          <div className="text-sm text-red-600 font-medium">❤️ Love It</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-yellow-700">{groupedIdeas.MAYBE.length}</div>
          <div className="text-sm text-yellow-600 font-medium">🤔 Maybe</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-700">{groupedIdeas.PASS.length}</div>
          <div className="text-sm text-gray-600 font-medium">❌ Pass</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-700">{groupedIdeas.NO_REACTION.length}</div>
          <div className="text-sm text-blue-600 font-medium">⏳ No Response</div>
        </div>
      </div>

      {/* Love It Section */}
      {groupedIdeas.LOVE.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">❤️</span>
            Love It ({groupedIdeas.LOVE.length})
          </h3>
          <div className="space-y-3">
            {groupedIdeas.LOVE.map((idea) => renderIdeaCard(idea, 'LOVE'))}
          </div>
        </div>
      )}

      {/* Maybe Section */}
      {groupedIdeas.MAYBE.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🤔</span>
            Maybe ({groupedIdeas.MAYBE.length})
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            These ideas need more information or adjustments
          </p>
          <div className="space-y-3">
            {groupedIdeas.MAYBE.map((idea) => renderIdeaCard(idea, 'MAYBE'))}
          </div>
        </div>
      )}

      {/* Pass Section */}
      {groupedIdeas.PASS.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">❌</span>
            Pass ({groupedIdeas.PASS.length})
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Client not interested - consider alternatives
          </p>
          <div className="space-y-3">
            {groupedIdeas.PASS.map((idea) => renderIdeaCard(idea, 'PASS'))}
          </div>
        </div>
      )}

      {/* No Reaction Section */}
      {groupedIdeas.NO_REACTION.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">⏳</span>
            No Response Yet ({groupedIdeas.NO_REACTION.length})
          </h3>
          <div className="space-y-3">
            {groupedIdeas.NO_REACTION.map((idea) => {
              const place = placesCache[idea.placeId];
              return (
                <div key={idea.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="font-semibold text-gray-900">
                    {place?.displayName || 'Loading...'}
                  </h4>
                  <p className="text-sm text-gray-600">{place?.formattedAddress}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
