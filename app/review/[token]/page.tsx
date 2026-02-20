'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { coerceDateOnly } from '@/lib/dateOnly';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProposalStop {
  id: string;
  placeName: string;
  nightsCount: number | null;
  notes: string | null;
}

interface TripIdea {
  id: string;
  placeId: string;
  category: string;
  state: string;
  destinationLabel: string | null;
  day: number | null;
  endDay: number | null;
  agentNotes: string | null;
  price: string | null;
  time: string | null;
  externalUrl: string | null;
  photos: Array<{ id: string; url: string }>;
  comments: Array<{ id: string; author: string; text: string }>;
}

interface TripProposal {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  selected: boolean;
  stops: ProposalStop[];
  ideas: TripIdea[];
}

interface TripComment {
  id: string;
  author: string;
  text: string;
}

interface Trip {
  id: string;
  name: string;
  clientName: string | null;
  startDate: string;
  endDate: string;
  status: string;
  requirements: string | null;
  proposals: TripProposal[];
  ideas: TripIdea[];
  comments: TripComment[];
}

interface Place {
  displayName: string;
  formattedAddress: string;
  rating: number | null;
  googleMapsUri: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  RESTAURANT: '🍽️', COFFEE: '☕', BAR: '🍸', ATTRACTION: '📍',
  MUSEUM: '🏛️', TOUR: '🚶', HOTEL: '🏨', AIRBNB: '🏠', ACTIVITY: '🎯', TRANSPORT: '🚗',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const params = useParams();
  const token = params.token as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [placesCache, setPlacesCache] = useState<Record<string, Place>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Phase 1 state
  const [proposalComments, setProposalComments] = useState<Record<string, string>>({});
  const [selectingProposal, setSelectingProposal] = useState<string | null>(null);
  const [selectionDone, setSelectionDone] = useState(false);

  // Phase 2 state
  const [ideaComments, setIdeaComments] = useState<Record<string, string>>({});
  const [generalComment, setGeneralComment] = useState('');
  const [submittingComments, setSubmittingComments] = useState(false);
  const [commentsDone, setCommentsDone] = useState(false);

  // ─── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/review/${token}`);
        const data = await res.json();
        if (!data.trip) { setNotFound(true); return; }
        const t: Trip = data.trip;
        setTrip(t);
        if (t.proposals.some(p => p.selected)) setSelectionDone(true);

