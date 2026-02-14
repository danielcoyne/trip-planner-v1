import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/ideas/reorder - Move a single idea to a new day/position
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaId, newDay, newSortOrder } = body;

    if (!ideaId || newSortOrder === undefined) {
      return NextResponse.json({ error: 'ideaId and newSortOrder are required' }, { status: 400 });
    }

    // Fetch the idea to get its tripId
    const idea = await prisma.tripIdea.findUnique({
      where: { id: ideaId },
      select: { tripId: true },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    await prisma.$transaction([
      // Increment sortOrder for existing ideas on the target day that are >= newSortOrder
      prisma.tripIdea.updateMany({
        where: {
          tripId: idea.tripId,
          day: newDay,
          sortOrder: { gte: newSortOrder },
          id: { not: ideaId },
        },
        data: {
          sortOrder: { increment: 1 },
        },
      }),
      // Update the moved idea's day and sortOrder
      prisma.tripIdea.update({
        where: { id: ideaId },
        data: {
          day: newDay,
          sortOrder: newSortOrder,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering idea:', error);
    return NextResponse.json({ error: 'Failed to reorder idea' }, { status: 500 });
  }
}

// PUT /api/ideas/reorder - Batch update sortOrder for multiple ideas
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array is required' }, { status: 400 });
    }

    await prisma.$transaction(
      updates.map((update: { ideaId: string; sortOrder: number }) =>
        prisma.tripIdea.update({
          where: { id: update.ideaId },
          data: { sortOrder: update.sortOrder },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error batch reordering ideas:', error);
    return NextResponse.json({ error: 'Failed to batch reorder ideas' }, { status: 500 });
  }
}
