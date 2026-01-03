'use client';

import { useState } from 'react';

interface EditIdeaModalProps {
  idea: {
    id: string;
    category: string;
    state: string;
    day: number | null;
    mealSlot: string | null;
    agentNotes: string | null;
  };
  placeName: string;
  onClose: () => void;
  onSave: (ideaId: string, updates: any) => void;
}

export default function EditIdeaModal({ idea, placeName, onClose, onSave }: EditIdeaModalProps) {
  const [formData, setFormData] = useState({
    category: idea.category,
    state: idea.state,
    day: idea.day || '',
    mealSlot: idea.mealSlot || '',
    agentNotes: idea.agentNotes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates = {
      category: formData.category,
      state: formData.state,
      day: formData.day ? Number(formData.day) : null,
      mealSlot: formData.mealSlot || null,
      agentNotes: formData.agentNotes || null,
    };

    onSave(idea.id, updates);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold">Edit: {placeName}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="ANCHOR">Anchor (must-do)</option>
                <option value="FLEXIBLE">Flexible (do if nearby)</option>
                <option value="SPONTANEOUS">Spontaneous (nice-to-have)</option>
              </select>
            </div>

            {/* Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Day (optional)
              </label>
              <input
                type="number"
                min="1"
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Which day?"
              />
            </div>

            {/* Meal Slot (only show for restaurants) */}
            {formData.category === 'RESTAURANT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Slot (optional)
                </label>
                <select
                  value={formData.mealSlot}
                  onChange={(e) => setFormData({ ...formData, mealSlot: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent Notes (WHY this place matters)
              </label>
              <textarea
                value={formData.agentNotes}
                onChange={(e) => setFormData({ ...formData, agentNotes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
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