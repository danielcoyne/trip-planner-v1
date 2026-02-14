'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AddIdeaModal from '@/components/AddIdeaModal';
import TripMap from '@/components/TripMap';
import ReactionsView from '@/components/ReactionsView';
import EditIdeaModal from '@/components/EditIdeaModal';
import SegmentsEditor from '@/components/SegmentsEditor';
import DateRangePicker from '@/components/DateRangePicker';
import { updateTripDates } from './tripDates.actions';
import { toYMD, fromYMD, coerceDateOnly } from '@/lib/dateOnly';
import DraggableIdeaCard from '@/components/DraggableIdeaCard';
import DroppableDaySection from '@/components/DroppableDaySection';
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

interface TripSegment {
  id: string;
  startDate: string;
  endDate: string;
  placeName: string;
  notes: string | null;
}

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  startDate: string;
  endDate: string;
  requirements: string;
  reviewToken: string | null;
  coverImageUrl: string | null;
  coverImageUpdatedAt: string | null;
  segments?: TripSegment[];
}

interface TripIdea {
  id: string;
  placeId: string;
  category: string;
  state: string;
  status: string;
  day: number | null;
  endDay: number | null;
  sortOrder: number | null;
  mealSlot: string | null;
  agentNotes: string | null;
  time: string | null;
  externalUrl: string | null;
  photos: Array<{ id: string; url: string; sortOrder: number }>;
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

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [showEditDatesModal, setShowEditDatesModal] = useState(false);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>();
  const [editEndDate, setEditEndDate] = useState<Date | undefined>();
  const [datesError, setDatesError] = useState<string>('');
  const [savingDates, setSavingDates] = useState(false);
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
  const [coverImageError, setCoverImageError] = useState<string>('');
  const [showCoverPhotoMenu, setShowCoverPhotoMenu] = useState(false);
  const coverPhotoMenuRef = useRef<HTMLDivElement>(null);
  const coverPhotoInputRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  useEffect(() => {
    fetchTripData();
  }, [id]);

  // Close cover photo menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (coverPhotoMenuRef.current && !coverPhotoMenuRef.current.contains(event.target as Node)) {
        setShowCoverPhotoMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTripData = async () => {
    try {
      const response = await fetch(`/api/trips?id=${id}`);
      const data = await response.json();
      setTrip(data.trip);

      const ideasResponse = await fetch(`/api/ideas?tripId=${id}`);
      const ideasData = await ideasResponse.json();
      setIdeas(ideasData.ideas);

      // Count feedback (ideas with reactions)
      const reactedIdeas = ideasData.ideas.filter(
        (idea: any) => idea.reactions && idea.reactions.length > 0
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
              placeId: placeId,
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

      if (!response.ok) {
        alert('Failed to update idea');
      }
    } catch (error) {
      console.error('Error updating idea:', error);
      alert('Failed to update idea');
    }
  };

  const openEditDatesModal = () => {
    setEditStartDate(fromYMD(trip!.startDate));
    setEditEndDate(fromYMD(trip!.endDate));
    setDatesError('');
    setShowEditDatesModal(true);
  };

  const handleSaveDates = async () => {
    if (!editStartDate || !editEndDate) {
      setDatesError('Please select both start and end dates');
      return;
    }

    setSavingDates(true);
    setDatesError('');

    try {
      const result = await updateTripDates(id, toYMD(editStartDate), toYMD(editEndDate));

      if (result.success) {
        setShowEditDatesModal(false);
        await fetchTripData();
      } else {
        setDatesError(result.error);
      }
    } catch (error) {
      setDatesError('An unexpected error occurred');
    } finally {
      setSavingDates(false);
    }
  };

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      setCoverImageError('Invalid file type. Please upload a JPEG, PNG, WebP, or AVIF image.');
      return;
    }

    if (file.size > 4_500_000) {
      setCoverImageError('File is too large. Maximum size is 4.5MB.');
      return;
    }

