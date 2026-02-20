import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Review token is required' },
        { status: 400 }
      );
    }

    // Fetch trip with proposals, ideas, and comments
    const trip = await prisma.trip.findUnique({
      where: { reviewToken: token },
      include: {
        proposals: {
          orderBy: { sortOrder: 'asc' },
          include: {
            stops: { orderBy: { sortOrder: 'asc' } },
            ideas: {
              include: { photos: { orderBy: { sortOrder: 'asc' } } },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        ideas: {
          orderBy: [{ destinationLabel: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            photos: { orderBy: { sortOrder: 'asc' } },
            comments: { orderBy: { createdAt: 'asc' } },
          },
        },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found or link expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({ trip });
  } catch (error) {
    console.error('Error fetching trip by token:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trip' },
      { status: 500 }
    );
  }
}