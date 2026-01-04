'use client';

import { useState } from 'react';
import { createSegment, updateSegment, deleteSegment } from '@/app/trip/[id]/segments.actions';
import { buildDisplaySegments, type DisplaySegment } from '@/lib/tripSegments';

interface TripSegment {
  id: string;
  startDate: string;
  endDate: string;
  placeName: string;
  notes: string | null;
}

interface SegmentsEditorProps {
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  realSegments: TripSegment[];
  onRefresh: () => void;
}

interface SegmentFormData {
  placeName: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export default function SegmentsEditor({
  tripId,
  tripStartDate,
  tripEndDate,
  realSegments,
  onRefresh
}: SegmentsEditorProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingSegment, setEditingSegment] = useState<TripSegment | null>(null);
  const [formData, setFormData] = useState<SegmentFormData>({
    placeName: '',
    startDate: '',
    endDate: '',
    notes: '',
  });
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Compute display segments (real + TBD gaps)
  const displaySegments: DisplaySegment[] = buildDisplaySegments(
    new Date(tripStartDate),
    new Date(tripEndDate),
    realSegments.map(seg => ({
      ...seg,
      startDate: new Date(seg.startDate),
      endDate: new Date(seg.endDate),
    }))
  );

  const openAddModal = () => {
    setEditingSegment(null);
    setFormData({
      placeName: '',
      startDate: '',
      endDate: '',
      notes: '',
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (segment: TripSegment) => {
    setEditingSegment(segment);
    setFormData({
      placeName: segment.placeName,
      startDate: formatDateForInput(new Date(segment.startDate)),
      endDate: formatDateForInput(new Date(segment.endDate)),
      notes: segment.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const openFillGapModal = (gap: DisplaySegment) => {
    setEditingSegment(null);
    setFormData({
      placeName: '',
      startDate: formatDateForInput(gap.startDate),
      endDate: formatDateForInput(gap.endDate),
      notes: '',
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSegment(null);
    setFormData({
      placeName: '',
      startDate: '',
      endDate: '',
      notes: '',
    });
    setError('');
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      let result;
      if (editingSegment) {
        result = await updateSegment(
          editingSegment.id,
          formData.placeName,
          formData.startDate,
          formData.endDate,
          formData.notes
        );
      } else {
        result = await createSegment(
          tripId,
          formData.placeName,
          formData.startDate,
          formData.endDate,
          formData.notes
        );
      }

      if (result.success) {
        closeModal();
        onRefresh();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (segmentId: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) {
      return;
    }

    try {
      const result = await deleteSegment(segmentId);
      if (result.success) {
        onRefresh();
      } else {
        alert(`Failed to delete segment: ${result.error}`);
      }
    } catch (err) {
      alert('An unexpected error occurred while deleting');
    }
  };

  // Update endDate min when startDate changes
  const handleStartDateChange = (newStartDate: string) => {
    setFormData(prev => ({
      ...prev,
      startDate: newStartDate,
      // If endDate is before new startDate, update it
      endDate: prev.endDate && prev.endDate < newStartDate ? newStartDate : prev.endDate,
    }));
  };

  // Update startDate max when endDate changes
  const handleEndDateChange = (newEndDate: string) => {
    setFormData(prev => ({
      ...prev,
      endDate: newEndDate,
      // If startDate is after new endDate, update it
      startDate: prev.startDate && prev.startDate > newEndDate ? newEndDate : prev.startDate,
    }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Segments</h2>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
        >
          + Add Segment
        </button>
      </div>

      {realSegments.length === 0 && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
            Add your first segment to define where you'll be based during your trip.
          </p>
        </div>
      )}

      {displaySegments.length > 0 ? (
        <div className="space-y-3">
          {displaySegments.map((segment) => (
            <div
              key={segment.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                segment.kind === 'tbd'
                  ? 'bg-gray-100 dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-600'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex-1">
                <div className={`font-medium ${
                  segment.kind === 'tbd'
                    ? 'text-gray-500 dark:text-gray-400 italic'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {segment.placeName}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDateForDisplay(segment.startDate)} – {formatDateForDisplay(segment.endDate)}
                </div>
                {segment.notes && segment.kind === 'real' && (
                  <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    {segment.notes}
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                {segment.kind === 'real' ? (
                  <>
                    <button
                      onClick={() => openEditModal(realSegments.find(s => s.id === segment.id)!)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(segment.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => openFillGapModal(segment)}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Fill this gap
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Add a segment to show where you'll be based by date range.
        </p>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              {editingSegment ? 'Edit Segment' : 'Add Segment'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Place Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.placeName}
                    onChange={(e) => setFormData({ ...formData, placeName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Rome, Lake Como"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    min={formatDateForInput(new Date(tripStartDate))}
                    max={formData.endDate || formatDateForInput(new Date(tripEndDate))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    min={formData.startDate || formatDateForInput(new Date(tripStartDate))}
                    max={formatDateForInput(new Date(tripEndDate))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Notes (optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                    placeholder="Any additional details..."
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingSegment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
