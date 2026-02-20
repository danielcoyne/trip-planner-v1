'use client';

import { useEffect, useState } from 'react';

interface TripComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

interface IdeaComment {
  id: string;
  ideaId: string | null;
  proposalId: string | null;
  author: string;
  text: string;
  createdAt: string;
}

interface CommentsTabProps {
  tripId: string;
  placesCache: Record<string, { displayName: string }>;
  ideasCache: Record<string, { placeId: string }>;
}

export default function CommentsTab({ tripId, placesCache, ideasCache }: CommentsTabProps) {
  const [tripComments, setTripComments] = useState<TripComment[]>([]);
  const [ideaComments, setIdeaComments] = useState<IdeaComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentComment, setAgentComment] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [tripId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      // Fetch trip-level comments
      const tripRes = await fetch(`/api/comments?tripId=${tripId}`);
      const tripData = await tripRes.json();
      setTripComments(tripData);

      // Fetch idea-level comments for all ideas in this trip by fetching all ideas
      // We get idea comments via the ideas endpoint (which now includes comments)
      const ideasRes = await fetch(`/api/ideas?tripId=${tripId}`);
      const ideasData = await ideasRes.json();
      const allIdeaComments: IdeaComment[] = [];
      for (const idea of ideasData.ideas || []) {
        if (idea.comments && idea.comments.length > 0) {
          allIdeaComments.push(...idea.comments.map((c: IdeaComment) => ({ ...c, ideaId: idea.id })));
        }
      }
      setIdeaComments(allIdeaComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!agentComment.trim()) return;
    setPosting(true);
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, author: 'AGENT', text: agentComment.trim() }),
      });
      setAgentComment('');
      await loadComments();
    } finally {
      setPosting(false);
    }
  };

  const allComments = [
    ...tripComments.map(c => ({ ...c, type: 'trip' as const, ideaId: null as string | null })),
    ...ideaComments.map(c => ({ ...c, type: 'idea' as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const clientComments = allComments.filter(c => c.author === 'CLIENT');
  const allVisible = allComments;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400 py-8 text-center">Loading comments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {clientComments.length > 0 && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
          <p className="font-semibold text-amber-900 dark:text-amber-100">
            {clientComments.length} comment{clientComments.length !== 1 ? 's' : ''} from your client
          </p>
        </div>
      )}

      {/* Comment thread */}
      {allVisible.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-3xl mb-3">💬</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No comments yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Client comments on proposals and ideas will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {allVisible.map(comment => {
            const isClient = comment.author === 'CLIENT';
            const ideaPlace = comment.ideaId && ideasCache[comment.ideaId]
              ? placesCache[ideasCache[comment.ideaId].placeId]
              : null;

            return (
              <div
                key={comment.id}
                className={`rounded-xl p-4 ${
                  isClient
                    ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ml-0 mr-8'
                    : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 ml-8 mr-0'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isClient
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  }`}>
                    {isClient ? 'Client' : 'You'}
                  </span>
                  <span className="text-xs text-gray-400">{formatTime(comment.createdAt)}</span>
                  {ideaPlace && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      · re: {ideaPlace.displayName}
                    </span>
                  )}
                  {comment.type === 'trip' && (
                    <span className="text-xs text-gray-400">· general</span>
                  )}
                </div>
                <p className="text-gray-900 dark:text-white text-sm leading-relaxed">{comment.text}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Agent reply box */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Add a note for your client
        </label>
        <textarea
          value={agentComment}
          onChange={e => setAgentComment(e.target.value)}
          placeholder="Leave a note that the client will see on their review page..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-sm resize-none"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handlePostComment}
            disabled={!agentComment.trim() || posting}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {posting ? 'Posting...' : 'Post Note'}
          </button>
        </div>
      </div>
    </div>
  );
}