    setUploadingCoverImage(true);
    setCoverImageError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/trips/${id}/cover-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      // Refresh trip data to show new image
      await fetchTripData();
    } catch (error) {
      setCoverImageError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingCoverImage(false);
      // Reset the input so the same file can be uploaded again if needed
      event.target.value = '';
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ideaId = active.id as string;
    const overId = over.id as string;

    // Determine target day
    let newDay: number | null = null;
    const overIdea = ideas.find((i) => i.id === overId);
    if (overIdea) {
      newDay = overIdea.day;
    } else if (overId === 'day-unassigned') {
      newDay = null;
    } else if (overId.startsWith('day-')) {
      newDay = parseInt(overId.replace('day-', ''), 10);
    }

    // Determine sort order based on position in destination list
    const destIdeas = sortIdeasForDay(
      ideas.filter((i) => {
        if (i.id === ideaId) return false;
        if (newDay === null) return !i.day;
        if (!i.day) return false;
        if (!i.endDay) return i.day === newDay;
        return i.day <= newDay && newDay <= i.endDay;
      })
    );

    let newSortOrder = destIdeas.length;
    if (overIdea) {
      const overIndex = destIdeas.findIndex((i) => i.id === overId);
      if (overIndex >= 0) newSortOrder = overIndex;
    }

    // Optimistic update
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId ? { ...idea, day: newDay, sortOrder: newSortOrder } : idea
      )
    );

    try {
      await fetch('/api/ideas/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, newDay, newSortOrder }),
      });
      await fetchTripData();
    } catch (error) {
      console.error('Error reordering idea:', error);
      await fetchTripData();
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
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

  // Derive location line from REAL segments only
  const realSegments = trip.segments || [];
  const derivedLocation =
    realSegments.length === 0
      ? ''
      : realSegments.length === 1
        ? realSegments[0].placeName
        : realSegments.map((s) => s.placeName).join(' → ');

  // Calculate trip days
  const getTripDays = () => {
    const start = coerceDateOnly(trip.startDate);
    const end = coerceDateOnly(trip.endDate);
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
          year: 'numeric',
        }),
      });
      currentDate.setDate(currentDate.getDate() + 1);
      dayNumber++;
    }
    return days;
  };

  const tripDays = getTripDays();

  // Group ideas by day
  const getIdeasForDay = (dayNumber: number) => {
    return ideas.filter((idea) => {
      if (!idea.day) return false;
      // Single-day idea
      if (!idea.endDay) return idea.day === dayNumber;
      // Multi-day idea: show on all days in range
      return idea.day <= dayNumber && dayNumber <= idea.endDay;
    });
  };

  // Get unassigned ideas
  const unassignedIdeas = ideas.filter((idea) => !idea.day);
  const activeIdea = activeId ? ideas.find((i) => i.id === activeId) || null : null;

  // Sort ideas within a day
  const sortIdeasForDay = (dayIdeas: TripIdea[]) => {
    const mealOrder: Record<string, number> = { BREAKFAST: 1, LUNCH: 2, DINNER: 3, SNACK: 4 };

    return dayIdeas.sort((a, b) => {
      // 1. sortOrder ascending (nulls last)
      const aSort = a.sortOrder ?? Infinity;
      const bSort = b.sortOrder ?? Infinity;
      if (aSort !== bSort) return aSort - bSort;

      // 2. Hotels/Airbnbs first
      const aIsLodging = a.category === 'HOTEL' || a.category === 'AIRBNB';
      const bIsLodging = b.category === 'HOTEL' || b.category === 'AIRBNB';
      if (aIsLodging && !bIsLodging) return -1;
      if (!aIsLodging && bIsLodging) return 1;

      // 3. Time ascending (HH:MM strings sort correctly)
      const aTime = a.time || '';
      const bTime = b.time || '';
      if (aTime !== bTime) return aTime < bTime ? -1 : 1;

      // 4. Meal slot order
      const aMeal = a.mealSlot ? mealOrder[a.mealSlot] || 99 : 99;
      const bMeal = b.mealSlot ? mealOrder[b.mealSlot] || 99 : 99;
      if (aMeal !== bMeal) return aMeal - bMeal;

      // 5. createdAt
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });
  };

  // Category emoji mapping
  const categoryEmojis: Record<string, string> = {
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

  const categoryLabels: Record<string, string> = {
    RESTAURANT: 'Restaurant',
    COFFEE: 'Coffee & Café',
    BAR: 'Bar & Cocktails',
    ATTRACTION: 'Attraction',
    MUSEUM: 'Museum',
    TOUR: 'Tour',
    HOTEL: 'Hotel',
    AIRBNB: 'Airbnb / VRBO',
    ACTIVITY: 'Activity',
    TRANSPORT: 'Transport',
  };

  const stateDisplay: Record<string, { dot: string; label: string }> = {
    ANCHOR: { dot: '🔴', label: 'Must-do' },
    FLEXIBLE: { dot: '🟡', label: 'May-do' },
    SPONTANEOUS: { dot: '🟢', label: 'Spontaneous' },
  };

  // Format time "19:30" → "7:30 PM"
  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const renderIdeaCard = (
    idea: TripIdea,
    showDayRange = false,
    currentDayNumber: number | null = null
  ) => {
    const place = placesCache[idea.placeId];
    if (!place) return null;

    const stateColors = {
      ANCHOR: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      FLEXIBLE: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      SPONTANEOUS: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    };

    const isAccommodation = idea.category === 'HOTEL' || idea.category === 'AIRBNB';
    const isFirstDayOfStay = idea.day === currentDayNumber || currentDayNumber === null;

    // Compact "continued" card for subsequent days of a stay
    if (isAccommodation && !isFirstDayOfStay) {
      return (
        <div
          key={idea.id}
          className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <span className="text-base">{categoryEmojis[idea.category] || '📍'}</span>
            <span className="font-medium text-gray-900 dark:text-white">{place.displayName}</span>
            <span className="text-gray-400 dark:text-gray-500 italic">(continued)</span>
            <span className="text-gray-400 dark:text-gray-500">•</span>
            <span className="text-gray-500 dark:text-gray-400 truncate max-w-xs">
              {place.formattedAddress}
            </span>
            {idea.externalUrl && (
              <>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <a
                  href={idea.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Property →
                </a>
              </>
            )}
          </div>
        </div>
      );
    }

    // Full-size accommodation card (first day of stay or unassigned)
    if (isAccommodation && isFirstDayOfStay) {
      const nights = idea.day && idea.endDay ? idea.endDay - idea.day : null;
      const checkinDay = idea.day ? tripDays.find((d) => d.number === idea.day) : null;
      const checkoutDay = idea.endDay ? tripDays.find((d) => d.number === idea.endDay) : null;
      const checkinFormatted = checkinDay
        ? checkinDay.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null;
      const checkoutFormatted = checkoutDay
        ? checkoutDay.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null;

      return (
        <div
          key={idea.id}
          className="border-2 rounded-lg p-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"
        >
          <div className="flex gap-4">
            {idea.photos && idea.photos.length > 0 && (
              <img
                src={idea.photos[0].url}
                alt=""
                className="w-[120px] h-20 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {categoryEmojis[idea.category] || '📍'} {place.displayName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {place.formattedAddress}
                  </p>
                  {place.rating && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      ⭐ {place.rating}
                    </p>
                  )}
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

              {checkinFormatted && (
                <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                  Check-in {checkinFormatted}
                  {checkoutFormatted && ` → Check-out ${checkoutFormatted}`}
                  {nights && ` (${nights} night${nights > 1 ? 's' : ''})`}
                </p>
              )}

              <div className="flex items-center gap-1.5 mt-1">
                <span>{stateDisplay[idea.state]?.dot}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {stateDisplay[idea.state]?.label}
                </span>
              </div>

              {idea.agentNotes && (
                <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <p className="font-medium text-sm mb-1 text-gray-900 dark:text-white">
                    Agent Notes:
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{idea.agentNotes}</p>
                </div>
              )}

              <div className="mt-2 flex gap-4">
                {idea.category === 'AIRBNB' && idea.externalUrl ? (
                  <a
                    href={idea.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    View Property →
                  </a>
                ) : (
                  <a
                    href={place.googleMapsUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    View on Google Maps →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const cardContent = (
      <>
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>
                {categoryEmojis[idea.category] || '📍'} {place.displayName}
              </span>
              {idea.time && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {formatTime(idea.time)}
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{place.formattedAddress}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span>{stateDisplay[idea.state]?.dot}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {stateDisplay[idea.state]?.label}
              </span>
            </div>
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
            <span>
              {categoryEmojis[idea.category] || '📍'}{' '}
              {categoryLabels[idea.category] || idea.category}
            </span>
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
        {idea.externalUrl && (
          <a
            href={idea.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 ml-4 inline-block text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            View Property →
          </a>
        )}
      </>
    );

    return (
      <div
        key={idea.id}
        className={`border-2 rounded-lg p-4 ${stateColors[idea.state as keyof typeof stateColors]}`}
      >
        {idea.photos && idea.photos.length > 0 ? (
          <div className="flex gap-4">
            <img
              src={idea.photos[0].url}
              alt=""
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">{cardContent}</div>
          </div>
        ) : (
          cardContent
        )}
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">{trip.name}</h1>
              <div className="flex items-center gap-3">
                <p className="text-xl text-gray-600 dark:text-gray-300">
                  {derivedLocation ? `${derivedLocation} • ` : ''}
                  {coerceDateOnly(trip.startDate).toLocaleDateString()} -{' '}
                  {coerceDateOnly(trip.endDate).toLocaleDateString()}
                </p>
                <button
                  onClick={openEditDatesModal}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Edit dates
                </button>
              </div>
            </div>

            {/* Cover Photo Button */}
            <div className="relative" ref={coverPhotoMenuRef}>
              <button
                onClick={() => setShowCoverPhotoMenu(!showCoverPhotoMenu)}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Cover Photo
              </button>

              {/* Cover Photo dropdown menu */}
              {showCoverPhotoMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <div className="p-3">
                    {trip.coverImageUrl ? (
                      <>
                        <div className="mb-3">
                          <img
                            src={trip.coverImageUrl}
                            alt="Cover"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        </div>
                        <label className="block w-full px-3 py-2 text-sm text-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
                          {uploadingCoverImage ? 'Uploading...' : 'Change Photo'}
                          <input
                            ref={coverPhotoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            onChange={(e) => {
                              handleCoverImageUpload(e);
                              setShowCoverPhotoMenu(false);
                            }}
                            disabled={uploadingCoverImage}
                            className="hidden"
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          No cover photo yet
                        </p>
                        <label className="block w-full px-3 py-2 text-sm text-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
                          {uploadingCoverImage ? 'Uploading...' : 'Upload Photo'}
                          <input
                            ref={coverPhotoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            onChange={(e) => {
                              handleCoverImageUpload(e);
                              setShowCoverPhotoMenu(false);
                            }}
                            disabled={uploadingCoverImage}
                            className="hidden"
                          />
                        </label>
                      </>
                    )}
                    {coverImageError && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {coverImageError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client Requirements */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Client Requirements
          </h2>
          <p className="text-gray-700 dark:text-gray-300">{trip.requirements}</p>
        </div>

        {/* Segments Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <SegmentsEditor
            tripId={id}
            tripStartDate={trip.startDate}
            tripEndDate={trip.endDate}
            realSegments={realSegments}
            onRefresh={fetchTripData}
          />
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
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            Share with Client
          </h2>
          {reviewUrl ? (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Copy this link to share with your client:
              </p>
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
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No ideas yet. Start adding some!
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <div className="space-y-8">
                  {/* Day-by-Day Sections */}
                  {tripDays.map((day) => {
                    const dayIdeas = sortIdeasForDay(getIdeasForDay(day.number));

                    // Check if this day is the first day of a segment with notes
                    const segmentWithNotes = realSegments.find((seg) => {
                      const segStart = coerceDateOnly(seg.startDate);
                      return segStart.getTime() === day.date.getTime() && seg.notes;
                    });

                    return (
                      <div key={day.number}>
                        {segmentWithNotes && (
                          <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                            <h4 className="font-semibold text-amber-900 dark:text-amber-200">
                              {segmentWithNotes.placeName} —{' '}
                              {coerceDateOnly(segmentWithNotes.startDate).toLocaleDateString(
                                'en-US',
                                { month: 'short', day: 'numeric' }
                              )}
                              –
                              {coerceDateOnly(segmentWithNotes.endDate).toLocaleDateString(
                                'en-US',
                                { month: 'short', day: 'numeric' }
                              )}
                            </h4>
                            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300 whitespace-pre-line">
                              {segmentWithNotes.notes}
                            </p>
                          </div>
                        )}
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                          Day {day.number} - {day.formatted}
                        </h3>
                        <DroppableDaySection dayNumber={day.number}>
                          <SortableContext
                            items={dayIdeas.map((i) => i.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="grid gap-4">
                              {dayIdeas.map((idea) => (
                                <DraggableIdeaCard key={idea.id} id={idea.id}>
                                  {renderIdeaCard(idea, true, day.number)}
                                </DraggableIdeaCard>
                              ))}
                            </div>
                          </SortableContext>
                        </DroppableDaySection>
                      </div>
                    );
                  })}

                  {/* Unassigned Ideas */}
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-300">
                      Ideas Not Yet Assigned to Days
                    </h3>
                    <DroppableDaySection dayNumber={null}>
                      <SortableContext
                        items={unassignedIdeas.map((i) => i.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="grid gap-4">
                          {unassignedIdeas.map((idea) => (
                            <DraggableIdeaCard key={idea.id} id={idea.id}>
                              {renderIdeaCard(idea, false, null)}
                            </DraggableIdeaCard>
                          ))}
                        </div>
                      </SortableContext>
                    </DroppableDaySection>
                  </div>
                </div>

                <DragOverlay>
                  {activeIdea ? (
                    <div className="rotate-2 shadow-2xl">
                      {renderIdeaCard(activeIdea, !!activeIdea.day, activeIdea.day)}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        )}

        {activeTab === 'feedback' && <ReactionsView ideas={ideas} placesCache={placesCache} />}

        {activeTab === 'map' && <TripMap ideas={ideas} placesCache={placesCache} />}

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
            onSaved={() => fetchTripData()}
          />
        )}

        {/* Edit Dates Modal */}
        {showEditDatesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Edit Trip Dates
              </h3>

              <DateRangePicker
                startDate={editStartDate}
                endDate={editEndDate}
                onStartDateChange={setEditStartDate}
                onEndDateChange={setEditEndDate}
              />

              {datesError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-200">{datesError}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditDatesModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  disabled={savingDates}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDates}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={savingDates}
                >
                  {savingDates ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
