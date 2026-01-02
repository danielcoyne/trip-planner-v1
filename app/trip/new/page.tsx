"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function NewTripPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    
    const response = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        destination: formData.get("destination"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        requirements: formData.get("requirements"),
      }),
    })

    if (response.ok) {
      const trip = await response.json()
      router.push(`/trip/${trip.id}`)
    } else {
      alert("Error creating trip")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Trip</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Client & Trip Name
          </label>
          <input
            name="name"
            required
            className="w-full border rounded px-3 py-2"
            placeholder="Sarah's Rome Adventure"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Destination
          </label>
          <input
            name="destination"
            required
            className="w-full border rounded px-3 py-2"
            placeholder="Rome, Italy"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Start Date
            </label>
            <input
              name="startDate"
              type="date"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              End Date
            </label>
            <input
              name="endDate"
              type="date"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Client Requirements
          </label>
          <textarea
            name="requirements"
            rows={8}
            className="w-full border rounded px-3 py-2"
            placeholder="What are they hoping to experience?&#10;Any must-dos?&#10;Dietary restrictions?&#10;Budget per day?&#10;Travel style?"
          />
          <p className="text-xs text-gray-500 mt-1">
            These notes will help you build relevant trip ideas
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white rounded py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Trip"}
          </button>
        </div>
      </form>
    </div>
  )
}