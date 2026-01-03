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
  tripStartDate: string;
  tripEndDate: string;
  isOpen: boolean;
  onClose: () => void;
  onIdeaAdded: () => void;
}

export default function AddIdeaModal({ tripId, tripStartDate, tripEndDate, isOpen, onClose, onIdeaAdded }: AddIdeaModalProps) {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [category, setCategory] = useState('RESTAURANT');
  const [state, setState] = useState('FLEXIBLE');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedEndDate, setSelectedEndDate] = useState<string>('');
  const [mealSlot, setMealSlot] = useState('');
  const [agentNotes, setAgentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [endDateError, setEndDateError] = useState<string>('');

  if (!isOpen) return null;

  // Helper: Convert date string (YYYY-MM-DD) to day number
  const dateToDayNumber = (dateStr: string): number => {
    const tripStart = new Date(tripStartDate);
    const selected = new Date(dateStr);
    const diffTime = selected.getTime() - tripStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  // Helper: Format date for display
  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Helper: Format date range for display
  const formatDateRangeDisplay = (startStr: string, endStr: string): string => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const startDay = dateToDayNumber(startStr);
    const endDay = dateToDayNumber(endStr);

    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (Days ${startDay}-${endDay})`;
  };

  // Helper: Format YYYY-MM-DD for date input min/max
  const formatDateForInput = (dateStr: string): string => {
    return dateStr.split('T')[0];
  };

  const handleDateChange = (value: string) => {
    setSelectedDate(value);

    // Clear end date if start date is cleared
    if (value === '') {
      setSelectedEndDate('');
      setEndDateError('');
    }
    // Revalidate end date if it exists
    else if (selectedEndDate !== '' && new Date(selectedEndDate) < new Date(value)) {
      setEndDateError('End date must be after start date');
    } else {
      setEndDateError('');
    }
  };

  const handleEndDateChange = (value: string) => {
    setSelectedEndDate(value);

    // Validate end date >= start date
    if (value !== '' && selectedDate !== '' && new Date(value) < new Date(selectedDate)) {
      setEndDateError('End date must be after start date');
    } else {
      setEndDateError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlace) {
      alert('Please select a place');
      return;
    }

    // Validate end date
    if (selectedEndDate !== '' && selectedDate !== '' && new Date(selectedEndDate) < new Date(selectedDate)) {
      alert('End date must be after start date');
      return;
    }

    setLoading(true);

    try {
      // Convert dates to day numbers
      const day = selectedDate ? dateToDayNumber(selectedDate) : null;
      const endDay = selectedEndDate ? dateToDayNumber(selectedEndDate) : null;

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
          day,
          endDay,
          mealSlot: mealSlot || null,
          agentNotes: agentNotes || null,
        }),
      });

      if (response.ok) {
        // Reset form
        setSelectedPlace(null);
        setCategory('RESTAURANT');
        setState('FLEXIBLE');
        setSelectedDate('');
        setSelectedEndDate('');
        setMealSlot('');
        setAgentNotes('');
        setEndDateError('');

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

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date (optional)
              </label>
              <input
                type="date"
                min={formatDateForInput(tripStartDate)}
                max={formatDateForInput(tripEndDate)}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {selectedDate && (
                <p className="mt-1 text-sm text-gray-600">
                  {formatDateDisplay(selectedDate)} (Day {dateToDayNumber(selectedDate)})
                </p>
              )}
            </div>

            {/* End Date (only show if date is selected) */}
            {selectedDate !== '' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">For multi-day stays (e.g., hotels)</p>
                <input
                  type="date"
                  min={selectedDate}
                  max={formatDateForInput(tripEndDate)}
                  value={selectedEndDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    endDateError ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {selectedEndDate && (
                  <p className="mt-1 text-sm text-gray-600">
                    {formatDateRangeDisplay(selectedDate, selectedEndDate)}
                  </p>
                )}
                {endDateError && (
                  <p className="mt-1 text-sm text-red-600">{endDateError}</p>
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