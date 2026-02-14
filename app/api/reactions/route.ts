import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ideaId = searchParams.get('ideaId');

  if (!ideaId) {
    return NextResponse.json({ error: 'Idea ID is required' }, { status: 400 });
  }

  try {
    const reactions = await prisma.ideaReaction.findMany({
      where: { ideaId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reactions });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaId, reaction, clientNotes } = body;

    if (!ideaId || !reaction) {
      return NextResponse.json({ error: 'Idea ID and reaction are required' }, { status: 400 });
    }

    // Validate reaction type
    const validReactions = ['LOVE', 'MAYBE', 'PASS'];
    if (!validReactions.includes(reaction)) {
      return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
    }

    // Check if idea exists
    const idea = await prisma.tripIdea.findUnique({
      where: { id: ideaId },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Create or update reaction (only one reaction per idea)
    // First, delete any existing reactions for this idea
    await prisma.ideaReaction.deleteMany({
      where: { ideaId },
    });

    // Then create new reaction
    const newReaction = await prisma.ideaReaction.create({
      data: {
        ideaId,
        reaction,
        clientNotes: clientNotes || null,
      },
    });

    return NextResponse.json({ reaction: newReaction });
  } catch (error) {
    console.error('Error submitting reaction:', error);
    return NextResponse.json({ error: 'Failed to submit reaction' }, { status: 500 });
  }
}
