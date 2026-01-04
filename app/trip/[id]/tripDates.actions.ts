'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { startOfDay } from 'date-fns';

export type UpdateDatesResult =
  | { success: true }
  | { success: false; error: string };

function normalizeDay(d: Date) {
  return startOfDay(d);
}

export async function updateTripDates(
  tripId: string,
  startDateStr: string, // YYYY-MM-DD
  endDateStr: string    // YYYY-MM-DD
): Promise<UpdateDatesResult> {
  try {
    const newStart = normalizeDay(new Date(startDateStr + 'T00:00:00'));
    const newEnd = normalizeDay(new Date(endDateStr + 'T00:00:00'));

    // Validate: newStart <= newEnd
    if (newStart > newEnd) {
      return { success: false, error: 'Start date must be before or equal to end date' };
    }

    // Load trip with segments
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        segments: {
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!trip) {
      return { success: false, error: 'Trip not found' };
    }

    // Process segments: clamp and detect deletions
    const segmentUpdates: Array<{ id: string; startDate: Date; endDate: Date }> = [];
    const segmentDeletions: string[] = [];

    for (const segment of trip.segments) {
      const segStart = normalizeDay(segment.startDate);
      const segEnd = normalizeDay(segment.endDate);

      // Clamp to new trip range
      const clampedStart = segStart < newStart ? newStart : segStart > newEnd ? newEnd : segStart;
      const clampedEnd = segEnd > newEnd ? newEnd : segEnd < newStart ? newStart : segEnd;

      // If clamped range is invalid (start > end), mark for deletion
      if (clampedStart > clampedEnd) {
        segmentDeletions.push(segment.id);
      } else {
        segmentUpdates.push({
          id: segment.id,
          startDate: clampedStart,
          endDate: clampedEnd,
        });
      }
    }

    // Check for overlaps after clamping
    if (segmentUpdates.length > 1) {
      const sorted = segmentUpdates
        .slice()
        .sort((a, b) => +a.startDate - +b.startDate);

      for (let i = 0; i < sorted.length - 1; i++) {
        const currEnd = sorted[i].endDate;
        const nextStart = sorted[i + 1].startDate;

        // Overlap if nextStart <= currEnd (inclusive end)
        if (nextStart <= currEnd) {
          return {
            success: false,
            error: 'Clamping would cause segment overlaps. Please manually adjust segments before changing trip dates.',
          };
        }
      }
    }

    // Apply updates in a transaction
    await prisma.$transaction(async (tx) => {
      // Update trip dates
      await tx.trip.update({
        where: { id: tripId },
        data: {
          startDate: newStart,
          endDate: newEnd,
        },
      });

      // Delete invalidated segments
      if (segmentDeletions.length > 0) {
        await tx.tripSegment.deleteMany({
          where: {
            id: { in: segmentDeletions },
          },
        });
      }

      // Update clamped segments
      for (const update of segmentUpdates) {
        await tx.tripSegment.update({
          where: { id: update.id },
          data: {
            startDate: update.startDate,
            endDate: update.endDate,
          },
        });
      }
    });

    // Revalidate paths
    revalidatePath(`/trip/${tripId}`);
    revalidatePath(`/trip/${tripId}/itinerary`);

    return { success: true };
  } catch (error) {
    console.error('Error updating trip dates:', error);
    return { success: false, error: 'Failed to update trip dates' };
  }
}
