"use client"

import { useState, useEffect } from "react"

type Trip = {
  id: string
  name: string
  destination: string | null
  startDate: Date
  endDate: Date
}

type DeleteTripDialogProps = {
  trip: Trip
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}

export default function DeleteTripDialog({
  trip,
  onConfirm,
  onCancel,
  isDeleting
}: DeleteTripDialogProps) {
  const [inputValue, setInputValue] = useState("")
  const isValid = inputValue === trip.name

  // Prevent body scroll when dialog is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Delete Trip
        </h2>

        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
            ⚠️ This action cannot be undone.
          </p>
          <p className="text-sm text-red-700 dark:text-red-300">
            This will permanently delete:
          </p>
          <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside mt-1">
            <li>The trip and all its details</li>
            <li>All trip ideas and suggestions</li>
            <li>All trip segments</li>
            <li>All reactions and notes</li>
          </ul>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Trip to delete:
          </p>
          <p className="font-semibold text-lg text-gray-900 dark:text-white mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded">
            {trip.name}
          </p>

          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type the trip name exactly to confirm:
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder={trip.name}
            autoFocus
            disabled={isDeleting}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isValid || isDeleting}
            className="flex-1 bg-red-600 text-white rounded py-2 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isDeleting ? "Deleting..." : "Delete Trip"}
          </button>
        </div>
      </div>
    </div>
  )
}
