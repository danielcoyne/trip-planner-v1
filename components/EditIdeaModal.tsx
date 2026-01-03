'use client';

import { useState } from 'react';

interface EditIdeaModalProps {
  idea: {
    id: string;
    category: string;
    state: string;
    day: number | null;
    endDay: number | null;
    mealSlot: string | null;
    agentNotes: string | null;
  };
  tripStartDate: string;
  tripEndDate: string;
  placeName: string;
  onClose: () => void;
  onSave: (ideaId: string, updates: any) => void;
}

export default function EditIdeaModal({ idea, tripStartDate, tripEndDate, placeName, onClose, onSave }: EditIdeaModalProps) {
  // Helper: Convert day number to date string (YYYY-MM-DD)
  const dayNumberToDate = (dayNum: number | null): string => {
    if (!dayNum) return '';
    const tripStart = new Date(tripStartDate);
    const targetDate = new Date(tripStart.getTime() + (dayNum - 1) * 24 * 60 * 60 * 1000);
    return targetDate.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    category: idea.category,
    state: idea.state,
    selectedDate: dayNumberToDate(idea.day),
    selectedEndDate: dayNumberToDate(idea.endDay),
    mealSlot: idea.mealSlot || '',
    agentNotes: idea.agentNotes || '',
  });
  const [endDateError, setEndDateError] = useState<string>('');

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
    setFormData({ ...formData, selectedDate: value });

    // Clear end date if start date is cleared
    if (value === '') {
      setFormData({ ...formData, selectedDate: value, selectedEndDate: '' });
      setEndDateError('');
    }
    // Revalidate end date if it exists
    else if (formData.selectedEndDate !== '' && new Date(formData.selectedEndDate) < new Date(value)) {
      setEndDateError('End date must be after start date');
    } else {
      setEndDateError('');
    }
  };

  const handleEndDateChange = (value: string) => {
    setFormData({ ...formData, selectedEndDate: value });

    // Validate end date >= start date
    if (value !== '' && formData.selectedDate !== '' && new Date(value) < new Date(formData.selectedDate)) {
      setEndDateError('End date must be after start date');
    } else {
      setEndDateError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate end date
    if (formData.selectedEndDate !== '' && formData.selectedDate !== '' && new Date(formData.selectedEndDate) < new Date(formData.selectedDate)) {
      alert('End date must be after start date');
      return;
    }

    // Convert dates to day numbers
    const day = formData.selectedDate ? dateToDayNumber(formData.selectedDate) : null;
    const endDay = formData.selectedEndDate ? dateToDayNumber(formData.selectedEndDate) : null;

    const updates = {
      category: formData.category,
      state: formData.state,
      day,
      endDay,
      mealSlot: formData.mealSlot || null,
      agentNotes: formData.agentNotes || null,
    };

    onSave(idea.id, updates);
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
                <option value="ATTRACTION">Attraction</option>
                <option value="HOTEL">Hotel</option>
                <option value="ACTIVITY">Activity</option>
                <option value="TRANSPORT">Transport</option>
                <option value="GENERAL">General</option>
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
                <option value="ANCHOR">Anchor (must-do)</option>
                <option value="FLEXIBLE">Flexible (do if nearby)</option>
                <option value="SPONTANEOUS">Spontaneous (nice-to-have)</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date (optional)
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
                  {formatDateDisplay(formData.selectedDate)} (Day {dateToDayNumber(formData.selectedDate)})
                </p>
              )}
            </div>

            {/* End Date (only show if date is selected) */}
            {formData.selectedDate !== '' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date (optional)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">For multi-day stays (e.g., hotels)</p>
                <input
                  type="date"
                  min={formData.selectedDate}
                  max={formatDateForInput(tripEndDate)}
                  value={formData.selectedEndDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    endDateError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formData.selectedEndDate && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {formatDateRangeDisplay(formData.selectedDate, formData.selectedEndDate)}
                  </p>
                )}
                {endDateError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{endDateError}</p>
                )}
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

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Save Changes
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