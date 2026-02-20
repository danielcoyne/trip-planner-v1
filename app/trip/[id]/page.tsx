'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AddIdeaModal from '@/components/AddIdeaModal';
import EditIdeaModal from '@/components/EditIdeaModal';
import TripMap from '@/components/TripMap';
import DateRangePicker from '@/components/DateRangePicker';
import ProposalsTab from '@/components/ProposalsTab';
import CommentsTab from '@/components/CommentsTab';
import DroppableDestinationSection from '@/components/DroppableDestinationSection';
import DraggableIdeaCard from '@/components/DraggableIdeaCard';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { updateTripDates } from './tripDates.actions';
import { toYMD, fromYMD, coerceDateOnly } from '@/lib/dateOnly';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  description: string | null;
  sortOrder: number;
  selected: boolean;
  stops: ProposalStop[];
  ideas: Array<{ id: string; category: string; state: string }>;
}

interface Trip {
  id: string;
  name: string;
  clientName: string | null;
  destination: string | null;
  startDate: string;
  endDate: string;
  status: string;
  requirements: string | null;
  reviewToken: string | null;
  coverImageUrl: string | null;
  coverImageUpdatedAt: string | null;
}

interface TripIdea {
  id: string;
  placeId: string;
  category: string;
  state: string;
  day: number | null;
  endDay: number | null;
  sortOrder: number | null;
  mealSlot: string | null;
  agentNotes: string | null;
  price: string | null;
  destinationLabel: string | null;
  proposalId: string | null;
  time: string | null;
  externalUrl: string | null;
  photos: Array<{ id: string; url: string; sortOrder: number }>;
  comments: Array<{ id: string; author: string; text: string; createdAt: string }>;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  RESTAURANT: '🍽️',
  COFFEE: '☕',
  BAR: '🍸',
  ATTRACTION: '📍',
  MUSEUM: '🏛️',
  TOUR: '🚶',
  HOTEL: '🏨',
  AIRBNB: '🏠',
  ACTIVITY: '🎯',
  TRANSPORT: '🚗',
};

const STATE_DISPLAY: Record<string, { dot: string; label: string }> = {
  ANCHOR: { dot: '🔴', label: 'Must-do' },
  FLEXIBLE: { dot: '🟡', label: 'May-do' },
  SPONTANEOUS: { dot: '🟢', label: 'Spontaneous' },
};

