'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIdeaModal from '@/components/AddIdeaModal';
import DraggableIdeaCard from '@/components/DraggableIdeaCard';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProposalStop {
  id: string;
  placeName: string;
  nightsCount: number | null;
  notes: string | null;
  sortOrder: number;
}

interface TripIdea {
  id: string;
  placeId: string;
  category: string;
  state: string;
  destinationLabel: string | null;
  price: string | null;
  agentNotes: string | null;
  externalUrl: string | null;
  photos: Array<{ id: string; url: string }>;
}

interface TripProposal {
  id: string;
  tripId: string;
  title: string;
  description: string | null;
  selected: boolean;
  stops: ProposalStop[];
  ideas: TripIdea[];
}

interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
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

const STATE_COLORS: Record<string, string> = {
  ANCHOR: 'border-red-300 bg-red-50 dark:bg-red-900/20',
  FLEXIBLE: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20',
  SPONTANEOUS: 'border-green-300 bg-green-50 dark:bg-green-900/20',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProposalEditPage({
  params,
}: {
  params: Promise<{ id: string; proposalId: string }>;
}) {
  const { id: tripId, proposalId } = use(params);
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [proposal, setProposal] = useState<TripProposal | null>(null);
  const [placesCache, setPlacesCache] = useState<Record<string, Place>>({});
  const [loading, setLoading] = useState(true);

  // Edit title/desc inline
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');

  // Stop form
  const [addingStop, setAddingStop] = useState(false);
  const [stopName, setStopName] = useState('');
  const [stopNights, setStopNights] = useState('');
  const [stopNotes, setStopNotes] = useState('');
  const [savingStop, setSavingStop] = useState(false);

  // Add idea modal
  const [showAddIdea, setShowAddIdea] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  // ─── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => { fetchAll(); }, [proposalId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tripRes, proposalRes] = await Promise.all([
        fetch(`/api/trips?id=${tripId}`),
        fetch(`/api/proposals?tripId=${tripId}`),
      ]);
      const tripData = await tripRes.json();
      const proposalsData = await proposalRes.json();

      setTrip(tripData.trip);

      const found: TripProposal | undefined = proposalsData.find((p: TripProposal) => p.id === proposalId);
      if (found) {
        setProposal(found);
        setTitleValue(found.title);
        setDescValue(found.description ?? '');

        // Fetch place details for attached ideas
        const placeIds = [...new Set(found.ideas.map((i: TripIdea) => i.placeId))] as string[];
        const places: Record<string, Place> = {};
        await Promise.all(
          placeIds.map(async (placeId) => {
            try {
              const res = await fetch(`/api/places/${placeId}`);
              const data = await res.json();
              if (data.place) places[placeId] = data.place;
            } catch {}
          }),
        );
        setPlacesCache(places);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Actions ───────────────────────────────────────────────────────────────

  const saveTitle = async () => {
    if (!titleValue.trim() || !proposal) return;
    await fetch(`/api/proposals/${proposalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleValue.trim() }),
    });
    setEditingTitle(false);
    await fetchAll();
  };

  const saveDesc = async () => {
    if (!proposal) return;
    await fetch(`/api/proposals/${proposalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: descValue.trim() || null }),
    });
    setEditingDesc(false);
    await fetchAll();
  };

  const handleAddStop = async () => {
    if (!stopName.trim()) return;
    setSavingStop(true);
    try {
      await fetch(`/api/proposals/${proposalId}/stops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeName: stopName.trim(),
          nightsCount: stopNights ? parseInt(stopNights, 10) : null,
          notes: stopNotes.trim() || null,
        }),
      });
      setStopName(''); setStopNights(''); setStopNotes('');
      setAddingStop(false);
      await fetchAll();
    } finally {
      setSavingStop(false);
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    await fetch(`/api/proposals/${proposalId}/stops/${stopId}`, { method: 'DELETE' });
    await fetchAll();
  };

  const handleRemoveIdea = async (ideaId: string) => {
    // Detach idea from proposal (set proposalId to null)
    await fetch(`/api/ideas/${ideaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId: null }),
    });
    await fetchAll();
  };

  // Reorder stops via drag-and-drop
  const handleStopDragEnd = async (event: DragEndEvent) => {
    if (!proposal) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = proposal.stops.findIndex(s => s.id === active.id);
    const newIndex = proposal.stops.findIndex(s => s.id === over.id);
    const reordered = arrayMove(proposal.stops, oldIndex, newIndex);

    setProposal({ ...proposal, stops: reordered });

    await Promise.all(
      reordered.map((stop, index) =>
        fetch(`/api/proposals/${proposalId}/stops/${stop.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: index }),
        }),
      ),
    );
  };

  // ─── Early returns ─────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  if (!proposal || !trip) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <p className="text-gray-500">Proposal not found</p>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto p-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button onClick={() => router.push('/')} className="text-blue-600 dark:text-blue-400 hover:underline">
            Trips
          </button>
          <span className="text-gray-400">/</span>
          <button onClick={() => router.push(`/trip/${tripId}`)} className="text-blue-600 dark:text-blue-400 hover:underline">
            {trip.name}
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600 dark:text-gray-400">Edit Proposal</span>
        </div>

        {/* Title */}
        <div className="mb-6">
          {editingTitle ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                className="flex-1 text-2xl font-bold px-3 py-1 border-2 border-blue-400 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                autoFocus
              />
              <button onClick={saveTitle} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Save</button>
              <button onClick={() => setEditingTitle(false)} className="px-3 py-2 text-gray-500 text-sm hover:text-gray-700">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-3 group">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{proposal.title}</h1>
              <button
                onClick={() => setEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                title="Edit title"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          )}
          {proposal.selected && (
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
              ✓ Selected by client
            </span>
          )}
        </div>

        {/* Description / Agent Narrative */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Agent Narrative
            </h2>
            {!editingDesc && (
              <button onClick={() => setEditingDesc(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                {proposal.description ? 'Edit' : '+ Add narrative'}
              </button>
            )}
          </div>
          {editingDesc ? (
            <div className="space-y-3">
              <textarea
                value={descValue}
                onChange={e => setDescValue(e.target.value)}
                placeholder="Explain why this route works — the highlights, the vibe, why you're excited about it for this client..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-sm resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={saveDesc} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Save</button>
                <button onClick={() => { setEditingDesc(false); setDescValue(proposal.description ?? ''); }} className="px-3 py-2 text-gray-500 text-sm">Cancel</button>
              </div>
            </div>
          ) : proposal.description ? (
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">{proposal.description}</p>
          ) : (
            <p className="text-gray-400 italic text-sm">No narrative yet. Click "+ Add narrative" to explain why this route works for your client.</p>
          )}
        </div>

        {/* Stops (Route) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Route / Stops
            </h2>
            {!addingStop && (
              <button onClick={() => setAddingStop(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                + Add Stop
              </button>
            )}
          </div>

          {proposal.stops.length === 0 && !addingStop ? (
            <p className="text-gray-400 italic text-sm">No stops yet. Add destinations like "Rome (4 nights)" or "Lake Como (3 nights)".</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleStopDragEnd}
            >
              <SortableContext items={proposal.stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {proposal.stops.map((stop, index) => (
                    <DraggableIdeaCard key={stop.id} id={stop.id}>
                      <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold mt-0.5">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">📍 {stop.placeName}</span>
                            {stop.nightsCount && (
                              <span className="text-sm text-gray-500 dark:text-gray-400">· {stop.nightsCount} night{stop.nightsCount !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                          {stop.notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stop.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteStop(stop.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                          title="Remove stop"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </DraggableIdeaCard>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Add stop form */}
          {addingStop && (
            <div className={`mt-3 p-4 border-2 border-blue-300 dark:border-blue-700 rounded-xl space-y-3 ${proposal.stops.length > 0 ? 'mt-3' : ''}`}>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">City / Destination *</label>
                  <input
                    type="text"
                    value={stopName}
                    onChange={e => setStopName(e.target.value)}
                    placeholder="e.g., Rome"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nights (optional)</label>
                  <input
                    type="number"
                    min={1}
                    value={stopNights}
                    onChange={e => setStopNights(e.target.value)}
                    placeholder="e.g., 4"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Logistics note (optional)</label>
                  <input
                    type="text"
                    value={stopNotes}
                    onChange={e => setStopNotes(e.target.value)}
                    placeholder="e.g., Train from Rome ~3h"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddStop}
                  disabled={!stopName.trim() || savingStop}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {savingStop ? 'Adding...' : 'Add Stop'}
                </button>
                <button onClick={() => { setAddingStop(false); setStopName(''); setStopNights(''); setStopNotes(''); }} className="px-3 py-2 text-gray-500 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ideas attached to this proposal */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Ideas for This Proposal
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Hotels, restaurants, activities you're considering for this route</p>
            </div>
            <button
              onClick={() => setShowAddIdea(true)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Add Idea
            </button>
          </div>

          {proposal.ideas.length === 0 ? (
            <p className="text-gray-400 italic text-sm">No ideas attached yet. Add hotels, restaurants, and activities to flesh out this option.</p>
          ) : (
            <div className="space-y-3">
              {proposal.ideas.map(idea => {
                const place = placesCache[idea.placeId];
                if (!place) return null;
                return (
                  <div
                    key={idea.id}
                    className={`border rounded-xl p-3 ${STATE_COLORS[idea.state] || STATE_COLORS.FLEXIBLE}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3 min-w-0">
                        {idea.photos?.[0] && (
                          <img src={idea.photos[0].url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            {CATEGORY_EMOJI[idea.category]} {place.displayName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{place.formattedAddress}</p>
                          {idea.price && <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 font-medium">{idea.price}</p>}
                          {idea.destinationLabel && (
                            <p className="text-xs text-gray-400 mt-0.5">📍 {idea.destinationLabel}</p>
                          )}
                          {idea.agentNotes && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 italic mt-1">"{idea.agentNotes}"</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveIdea(idea.id)}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0"
                        title="Remove from proposal"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Add Idea Modal — pre-linked to this proposal */}
      <AddIdeaModal
        tripId={tripId}
        tripStartDate={trip.startDate}
        tripEndDate={trip.endDate}
        isOpen={showAddIdea}
        onClose={() => setShowAddIdea(false)}
        onIdeaAdded={async () => {
          // The idea was created — now we need to link it to this proposal
          // We'll handle this by fetching the latest idea and patching it
          // For now, just refresh and the user can see it in the trip itinerary
          await fetchAll();
        }}
        defaultProposalId={proposalId}
      />
    </div>
  );
}
