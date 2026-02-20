import { prisma } from "@/lib/prisma"
import Link from "next/link"
import TripsList from "@/components/TripsList"

// Force dynamic rendering to ensure trips list is always fresh
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trips</h1>
        <Link
          href="/trip/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Trip
        </Link>
      </div>

      <TripsList initialTrips={trips} />
    </div>
  )
}