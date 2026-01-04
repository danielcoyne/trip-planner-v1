"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import DateRangePicker from "@/components/DateRangePicker"

export default function NewTripPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    if (!startDate || !endDate) {
      alert("Please select both start and end dates")
      setLoading(false)
      return
    }

    const formData = new FormData(e.currentTarget)

    // Convert dates to YYYY-MM-DD format
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const response = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        requirements: formData.get("requirements"),
      }),
    })

    if (response.ok) {
      const data = await response.json()
      router.push(`/trip/${data.trip.id}`)
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
            Trip Name
          </label>
          <input
            name="name"
            required
            className="w-full border rounded px-3 py-2"
            placeholder="Sarah's European Adventure"
          />
        </div>

        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />

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