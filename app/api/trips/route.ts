import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { fromYMD } from '@/lib/dateOnly';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, destination, startDate, endDate, requirements } = body;

    const trip = await prisma.trip.create({
      data: {
        name,
        destination: destination || null,
        startDate: fromYMD(startDate),
        endDate: fromYMD(endDate),
        requirements: requirements || null,
        currentRound: 1,
        status: 'DRAFT',
      },
    });

    return NextResponse.json({ trip });
  } catch (error) {
    console.error('Error creating trip:', error);
    return NextResponse.json(
      { error: 'Failed to create trip' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  try {
    // If ID provided, fetch single trip
    if (id) {
      const trip = await prisma.trip.findUnique({
        where: { id },
        include: {
          segments: {
            orderBy: { startDate: 'asc' },
          },
        },
      });

      if (!trip) {
        return NextResponse.json(
          { error: 'Trip not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ trip });
    }

    // Otherwise fetch all trips
    const trips = await prisma.trip.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ trips });
  } catch (error) {
    console.error('Error fetching trips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trips' },
      { status: 500 }
    );
  }
}