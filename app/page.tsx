import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function HomePage() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audrey's Trips</h1>
        <Link
          href="/trip/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Trip
        </Link>
      </div>

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
            <Link
              key={trip.id}
              href={`/trip/${trip.id}`}
              className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition"
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
          ))}
        </div>
      )}
    </div>
  )
}