        // Fetch places
        const allIdeas = [...t.ideas, ...t.proposals.flatMap(p => p.ideas)];
        const placeIds = [...new Set(allIdeas.map(i => i.placeId))] as string[];
        const places: Record<string, Place> = {};
        await Promise.all(placeIds.map(async pid => {
          try {
            const r = await fetch(`/api/places/${pid}`);
            const d = await r.json();
            if (d.place) places[pid] = d.place;
          } catch {}
        }));
        setPlacesCache(places);
      } catch { setNotFound(true); }
      finally { setLoading(false); }
    })();
  }, [token]);

  // ─── Phase 1: Select proposal ─────────────────────────────────────────────

  const handleSelectProposal = async (proposalId: string) => {
    setSelectingProposal(proposalId);
    try {
      // Post proposal comments
      await Promise.all(
        Object.entries(proposalComments)
          .filter(([, t]) => t.trim())
          .map(([pid, text]) => fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proposalId: pid, author: 'CLIENT', text: text.trim() }),
          })),
      );
      // Select the proposal
      await fetch(`/api/proposals/${proposalId}/select`, { method: 'POST' });
      setSelectionDone(true);
      // Reload trip
      const res = await fetch(`/api/review/${token}`);
      const data = await res.json();
      if (data.trip) setTrip(data.trip);
    } finally { setSelectingProposal(null); }
  };

  // ─── Phase 2: Submit comments ─────────────────────────────────────────────

  const handleSubmitComments = async () => {
    if (!trip) return;
    setSubmittingComments(true);
    try {
      await Promise.all(
        Object.entries(ideaComments)
          .filter(([, t]) => t.trim())
          .map(([ideaId, text]) => fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ideaId, author: 'CLIENT', text: text.trim() }),
          })),
      );
      if (generalComment.trim()) {
        await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId: trip.id, author: 'CLIENT', text: generalComment.trim() }),
        });
      }
      setCommentsDone(true);
    } finally { setSubmittingComments(false); }
  };

  // ─── Loading / not found ───────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <p className="text-gray-500">Loading your trip...</p>
    </div>
  );

  if (notFound || !trip) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-900 mb-2">Link not found</p>
        <p className="text-gray-500">This review link may have expired or been removed.</p>
      </div>
    </div>
  );

  if (commentsDone) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Thanks for your feedback!</h2>
        <p className="text-gray-600">Your comments have been sent to your travel agent. They'll be in touch soon.</p>
      </div>
    </div>
  );

  const dateRange = `${coerceDateOnly(trip.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${coerceDateOnly(trip.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  const isProposalPhase = trip.status === 'DRAFT' || trip.status === 'REVIEW';
  const selectedProposal = trip.proposals.find(p => p.selected) ?? null;
  const destinations = [...new Set(trip.ideas.map(i => i.destinationLabel).filter(Boolean))] as string[];
  const unassignedIdeas = trip.ideas.filter(i => !i.destinationLabel);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-gray-400 mb-1">Your trip proposal</p>
          <h1 className="text-3xl font-bold text-gray-900">{trip.name}</h1>
          <p className="text-gray-500 mt-1">{dateRange}</p>
          {trip.clientName && <p className="text-sm text-gray-400 mt-0.5">For {trip.clientName}</p>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Client requirements recap */}
        {trip.requirements && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Your Requirements</h2>
            <p className="text-gray-700 text-sm leading-relaxed">{trip.requirements}</p>
          </div>
        )}

        {/* Agent notes */}
        {trip.comments.filter(c => c.author === 'AGENT').length > 0 && (
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
            <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">Note from your agent</h2>
            {trip.comments.filter(c => c.author === 'AGENT').map((c, i) => (
              <p key={i} className="text-gray-700 text-sm leading-relaxed">{c.text}</p>
            ))}
          </div>
        )}

        {/* ════ PHASE 1: Proposal selection ════ */}
        {isProposalPhase && !selectionDone && trip.proposals.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose your adventure</h2>
            <p className="text-gray-500 mb-8 text-sm">
              We've put together {trip.proposals.length} different itinerary option{trip.proposals.length !== 1 ? 's' : ''}.
              Leave comments on any that catch your eye, then hit "This is the one!" when you're ready.
            </p>
            <div className="grid gap-8">
              {trip.proposals.map((proposal, index) => (
                <div key={proposal.id} className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start gap-4 mb-4">
                      <span className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{proposal.title}</h3>
                        {proposal.description && (
                          <p className="text-gray-600 mt-2 text-sm leading-relaxed">{proposal.description}</p>
                        )}
                      </div>
                    </div>
                    {proposal.stops.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 ml-14">
                        {proposal.stops.map((stop, i) => (
                          <span key={stop.id} className="flex items-center gap-1.5">
                            {i > 0 && <span className="text-gray-300">→</span>}
                            <span className="px-3 py-1 rounded-full bg-gray-100 text-sm font-medium text-gray-700">
                              📍 {stop.placeName}{stop.nightsCount ? ` (${stop.nightsCount}n)` : ''}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                    {proposal.stops.some(s => s.notes) && (
                      <div className="mt-3 ml-14 space-y-1">
                        {proposal.stops.filter(s => s.notes).map(s => (
                          <p key={s.id} className="text-xs text-gray-500 italic">{s.placeName}: {s.notes}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Highlights */}
                  {proposal.ideas.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Highlights</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {proposal.ideas.slice(0, 6).map(idea => {
                          const place = placesCache[idea.placeId];
                          if (!place) return null;
                          const isLodging = idea.category === 'HOTEL' || idea.category === 'AIRBNB';
                          return (
                            <div key={idea.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${isLodging ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
                              {idea.photos?.[0] ? (
                                <img src={idea.photos[0].url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                              ) : (
                                <span className="text-xl flex-shrink-0">{CATEGORY_EMOJI[idea.category]}</span>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{place.displayName}</p>
                                {idea.price && <p className="text-xs text-gray-500">{idea.price}</p>}
                                {idea.destinationLabel && <p className="text-xs text-gray-400">📍 {idea.destinationLabel}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {proposal.ideas.length > 6 && (
                        <p className="text-xs text-gray-400 mt-2">+ {proposal.ideas.length - 6} more ideas</p>
                      )}
                    </div>
                  )}

                  {/* Comment + select button */}
                  <div className="p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Thoughts on this option?</label>
                    <textarea
                      value={proposalComments[proposal.id] || ''}
                      onChange={e => setProposalComments(prev => ({ ...prev, [proposal.id]: e.target.value }))}
                      placeholder="What do you like? Any questions or concerns?"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      onClick={() => handleSelectProposal(proposal.id)}
                      disabled={!!selectingProposal}
                      className="mt-3 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:bg-gray-400"
                    >
                      {selectingProposal === proposal.id ? 'Selecting...' : '✓ This is the one!'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selection confirmed */}
        {selectionDone && selectedProposal && isProposalPhase && (
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-bold text-green-900 text-lg">Great choice!</p>
            <p className="text-green-700 text-sm mt-1">
              You've selected <strong>{selectedProposal.title}</strong>. Your agent will now build out the full itinerary.
            </p>
          </div>
        )}

        {/* ════ PHASE 2: Itinerary review ════ */}
        {(trip.status === 'PLANNING' || trip.status === 'CONFIRMED') && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Itinerary</h2>
            {selectedProposal && (
              <p className="text-gray-500 mb-1 text-sm">Based on: {selectedProposal.title}</p>
            )}
            <p className="text-gray-500 mb-8 text-sm">
              Browse the itinerary below and leave comments on anything you'd like to discuss.
            </p>

            {trip.ideas.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <p className="text-3xl mb-3">🗺️</p>
                <p className="font-semibold text-gray-900 mb-1">Itinerary coming soon</p>
                <p className="text-sm text-gray-500">Your agent is building out the details. Check back soon!</p>
              </div>
            ) : (
              <div className="space-y-10">
                {destinations.map(dest => (
                  <div key={dest}>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">📍 {dest}</h3>
                    <div className="space-y-4">
                      {trip.ideas.filter(i => i.destinationLabel === dest).map(idea =>
                        <IdeaCard key={idea.id} idea={idea} place={placesCache[idea.placeId]} comment={ideaComments[idea.id] || ''} onCommentChange={text => setIdeaComments(prev => ({ ...prev, [idea.id]: text }))} />
                      )}
                    </div>
                  </div>
                ))}
                {unassignedIdeas.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-4">Flexible Options</h3>
                    <div className="space-y-4">
                      {unassignedIdeas.map(idea =>
                        <IdeaCard key={idea.id} idea={idea} place={placesCache[idea.placeId]} comment={ideaComments[idea.id] || ''} onCommentChange={text => setIdeaComments(prev => ({ ...prev, [idea.id]: text }))} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* General comment + submit */}
            <div className="mt-10 bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Anything else?</h3>
              <p className="text-sm text-gray-500 mb-3">Missing something? A place you've always wanted to visit?</p>
              <textarea
                value={generalComment}
                onChange={e => setGeneralComment(e.target.value)}
                placeholder="General thoughts, questions, or requests..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={handleSubmitComments}
                disabled={submittingComments}
                className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:bg-gray-400"
              >
                {submittingComments ? 'Sending...' : 'Send Feedback →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Idea card sub-component ──────────────────────────────────────────────────

function IdeaCard({
  idea,
  place,
  comment,
  onCommentChange,
}: {
  idea: TripIdea;
  place: Place | undefined;
  comment: string;
  onCommentChange: (text: string) => void;
}) {
  if (!place) return null;
  const isLodging = idea.category === 'HOTEL' || idea.category === 'AIRBNB';
  const agentComments = idea.comments?.filter(c => c.author === 'AGENT') ?? [];

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden ${isLodging ? 'border-indigo-200' : 'border-gray-200'}`}>
      {idea.photos?.[0] && (
        <img src={idea.photos[0].url} alt="" className="w-full h-44 object-cover" />
      )}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">{CATEGORY_EMOJI[idea.category] || '📍'}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900">{place.displayName}</h4>
            <p className="text-sm text-gray-500">{place.formattedAddress}</p>
            {place.rating && <p className="text-xs text-gray-400 mt-0.5">⭐ {place.rating}</p>}
            <div className="flex flex-wrap gap-2 mt-1.5">
              {isLodging && idea.day && idea.endDay && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700">
                  {idea.endDay - idea.day} night{idea.endDay - idea.day !== 1 ? 's' : ''}
                </span>
              )}
              {idea.price && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 font-medium">{idea.price}</span>
              )}
              {idea.time && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                  {(() => { const [h, m] = idea.time.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; })()}
                </span>
              )}
            </div>
          </div>
        </div>

        {idea.agentNotes && (
          <div className="mb-4 p-3 bg-blue-50 rounded-xl border-l-4 border-blue-400">
            <p className="text-xs font-semibold text-blue-600 mb-1">Why we recommend this:</p>
            <p className="text-sm text-gray-700 leading-relaxed">{idea.agentNotes}</p>
          </div>
        )}

        {agentComments.length > 0 && agentComments.map((c, i) => (
          <div key={i} className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-xs font-semibold text-amber-600 mb-1">Note from your agent:</p>
            <p className="text-sm text-gray-700">{c.text}</p>
          </div>
        ))}

        <div className="flex gap-3 mb-4 text-sm">
          {idea.externalUrl ? (
            <a href={idea.externalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Property →</a>
          ) : (
            <a href={place.googleMapsUri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View on Google Maps →</a>
          )}
        </div>

        <textarea
          value={comment}
          onChange={e => onCommentChange(e.target.value)}
          placeholder="Leave a comment — questions, 'love it!', or anything else..."
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white"
        />
      </div>
    </div>
  );
}
