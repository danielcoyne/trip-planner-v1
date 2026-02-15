'use client';

import { useState, useRef } from 'react';
import PlaceSearch from './PlaceSearch';
import { dateToDayNumber, formatDateDisplay, formatDateRangeDisplay, formatDateForInput } from '@/lib/formatters';
import type { PlaceSearchResult } from '@/types/trip';

interface AddIdeaModalProps {
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  isOpen: boolean;
  onClose: () => void;
  onIdeaAdded: () => void;
}

export default function AddIdeaModal({
  tripId,
  tripStartDate,
  tripEndDate,
  isOpen,
  onClose,
  onIdeaAdded,
}: AddIdeaModalProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [category, setCategory] = useState('RESTAURANT');
  const [state, setState] = useState('FLEXIBLE');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedEndDate, setSelectedEndDate] = useState<string>('');
  const [mealSlot, setMealSlot] = useState('');
  const [agentNotes, setAgentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [endDateError, setEndDateError] = useState<string>('');
  const [time, setTime] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMultiDay = category === 'HOTEL' || category === 'AIRBNB';

  if (!isOpen) return null;

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
    if (
      selectedEndDate !== '' &&
      selectedDate !== '' &&
      new Date(selectedEndDate) < new Date(selectedDate)
    ) {
      alert('End date must be after start date');
      return;
    }

    setLoading(true);

    try {
      // Convert dates to day numbers
      const day = selectedDate ? dateToDayNumber(selectedDate, tripStartDate) : null;
      const endDay = selectedEndDate ? dateToDayNumber(selectedEndDate, tripStartDate) : null;

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
          time: time || null,
          externalUrl: externalUrl || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newIdeaId = data.idea.id;

        // Upload photos sequentially
        if (selectedFiles.length > 0) {
          for (let i = 0; i < selectedFiles.length; i++) {
            setUploadProgress(`Uploading photo ${i + 1} of ${selectedFiles.length}...`);
            const formData = new FormData();
            formData.append('file', selectedFiles[i]);
            await fetch(`/api/ideas/${newIdeaId}/photos`, {
              method: 'POST',
              body: formData,
            });
          }
          setUploadProgress('');
        }

        // Reset form
        setSelectedPlace(null);
        setCategory('RESTAURANT');
        setState('FLEXIBLE');
        setSelectedDate('');
        setSelectedEndDate('');
        setMealSlot('');
        setAgentNotes('');
        setEndDateError('');
        setTime('');
        setExternalUrl('');
        setSelectedFiles([]);

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Trip Idea</h2>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Place Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search for a place *
              </label>
              <PlaceSearch
                onSelectPlace={setSelectedPlace}
                placeholder="Search restaurants, attractions, hotels..."
              />
              {selectedPlace && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    {selectedPlace.displayName}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    {selectedPlace.formattedAddress}
                  </div>
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="RESTAURANT">Restaurant</option>
                <option value="COFFEE">Coffee &amp; Caf&eacute;</option>
                <option value="BAR">Bar &amp; Cocktails</option>
                <option value="ATTRACTION">Attraction</option>
                <option value="MUSEUM">Museum</option>
                <option value="TOUR">Tour</option>
                <option value="HOTEL">Hotel</option>
                <option value="AIRBNB">Airbnb / VRBO</option>
                <option value="ACTIVITY">Activity</option>
                <option value="TRANSPORT">Transport</option>
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Intent State *
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="ANCHOR">Must-do</option>
                <option value="FLEXIBLE">May-do</option>
                <option value="SPONTANEOUS">Spontaneous</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isMultiDay ? 'Check-in Date (optional)' : 'Date (optional)'}
              </label>
              <input
                type="date"
                min={formatDateForInput(tripStartDate)}
                max={formatDateForInput(tripEndDate)}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {selectedDate && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {formatDateDisplay(selectedDate)} (Day {dateToDayNumber(selectedDate, tripStartDate)})
                </p>
              )}
            </div>

            {/* Time (single-day categories only) */}
            {!isMultiDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time (optional)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {/* Check-out Date (multi-day categories only) */}
            {isMultiDay && selectedDate !== '' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Check-out Date (optional)
                </label>
                <input
                  type="date"
                  min={selectedDate}
                  max={formatDateForInput(tripEndDate)}
                  value={selectedEndDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    endDateError
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {selectedEndDate && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {formatDateRangeDisplay(selectedDate, selectedEndDate, tripStartDate)}
                  </p>
                )}
                {endDateError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{endDateError}</p>
                )}
              </div>
            )}

            {/* Property Link (AIRBNB only) */}
            {category === 'AIRBNB' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Property Link (optional)
                </label>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://airbnb.com/rooms/..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            )}

            {/* Meal Slot (only show for restaurants) */}
            {category === 'RESTAURANT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meal Slot (optional)
                </label>
                <select
                  value={mealSlot}
                  onChange={(e) => setMealSlot(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Notes (Why this place?)
              </label>
              <textarea
                value={agentNotes}
                onChange={(e) => setAgentNotes(e.target.value)}
                rows={4}
                placeholder="e.g., This trattoria doesn't look like much, but the owner's nonna makes the ragu—go on weekdays, it's slammed on weekends"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Photos (optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                  }
                  e.target.value = '';
                }}
                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-100"
              />
              {selectedFiles.length > 0 && (
                <div className="flex gap-2 overflow-x-auto mt-2 pb-1">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative flex-shrink-0 w-20 h-20 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedPlace || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {uploadProgress || (loading ? 'Adding...' : 'Add Idea')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
