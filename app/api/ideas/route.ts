import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tripId, placeId, category, state, day, endDay, mealSlot, agentNotes, time, externalUrl, proposalId, price, destinationLabel } = body;

    if (!tripId || !placeId) {
      return NextResponse.json(
        { error: 'Trip ID and Place ID are required' },
        { status: 400 }
      );
    }

    // Get the trip to determine current round
    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    });

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Create the trip idea
    const idea = await prisma.tripIdea.create({
      data: {
        tripId,
        placeId,
        category: category || 'GENERAL',
        state: state || 'FLEXIBLE',
        day: day || null,
        endDay: endDay || null,
        mealSlot: mealSlot || null,
        agentNotes: agentNotes || null,
        time: time || null,
        externalUrl: externalUrl || null,
        proposalId: proposalId || null,
        price: price || null,
        destinationLabel: destinationLabel || null,
        status: 'SUGGESTED',
        roundCreated: trip.currentRound,
        suggestedBy: 'AGENT'
      }
    });

    return NextResponse.json({ idea });
  } catch (error) {
    console.error('Error creating trip idea:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tripId = searchParams.get('tripId');

  if (!tripId) {
    return NextResponse.json(
      { error: 'Trip ID is required' },
      { status: 400 }
    );
  }

  try {
    const ideas = await prisma.tripIdea.findMany({
      where: { tripId },
      include: {
        reactions: true,
        comments: { orderBy: { createdAt: 'desc' } },
        photos: { orderBy: { sortOrder: 'asc' } }
      },
      orderBy: [
        { day: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error('Error fetching trip ideas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}