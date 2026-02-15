'use client';

import { useState, useRef } from 'react';
import { fromYMD, toYMD } from '@/lib/dateOnly';
import { dateToDayNumber, formatDateDisplay, formatDateRangeDisplay, formatDateForInput } from '@/lib/formatters';

interface EditIdeaModalProps {
  idea: {
    id: string;
    category: string;
    state: string;
    day: number | null;
    endDay: number | null;
    mealSlot: string | null;
    agentNotes: string | null;
    time: string | null;
    externalUrl: string | null;
    photos: Array<{ id: string; url: string; sortOrder: number }>;
  };
  tripStartDate: string;
  tripEndDate: string;
  placeName: string;
  onClose: () => void;
  onSave: (ideaId: string, updates: any) => void | Promise<void>;
  onSaved?: () => void;
}

export default function EditIdeaModal({
  idea,
  tripStartDate,
  tripEndDate,
  placeName,
  onClose,
  onSave,
  onSaved,
}: EditIdeaModalProps) {
  // Helper: Convert day number to date string (YYYY-MM-DD)
  const dayNumberToDate = (dayNum: number | null): string => {
    if (!dayNum) return '';
    const tripStart = fromYMD(tripStartDate);
    const targetDate = new Date(
      tripStart.getFullYear(),
      tripStart.getMonth(),
      tripStart.getDate() + (dayNum - 1)
    );
    return toYMD(targetDate);
  };

  const [formData, setFormData] = useState({
    category: idea.category,
    state: idea.state,
    selectedDate: dayNumberToDate(idea.day),
    selectedEndDate: dayNumberToDate(idea.endDay),
    mealSlot: idea.mealSlot || '',
    agentNotes: idea.agentNotes || '',
    time: idea.time || '',
    externalUrl: idea.externalUrl || '',
  });

  const isMultiDay = formData.category === 'HOTEL' || formData.category === 'AIRBNB';
  const [endDateError, setEndDateError] = useState<string>('');
  const [existingPhotos, setExistingPhotos] = useState(idea.photos || []);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDateChange = (value: string) => {
    setFormData({ ...formData, selectedDate: value });

    // Clear end date if start date is cleared
    if (value === '') {
      setFormData({ ...formData, selectedDate: value, selectedEndDate: '' });
      setEndDateError('');
    }
    // Revalidate end date if it exists
    else if (
      formData.selectedEndDate !== '' &&
      fromYMD(formData.selectedEndDate) < fromYMD(value)
    ) {
      setEndDateError('End date must be after start date');
    } else {
      setEndDateError('');
    }
  };

  const handleEndDateChange = (value: string) => {
    setFormData({ ...formData, selectedEndDate: value });

    // Validate end date >= start date
    if (
      value !== '' &&
      formData.selectedDate !== '' &&
      fromYMD(value) < fromYMD(formData.selectedDate)
    ) {
      setEndDateError('End date must be after start date');
    } else {
      setEndDateError('');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await fetch(`/api/ideas/${idea.id}/photos/${photoId}`, { method: 'DELETE' });
      setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate end date
    if (
      formData.selectedEndDate !== '' &&
      formData.selectedDate !== '' &&
      fromYMD(formData.selectedEndDate) < fromYMD(formData.selectedDate)
    ) {
      alert('End date must be after start date');
      return;
    }

    setSaving(true);

    // Convert dates to day numbers
    const day = formData.selectedDate ? dateToDayNumber(formData.selectedDate, tripStartDate) : null;
    const endDay = formData.selectedEndDate ? dateToDayNumber(formData.selectedEndDate, tripStartDate) : null;

    const updates = {
      category: formData.category,
      state: formData.state,
      day,
      endDay,
      mealSlot: formData.mealSlot || null,
      agentNotes: formData.agentNotes || null,
      time: formData.time || null,
      externalUrl: formData.externalUrl || null,
    };

    await onSave(idea.id, updates);

    // Upload new photos sequentially
    if (selectedFiles.length > 0) {
      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress(`Uploading photo ${i + 1} of ${selectedFiles.length}...`);
        const photoFormData = new FormData();
        photoFormData.append('file', selectedFiles[i]);
        await fetch(`/api/ideas/${idea.id}/photos`, {
          method: 'POST',
          body: photoFormData,
        });
      }
      setUploadProgress('');
    }

    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit: {placeName}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                State
              </label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="ANCHOR">Must-do</option>
                <option value="FLEXIBLE">May-do</option>
                <option value="SPONTANEOUS">Spontaneous</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isMultiDay ? 'Check-in Date (optional)' : 'Date (optional)'}
              </label>
              <input
                type="date"
                min={formatDateForInput(tripStartDate)}
                max={formatDateForInput(tripEndDate)}
                value={formData.selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {formData.selectedDate && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {formatDateDisplay(formData.selectedDate)} (Day{' '}
                  {dateToDayNumber(formData.selectedDate, tripStartDate)})
                </p>
              )}
            </div>

            {/* Time (single-day categories only) */}
            {!isMultiDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time (optional)
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {/* Check-out Date (multi-day categories only) */}
            {isMultiDay && formData.selectedDate !== '' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Check-out Date (optional)
                </label>
                <input
                  type="date"
                  min={formData.selectedDate}
                  max={formatDateForInput(tripEndDate)}
                  value={formData.selectedEndDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    endDateError
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formData.selectedEndDate && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {formatDateRangeDisplay(formData.selectedDate, formData.selectedEndDate, tripStartDate)}
                  </p>
                )}
                {endDateError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{endDateError}</p>
                )}
              </div>
            )}

            {/* Property Link (AIRBNB only) */}
            {formData.category === 'AIRBNB' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Property Link (optional)
                </label>
                <input
                  type="url"
                  value={formData.externalUrl}
                  onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                  placeholder="https://airbnb.com/rooms/..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            )}

            {/* Meal Slot (only show for restaurants) */}
            {formData.category === 'RESTAURANT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Meal Slot (optional)
                </label>
                <select
                  value={formData.mealSlot}
                  onChange={(e) => setFormData({ ...formData, mealSlot: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Not specified</option>
                  <option value="BREAKFAST">Breakfast</option>
                  <option value="LUNCH">Lunch</option>
                  <option value="DINNER">Dinner</option>
                </select>
              </div>
            )}

            {/* Agent Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Agent Notes (WHY this place matters)
              </label>
              <textarea
                value={formData.agentNotes}
                onChange={(e) => setFormData({ ...formData, agentNotes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                rows={4}
                placeholder="Tell the client why this place is special..."
              />
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Photos (optional)
              </label>
              {(existingPhotos.length > 0 || selectedFiles.length > 0) && (
                <div className="flex gap-2 overflow-x-auto mb-2 pb-1">
                  {existingPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative flex-shrink-0 w-20 h-20 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <img
                        src={photo.url}
                        alt=""
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`new-${index}`}
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
                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-100"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {uploadProgress || (saving ? 'Saving...' : 'Save Changes')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
