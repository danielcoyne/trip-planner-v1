import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tripId, suggestionText } = body;

    if (!tripId || !suggestionText) {
      return NextResponse.json(
        { error: 'Trip ID and suggestion text are required' },
        { status: 400 }
      );
    }

    // Get trip to determine current round
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Create suggestion
    const suggestion = await prisma.clientSuggestion.create({
      data: {
        tripId,
        suggestionText,
        round: trip.currentRound,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Error submitting suggestion:', error);
    return NextResponse.json({ error: 'Failed to submit suggestion' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tripId = searchParams.get('tripId');

  if (!tripId) {
    return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
  }

  try {
    const suggestions = await prisma.clientSuggestion.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
