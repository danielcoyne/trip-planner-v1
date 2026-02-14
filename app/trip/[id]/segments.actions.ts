'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { fromYMD, startOfLocalDay } from '@/lib/dateOnly';

export type SegmentValidationError = {
  success: false;
  error: string;
};

export type SegmentSuccess = {
  success: true;
};

export type SegmentResult = SegmentSuccess | SegmentValidationError;

async function validateSegment(
  tripId: string,
  startDate: Date,
  endDate: Date,
  excludeSegmentId?: string
): Promise<string | null> {
  // Fetch the trip to check date range
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      segments: {
        orderBy: { startDate: 'asc' },
      },
    },
  });

  if (!trip) {
    return 'Trip not found';
  }

  const tripStart = startOfLocalDay(trip.startDate);
  const tripEnd = startOfLocalDay(trip.endDate);
  const segStart = startOfLocalDay(startDate);
  const segEnd = startOfLocalDay(endDate);

  // Check: startDate <= endDate
  if (segStart > segEnd) {
    return 'Start date must be before or equal to end date';
  }

  // Check: segment must be within trip date range
  if (segStart < tripStart || segEnd > tripEnd) {
    return `Segment must be within trip dates (${trip.startDate.toLocaleDateString()} - ${trip.endDate.toLocaleDateString()})`;
  }

  // Check for overlaps with existing segments
  const otherSegments = trip.segments.filter((s) => s.id !== excludeSegmentId);

  for (const existing of otherSegments) {
    const existStart = startOfLocalDay(existing.startDate);
    const existEnd = startOfLocalDay(existing.endDate);

    // Check if segments overlap
    // Two segments overlap if: segStart <= existEnd AND segEnd >= existStart
    if (segStart <= existEnd && segEnd >= existStart) {
      return `Segment overlaps with existing segment: ${existing.placeName} (${existing.startDate.toLocaleDateString()} - ${existing.endDate.toLocaleDateString()})`;
    }
  }

  return null; // validation passed
}

export async function createSegment(
  tripId: string,
  placeName: string,
  startDate: string, // YYYY-MM-DD
  endDate: string, // YYYY-MM-DD
  notes?: string
): Promise<SegmentResult> {
  try {
    // Convert date strings to Date objects
    const startDateObj = fromYMD(startDate);
    const endDateObj = fromYMD(endDate);

    // Validate
    const validationError = await validateSegment(tripId, startDateObj, endDateObj);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Create segment
    await prisma.tripSegment.create({
      data: {
        tripId,
        placeName,
        startDate: startDateObj,
        endDate: endDateObj,
        notes: notes || null,
      },
    });

    // Revalidate paths
    revalidatePath(`/trip/${tripId}`);
    revalidatePath(`/trip/${tripId}/itinerary`);

    return { success: true };
  } catch (error) {
    console.error('Error creating segment:', error);
    return { success: false, error: 'Failed to create segment' };
  }
}

export async function updateSegment(
  segmentId: string,
  placeName: string,
  startDate: string, // YYYY-MM-DD
  endDate: string, // YYYY-MM-DD
  notes?: string
): Promise<SegmentResult> {
  try {
    // Fetch existing segment to get tripId
    const existingSegment = await prisma.tripSegment.findUnique({
      where: { id: segmentId },
    });

    if (!existingSegment) {
      return { success: false, error: 'Segment not found' };
    }

    // Convert date strings to Date objects
    const startDateObj = fromYMD(startDate);
    const endDateObj = fromYMD(endDate);

    // Validate (exclude current segment from overlap check)
    const validationError = await validateSegment(
      existingSegment.tripId,
      startDateObj,
      endDateObj,
      segmentId
    );
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Update segment
    await prisma.tripSegment.update({
      where: { id: segmentId },
      data: {
        placeName,
        startDate: startDateObj,
        endDate: endDateObj,
        notes: notes || null,
      },
    });

    // Revalidate paths
    revalidatePath(`/trip/${existingSegment.tripId}`);
    revalidatePath(`/trip/${existingSegment.tripId}/itinerary`);

    return { success: true };
  } catch (error) {
    console.error('Error updating segment:', error);
    return { success: false, error: 'Failed to update segment' };
  }
}

export async function deleteSegment(segmentId: string): Promise<SegmentResult> {
  try {
    // Fetch segment to get tripId before deletion
    const segment = await prisma.tripSegment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      return { success: false, error: 'Segment not found' };
    }

    const tripId = segment.tripId;

    // Delete segment
    await prisma.tripSegment.delete({
      where: { id: segmentId },
    });

    // Revalidate paths
    revalidatePath(`/trip/${tripId}`);
    revalidatePath(`/trip/${tripId}/itinerary`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting segment:', error);
    return { success: false, error: 'Failed to delete segment' };
  }
}
