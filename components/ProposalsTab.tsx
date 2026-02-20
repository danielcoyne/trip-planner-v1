'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

interface ProposalsTabProps {
  tripId: string;
  proposals: TripProposal[];
  reviewUrl: string | null;
  onGenerateReviewLink: () => void;
  onProposalsChanged: () => void;
}

export default function ProposalsTab({
  tripId,
  proposals,
  reviewUrl,
  onGenerateReviewLink,
  onProposalsChanged,
}: ProposalsTabProps) {
  const router = useRouter();
  const [addingProposal, setAddingProposal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreateProposal = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, title: newTitle.trim(), description: newDescription.trim() || null }),
      });
      if (res.ok) {
        setNewTitle('');
        setNewDescription('');
        setAddingProposal(false);
        onProposalsChanged();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProposal = async (proposalId: string, title: string) => {
    if (!confirm(`Delete proposal "${title}"? This cannot be undone.`)) return;
    await fetch(`/api/proposals/${proposalId}`, { method: 'DELETE' });
    onProposalsChanged();
  };

  const selectedProposal = proposals.find(p => p.selected);

  return (
    <div className="space-y-6">
      {/* Status callout if a proposal is already selected */}
      {selectedProposal && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 flex items-center gap-3">
          <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
          <div>
            <p className="font-semibold text-green-900 dark:text-green-100">
              "{selectedProposal.title}" has been selected
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              The trip is now in the planning phase. Head to the Itinerary tab to build out the details.
            </p>
          </div>
        </div>
      )}

      {/* Proposals list */}
      {proposals.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-4xl mb-4">🗺️</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No proposals yet</p>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            Create 2–3 route options for your client to choose from — e.g., "Rome & The Amalfi Coast" vs "Rome & Lake Como".
          </p>
          <button
            onClick={() => setAddingProposal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Create First Proposal
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {proposals.map((proposal, index) => (
            <div
              key={proposal.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border-2 shadow-sm ${
                proposal.selected
                  ? 'border-green-400 dark:border-green-600'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{proposal.title}</h3>
                    {proposal.selected && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/trip/${tripId}/proposal/${proposal.id}`)}
                      className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Edit Proposal
                    </button>
                    <button
                      onClick={() => handleDeleteProposal(proposal.id, proposal.title)}
                      className="px-3 py-1.5 text-red-600 dark:text-red-400 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Description */}
                {proposal.description && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">
                    {proposal.description}
                  </p>
                )}

                {/* Stops */}
                {proposal.stops.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {proposal.stops.map((stop, i) => (
                      <span key={stop.id} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-gray-400">→</span>}
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200">
                          📍 {stop.placeName}
                          {stop.nightsCount && (
                            <span className="text-gray-500 dark:text-gray-400 font-normal">
                              · {stop.nightsCount}n
                            </span>
                          )}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Ideas count */}
                {proposal.ideas.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {proposal.ideas.length} idea{proposal.ideas.length !== 1 ? 's' : ''} attached ·{' '}
                    {proposal.ideas.filter(i => i.state === 'ANCHOR').length} must-do ·{' '}
                    {proposal.ideas.filter(i => i.state === 'FLEXIBLE').length} may-do
                  </p>
                )}

                {proposal.stops.length === 0 && proposal.ideas.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                    No stops or ideas added yet — click "Edit Proposal" to build this out.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add proposal button */}
      {proposals.length > 0 && !addingProposal && (
        <button
          onClick={() => setAddingProposal(true)}
          className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-xl hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
        >
          + Add Another Proposal
        </button>
      )}

      {/* New proposal form */}
      {addingProposal && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-300 dark:border-blue-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Proposal</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g., Rome & The Amalfi Coast"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description <span className="text-gray-400 font-normal">(optional — your narrative for why this route works)</span>
              </label>
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="e.g., This option gives you the best of ancient Rome with the drama of the Amalfi Coast. Driving the route lets you stop at incredible viewpoints along the way..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateProposal}
                disabled={!newTitle.trim() || saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
              >
                {saving ? 'Creating...' : 'Create Proposal'}
              </button>
              <button
                onClick={() => { setAddingProposal(false); setNewTitle(''); setNewDescription(''); }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share with Client */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Share with Client</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Send this link to your client so they can review the proposals and pick their favorite.
        </p>
        {reviewUrl ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={reviewUrl}
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
            <button
              onClick={() => { navigator.clipboard.writeText(reviewUrl); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Copy
            </button>
          </div>
        ) : (
          <button
            onClick={onGenerateReviewLink}
            disabled={proposals.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            Generate Review Link
          </button>
        )}
        {proposals.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Add at least one proposal before sharing.</p>
        )}
      </div>
    </div>
  );
}
