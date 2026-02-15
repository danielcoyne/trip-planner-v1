import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ tripId: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { tripId } = await context.params;

    if (!tripId || typeof tripId !== 'string') {
      return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 });
    }

    // Check if trip exists
    const existingTrip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!existingTrip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Delete the trip - cascading deletes will handle all related records
    // The schema has onDelete: Cascade for:
    // - TripIdea (and its IdeaReaction children)
    // - ClientSuggestion
    // - TripSegment
    await prisma.trip.delete({
      where: { id: tripId },
    });

    return NextResponse.json(
      { success: true, message: 'Trip deleted successfully' },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Error deleting trip:', error);
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 });
  }
}
