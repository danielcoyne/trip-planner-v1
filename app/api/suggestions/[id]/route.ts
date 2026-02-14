import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, agentNotes, resolvedPlaceId } = body;

    const suggestion = await prisma.clientSuggestion.update({
      where: { id },
      data: {
        status: status || undefined,
        agentNotes: agentNotes !== undefined ? agentNotes : undefined,
        resolvedPlaceId: resolvedPlaceId !== undefined ? resolvedPlaceId : undefined,
      },
    });

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Error updating suggestion:', error);
    return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 });
  }
}
