"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import DeleteTripDialog from "./DeleteTripDialog"

type Trip = {
  id: string
  name: string
  destination: string | null
  clientName: string | null
  startDate: Date
  endDate: Date
  status: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: 'Draft',     className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
  REVIEW:    { label: 'In Review', className: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300' },
  PLANNING:  { label: 'Planning',  className: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' },
}

type TripsListProps = {
  initialTrips: Trip[]
}

export default function TripsList({ initialTrips }: TripsListProps) {
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>(initialTrips)
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete(tripId: string) {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Optimistically remove from UI
        setTrips(trips.filter(t => t.id !== tripId))
        setTripToDelete(null)
        // Refresh to ensure server state is in sync
        router.refresh()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete trip")
      }
    } catch (error) {
      console.error("Error deleting trip:", error)
      alert("Failed to delete trip")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {trips.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="mb-4">No trips yet. Create your first one!</p>
          <Link
            href="/trip/new"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Create Trip →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map(trip => (
            <div
              key={trip.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition relative group"
            >
              <Link
                href={`/trip/${trip.id}`}
                className="block"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{trip.name}</h2>
                  {(() => {
                    const cfg = statusConfig[trip.status] ?? statusConfig.DRAFT
                    return (
                      <span className={`flex-shrink-0 mt-0.5 inline-block px-2 py-0.5 text-xs font-medium rounded-full ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    )
                  })()}
                </div>
                {trip.clientName && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">for {trip.clientName}</p>
                )}
                {trip.destination && (
                  <p className="text-gray-600 dark:text-gray-300">{trip.destination}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(trip.startDate).toLocaleDateString()} – {new Date(trip.endDate).toLocaleDateString()}
                </p>
              </Link>

              {/* Delete button - positioned in top-right corner */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setTripToDelete(trip)
                }}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
                aria-label={`Delete ${trip.name}`}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {tripToDelete && (
        <DeleteTripDialog
          trip={tripToDelete}
          onConfirm={() => handleDelete(tripToDelete.id)}
          onCancel={() => setTripToDelete(null)}
          isDeleting={isDeleting}
        />
      )}
    </>
  )
}
