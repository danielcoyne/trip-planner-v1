'use client';

import { useState } from 'react';
import PlaceSearch from './PlaceSearch';

interface Place {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  types: string[];
  rating?: number;
}

interface AddIdeaModalProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
  onIdeaAdded: () => void;
}

export default function AddIdeaModal({ tripId, isOpen, onClose, onIdeaAdded }: AddIdeaModalProps) {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [category, setCategory] = useState('RESTAURANT');
  const [state, setState] = useState('FLEXIBLE');
  const [day, setDay] = useState<number | ''>('');
  const [endDay, setEndDay] = useState<number | ''>('');
  const [mealSlot, setMealSlot] = useState('');
  const [agentNotes, setAgentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [endDayError, setEndDayError] = useState<string>('');

  if (!isOpen) return null;

  const handleEndDayChange = (value: string) => {
    const newEndDay = value === '' ? '' : parseInt(value);
    setEndDay(newEndDay);

    // Validate endDay >= day
    if (newEndDay !== '' && day !== '' && newEndDay < day) {
      setEndDayError('End day must be after start day');
    } else {
      setEndDayError('');
    }
  };

  const handleDayChange = (value: string) => {
    const newDay = value === '' ? '' : parseInt(value);
    setDay(newDay);

    // Clear endDay if day is cleared
    if (newDay === '') {
      setEndDay('');
      setEndDayError('');
    }
    // Revalidate endDay if it exists
    else if (endDay !== '' && endDay < newDay) {
      setEndDayError('End day must be after start day');
    } else {
      setEndDayError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlace) {
      alert('Please select a place');
      return;
    }

    // Validate endDay
    if (endDay !== '' && day !== '' && endDay < day) {
      alert('End day must be after start day');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId,
          placeId: selectedPlace.placeId,
          category,
          state,
          day: day === '' ? null : day,
          endDay: endDay === '' ? null : endDay,
          mealSlot: mealSlot || null,
          agentNotes: agentNotes || null,
        }),
      });

      if (response.ok) {
        // Reset form
        setSelectedPlace(null);
        setCategory('RESTAURANT');
        setState('FLEXIBLE');
        setDay('');
        setEndDay('');
        setMealSlot('');
        setAgentNotes('');
        setEndDayError('');

        onIdeaAdded();
        onClose();
      } else {
        alert('Failed to add idea');
      }
    } catch (error) {
      console.error('Error adding idea:', error);
      alert('Error adding idea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Add Trip Idea</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Place Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search for a place *
              </label>
              <PlaceSearch
                onSelectPlace={setSelectedPlace}
                placeholder="Search restaurants, attractions, hotels..."
              />
              {selectedPlace && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-medium text-blue-900">{selectedPlace.displayName}</div>
                  <div className="text-sm text-blue-700">{selectedPlace.formattedAddress}</div>
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="RESTAURANT">Restaurant</option>
                <option value="ATTRACTION">Attraction</option>
                <option value="HOTEL">Hotel</option>
                <option value="ACTIVITY">Activity</option>
                <option value="TRANSPORT">Transport</option>
                <option value="GENERAL">General</option>
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intent State *
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ANCHOR">Anchor - Must-do, time-sensitive</option>
                <option value="FLEXIBLE">Flexible - Do if nearby</option>
                <option value="SPONTANEOUS">Spontaneous - Nice-to-have</option>
              </select>
            </div>

            {/* Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day (optional)
              </label>
              <input
                type="number"
                min="1"
                value={day}
                onChange={(e) => handleDayChange(e.target.value)}
                placeholder="e.g., 1, 2, 3..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* End Day (only show if day is selected) */}
            {day !== '' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Day (optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">For multi-day stays (e.g., hotels)</p>
                <input
                  type="number"
                  min={day}
                  value={endDay}
                  onChange={(e) => handleEndDayChange(e.target.value)}
                  placeholder={`${day} or later...`}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    endDayError ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {endDayError && (
                  <p className="mt-1 text-sm text-red-600">{endDayError}</p>
                )}
              </div>
            )}

            {/* Meal Slot (only show for restaurants) */}
            {category === 'RESTAURANT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meal Slot (optional)
                </label>
                <select
                  value={mealSlot}
                  onChange={(e) => setMealSlot(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  <option value="BREAKFAST">Breakfast</option>
                  <option value="LUNCH">Lunch</option>
                  <option value="DINNER">Dinner</option>
                  <option value="SNACK">Snack/Cafe</option>
                </select>
              </div>
            )}

            {/* Agent Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Notes (Why this place?)
              </label>
              <textarea
                value={agentNotes}
                onChange={(e) => setAgentNotes(e.target.value)}
                rows={4}
                placeholder="e.g., This trattoria doesn't look like much, but the owner's nonna makes the ragu—go on weekdays, it's slammed on weekends"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedPlace || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Idea'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}