const STATE_COLORS: Record<string, string> = {
  ANCHOR: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  FLEXIBLE: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  SPONTANEOUS: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
};

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'proposals' | 'itinerary' | 'comments' | 'map';

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [ideas, setIdeas] = useState<TripIdea[]>([]);
  const [proposals, setProposals] = useState<TripProposal[]>([]);
  const [placesCache, setPlacesCache] = useState<Record<string, Place>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('proposals');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState<TripIdea | null>(null);
  const [showEditDatesModal, setShowEditDatesModal] = useState(false);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>();
  const [editEndDate, setEditEndDate] = useState<Date | undefined>();
  const [datesError, setDatesError] = useState('');
  const [savingDates, setSavingDates] = useState(false);

  // Cover photo
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
  const [coverImageError, setCoverImageError] = useState('');
  const [showCoverPhotoMenu, setShowCoverPhotoMenu] = useState(false);
  const coverPhotoMenuRef = useRef<HTMLDivElement>(null);

  // Drag-and-drop
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const clientCommentCount = ideas.reduce(
    (sum, idea) => sum + (idea.comments?.filter(c => c.author === 'CLIENT').length ?? 0),
    0,
  );

  // ─── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => { fetchAll(); }, [id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (coverPhotoMenuRef.current && !coverPhotoMenuRef.current.contains(e.target as Node)) {
        setShowCoverPhotoMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchAll = async () => {
    try {
      const [tripRes, ideasRes, proposalsRes] = await Promise.all([
        fetch(`/api/trips?id=${id}`),
        fetch(`/api/ideas?tripId=${id}`),
        fetch(`/api/proposals?tripId=${id}`),
      ]);
      const tripData = await tripRes.json();
      const ideasData = await ideasRes.json();
      const proposalsData = await proposalsRes.json();

      const tripObj: Trip = tripData.trip;
      setTrip(tripObj);
      setIdeas(ideasData.ideas ?? []);
      setProposals(proposalsData ?? []);

      // Default to itinerary tab when planning has started
      if (tripObj.status === 'PLANNING' || tripObj.status === 'CONFIRMED') {
        setActiveTab(prev => (prev === 'proposals' ? 'itinerary' : prev));
      }

      // Fetch place details in parallel
      const placeIds = [...new Set((ideasData.ideas ?? []).map((i: TripIdea) => i.placeId))] as string[];
      const places: Record<string, Place> = {};
      await Promise.all(
        placeIds.map(async (placeId) => {
          try {
            const res = await fetch(`/api/places/${placeId}`);
            const data = await res.json();
            if (data.place) places[placeId] = { ...data.place, placeId };
          } catch {}
        }),
      );
      setPlacesCache(places);
    } catch (err) {
      console.error('Error loading trip:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleGenerateReviewLink = async () => {
    try {
      await fetch('/api/review/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: id }),
      });
      await fetchAll();
    } catch { alert('Failed to generate review link'); }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (!confirm('Delete this idea?')) return;
    const res = await fetch(`/api/ideas/${ideaId}`, { method: 'DELETE' });
    if (res.ok) await fetchAll();
    else alert('Failed to delete idea');
  };

  const handleEditIdea = (idea: TripIdea) => { setEditingIdea(idea); setShowEditModal(true); };

  const handleSaveEdit = async (ideaId: string, updates: Record<string, unknown>) => {
    const res = await fetch(`/api/ideas/${ideaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) alert('Failed to update idea');
  };

  const handleSaveDates = async () => {
    if (!editStartDate || !editEndDate) { setDatesError('Please select both dates'); return; }
    setSavingDates(true);
    setDatesError('');
    try {
      const result = await updateTripDates(id, toYMD(editStartDate), toYMD(editEndDate));
      if (result.success) { setShowEditDatesModal(false); await fetchAll(); }
      else setDatesError(result.error);
    } catch { setDatesError('An unexpected error occurred'); }
    finally { setSavingDates(false); }
  };

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.type)) { setCoverImageError('Use JPEG, PNG, WebP, or AVIF.'); return; }
    if (file.size > 4_500_000) { setCoverImageError('Max 4.5 MB.'); return; }
    setUploadingCoverImage(true);
    setCoverImageError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/trips/${id}/cover-image`, { method: 'POST', body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Upload failed'); }
      await fetchAll();
    } catch (err) {
      setCoverImageError(err instanceof Error ? err.message : 'Upload failed');
    } finally { setUploadingCoverImage(false); event.target.value = ''; }
  };

  // ─── Drag-and-drop ─────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ideaId = active.id as string;
    const overId = over.id as string;

    let newDestination: string | null = null;
    const overIdea = ideas.find(i => i.id === overId);
    if (overIdea) {
      newDestination = overIdea.destinationLabel;
    } else if (overId === 'dest-unassigned') {
      newDestination = null;
    } else if (overId.startsWith('dest-')) {
      newDestination = overId.replace('dest-', '');
    }

    const destIdeas = ideas.filter(i => i.id !== ideaId && i.destinationLabel === newDestination);
    let newSortOrder = destIdeas.length;
    if (overIdea) {
      const overIndex = destIdeas.findIndex(i => i.id === overId);
      if (overIndex >= 0) newSortOrder = overIndex;
    }

    setIdeas(prev =>
      prev.map(idea =>
        idea.id === ideaId ? { ...idea, destinationLabel: newDestination, sortOrder: newSortOrder } : idea,
      ),
    );

    try {
      await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationLabel: newDestination, sortOrder: newSortOrder }),
      });
      await fetchAll();
    } catch { await fetchAll(); }
  };

  const handleDragCancel = () => setActiveId(null);

  // ─── Derived data ──────────────────────────────────────────────────────────

  const selectedProposal = proposals.find(p => p.selected) ?? null;
  const stopDestinations = selectedProposal ? selectedProposal.stops.map(s => s.placeName) : [];
  const ideaDestinations = [...new Set(ideas.map(i => i.destinationLabel).filter(Boolean))] as string[];
  const allDestinations = [
    ...stopDestinations,
    ...ideaDestinations.filter(d => !stopDestinations.includes(d)),
  ];

  const sortIdeas = (arr: TripIdea[]) => {
    const mealOrder: Record<string, number> = { BREAKFAST: 1, LUNCH: 2, DINNER: 3, SNACK: 4 };
    return [...arr].sort((a, b) => {
      const as = a.sortOrder ?? Infinity, bs = b.sortOrder ?? Infinity;
      if (as !== bs) return as - bs;
      const al = a.category === 'HOTEL' || a.category === 'AIRBNB';
      const bl = b.category === 'HOTEL' || b.category === 'AIRBNB';
      if (al && !bl) return -1; if (!al && bl) return 1;
      const at = a.time || '', bt = b.time || '';
      if (at !== bt) return at < bt ? -1 : 1;
      const am = a.mealSlot ? mealOrder[a.mealSlot] || 99 : 99;
      const bm = b.mealSlot ? mealOrder[b.mealSlot] || 99 : 99;
      if (am !== bm) return am - bm;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });
  };

  const unassignedIdeas = sortIdeas(ideas.filter(i => !i.destinationLabel));
  const activeIdea = activeId ? ideas.find(i => i.id === activeId) ?? null : null;
  const ideasCache = Object.fromEntries(ideas.map(i => [i.id, { placeId: i.placeId }]));

  // ─── Idea card ─────────────────────────────────────────────────────────────

  const renderIdeaCard = (idea: TripIdea) => {
    const place = placesCache[idea.placeId];
    if (!place) return null;
    const isLodging = idea.category === 'HOTEL' || idea.category === 'AIRBNB';
    const clientComments = idea.comments?.filter(c => c.author === 'CLIENT') ?? [];

    if (isLodging) {
      return (
        <div className="border-2 rounded-xl p-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
          <div className="flex gap-4">
            {idea.photos?.[0] && (
              <img src={idea.photos[0].url} alt="" className="w-28 h-20 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {CATEGORY_EMOJI[idea.category]} {place.displayName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{place.formattedAddress}</p>
                  {place.rating && <p className="text-xs text-gray-400 mt-0.5">⭐ {place.rating}</p>}
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button onClick={() => handleEditIdea(idea)} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Edit</button>
                  <button onClick={() => handleDeleteIdea(idea.id)} className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Delete</button>
                </div>
              </div>
              {idea.price && <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{idea.price}</p>}
              {idea.day && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Day {idea.day}{idea.endDay ? `–${idea.endDay}` : ''}
                  {idea.endDay ? ` · ${idea.endDay - idea.day} night${idea.endDay - idea.day !== 1 ? 's' : ''}` : ''}
                </p>
              )}
              {idea.agentNotes && (
                <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Notes: </span>{idea.agentNotes}
                </div>
              )}
              <div className="mt-2 flex gap-3 text-sm">
                {idea.externalUrl ? (
                  <a href={idea.externalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">View Property →</a>
                ) : (
                  <a href={place.googleMapsUri} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">View on Google Maps →</a>
                )}
              </div>
              {clientComments.length > 0 && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
                  💬 {clientComments.length} client comment{clientComments.length !== 1 ? 's' : ''} — see Comments tab
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`border-2 rounded-xl p-4 ${STATE_COLORS[idea.state] || STATE_COLORS.FLEXIBLE}`}>
        <div className="flex gap-4">
          {idea.photos?.[0] && (
            <img src={idea.photos[0].url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                  {CATEGORY_EMOJI[idea.category]} {place.displayName}
                  {idea.time && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-normal">
                      {formatTime(idea.time)}
                    </span>
                  )}
                  {idea.mealSlot && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-normal">
                      {idea.mealSlot.charAt(0) + idea.mealSlot.slice(1).toLowerCase()}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{place.formattedAddress}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-xs">{STATE_DISPLAY[idea.state]?.dot}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{STATE_DISPLAY[idea.state]?.label}</span>
                  {place.rating && <span className="text-xs text-gray-400">· ⭐ {place.rating}</span>}
                  {idea.price && <span className="text-xs text-gray-500 dark:text-gray-400">· {idea.price}</span>}
                </div>
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <button onClick={() => handleEditIdea(idea)} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Edit</button>
                <button onClick={() => handleDeleteIdea(idea.id)} className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Delete</button>
              </div>
            </div>
            {idea.agentNotes && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">"{idea.agentNotes}"</p>
            )}
            {idea.day && <p className="text-xs text-gray-400 mt-1">Day {idea.day}</p>}
            {clientComments.length > 0 && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
                💬 {clientComments.length} client comment{clientComments.length !== 1 ? 's' : ''} — see Comments tab
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Loading / not found ───────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  if (!trip) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <p className="text-gray-500">Trip not found</p>
    </div>
  );

  const reviewUrl = trip.reviewToken ? `${window.location.origin}/review/${trip.reviewToken}` : null;

  const STATUS_BADGE: Record<string, string> = {
    DRAFT: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    REVIEW: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    PLANNING: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    CONFIRMED: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  };
  const STATUS_LABEL: Record<string, string> = {
    DRAFT: 'Draft',
    REVIEW: 'Awaiting Client',
    PLANNING: 'Planning',
    CONFIRMED: 'Confirmed',
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto p-8">

        <button onClick={() => router.push('/')} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline text-sm">
          ← Back to Trips
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white truncate">{trip.name}</h1>
              <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[trip.status] || STATUS_BADGE.DRAFT}`}>
                {STATUS_LABEL[trip.status] || trip.status}
              </span>
            </div>
            {trip.clientName && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Client: {trip.clientName}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>
                {coerceDateOnly(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                {coerceDateOnly(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <button
                onClick={() => { setEditStartDate(fromYMD(trip.startDate)); setEditEndDate(fromYMD(trip.endDate)); setDatesError(''); setShowEditDatesModal(true); }}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Edit dates
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => router.push(`/trip/${id}/itinerary`)}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 font-medium"
            >
              View Itinerary →
            </button>

            {/* Cover photo dropdown */}
            <div className="relative" ref={coverPhotoMenuRef}>
              <button
                onClick={() => setShowCoverPhotoMenu(!showCoverPhotoMenu)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Cover
              </button>
              {showCoverPhotoMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-10 p-3">
                  {trip.coverImageUrl && (
                    <img src={trip.coverImageUrl} alt="Cover" className="w-full h-28 object-cover rounded-lg mb-3" />
                  )}
                  <label className="block w-full px-3 py-2 text-sm text-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">
                    {uploadingCoverImage ? 'Uploading...' : trip.coverImageUrl ? 'Change Photo' : 'Upload Photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={e => { handleCoverImageUpload(e); setShowCoverPhotoMenu(false); }}
                      disabled={uploadingCoverImage}
                      className="hidden"
                    />
                  </label>
                  {coverImageError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{coverImageError}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client Requirements */}
        {trip.requirements && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Client Requirements</h2>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{trip.requirements}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex gap-6">
            {(['proposals', 'itinerary', 'comments', 'map'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 font-medium text-sm relative transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {tab === 'proposals' && `Proposals (${proposals.length})`}
                {tab === 'itinerary' && `Itinerary (${ideas.length})`}
                {tab === 'comments' && (
                  <>
                    Comments
                    {clientCommentCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {clientCommentCount}
                      </span>
                    )}
                  </>
                )}
                {tab === 'map' && 'Map'}
              </button>
            ))}
          </div>
        </div>

        {/* Proposals tab */}
        {activeTab === 'proposals' && (
          <ProposalsTab
            tripId={id}
            proposals={proposals}
            reviewUrl={reviewUrl}
            onGenerateReviewLink={handleGenerateReviewLink}
            onProposalsChanged={fetchAll}
          />
        )}

        {/* Itinerary tab */}
        {activeTab === 'itinerary' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Itinerary</h2>
                {selectedProposal && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Based on: {selectedProposal.title}</p>
                )}
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium"
              >
                + Add Idea
              </button>
            </div>

            {ideas.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-3xl mb-3">✈️</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No ideas yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add hotels, restaurants, activities and more.</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <div className="space-y-10">
                  {allDestinations.map(dest => {
                    const destIdeas = sortIdeas(ideas.filter(i => i.destinationLabel === dest));
                    return (
                      <div key={dest}>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          📍 {dest}
                          <span className="text-sm font-normal text-gray-400">({destIdeas.length})</span>
                        </h3>
                        <DroppableDestinationSection destination={dest}>
                          <SortableContext items={destIdeas.map(i => i.id)} strategy={verticalListSortingStrategy}>
                            <div className="grid gap-3">
                              {destIdeas.map(idea => (
                                <DraggableIdeaCard key={idea.id} id={idea.id}>
                                  {renderIdeaCard(idea)}
                                </DraggableIdeaCard>
                              ))}
                            </div>
                          </SortableContext>
                        </DroppableDestinationSection>
                      </div>
                    );
                  })}

                  <div>
                    <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                      Flexible / Unassigned
                      <span className="text-sm font-normal text-gray-400">({unassignedIdeas.length})</span>
                    </h3>
                    <DroppableDestinationSection destination={null}>
                      <SortableContext items={unassignedIdeas.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        <div className="grid gap-3">
                          {unassignedIdeas.map(idea => (
                            <DraggableIdeaCard key={idea.id} id={idea.id}>
                              {renderIdeaCard(idea)}
                            </DraggableIdeaCard>
                          ))}
                        </div>
                      </SortableContext>
                    </DroppableDestinationSection>
                  </div>
                </div>

                <DragOverlay>
                  {activeIdea && (
                    <div className="rotate-2 shadow-2xl opacity-90">{renderIdeaCard(activeIdea)}</div>
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        )}

        {/* Comments tab */}
        {activeTab === 'comments' && (
          <CommentsTab tripId={id} placesCache={placesCache} ideasCache={ideasCache} />
        )}

        {/* Map tab */}
        {activeTab === 'map' && (
          <TripMap ideas={ideas} placesCache={placesCache} />
        )}
      </div>

      {/* Modals */}
      <AddIdeaModal
        tripId={id}
        tripStartDate={trip.startDate}
        tripEndDate={trip.endDate}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onIdeaAdded={fetchAll}
      />

      {showEditModal && editingIdea && (
        <EditIdeaModal
          idea={editingIdea}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
          placeName={placesCache[editingIdea.placeId]?.displayName || 'Unknown Place'}
          onClose={() => { setShowEditModal(false); setEditingIdea(null); }}
          onSave={handleSaveEdit}
          onSaved={fetchAll}
        />
      )}

      {showEditDatesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Edit Trip Dates</h3>
            <DateRangePicker
              startDate={editStartDate}
              endDate={editEndDate}
              onStartDateChange={setEditStartDate}
              onEndDateChange={setEditEndDate}
            />
            {datesError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{datesError}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditDatesModal(false)} disabled={savingDates}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg">
                Cancel
              </button>
              <button onClick={handleSaveDates} disabled={savingDates}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                {savingDates ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
