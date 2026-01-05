"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import DeleteTripDialog from "./DeleteTripDialog"

type Trip = {
  id: string
  name: string
  destination: string | null
  startDate: Date
  endDate: Date
  currentRound: number
  status: string
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
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{trip.name}</h2>
                <p className="text-gray-600 dark:text-gray-300">{trip.destination}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                </p>
                <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                  Round {trip.currentRound} • {trip.status}
                </span>
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
