import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE /api/ideas/[id] - Delete an idea
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete the idea (reactions will cascade delete if set up in schema)
    await prisma.tripIdea.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting idea:', error);
    return NextResponse.json(
      { error: 'Failed to delete idea' },
      { status: 500 }
    );
  }
}

// PATCH /api/ideas/[id] - Update an idea
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { category, state, day, mealSlot, agentNotes } = body;

    const updatedIdea = await prisma.tripIdea.update({
      where: { id },
      data: {
        category: category || undefined,
        state: state || undefined,
        day: day !== undefined ? day : undefined,
        mealSlot: mealSlot !== undefined ? mealSlot : undefined,
        agentNotes: agentNotes !== undefined ? agentNotes : undefined,
      },
    });

    return NextResponse.json(updatedIdea);
  } catch (error) {
    console.error('Error updating idea:', error);
    return NextResponse.json(
      { error: 'Failed to update idea' },
      { status: 500 }
    );
  }
}