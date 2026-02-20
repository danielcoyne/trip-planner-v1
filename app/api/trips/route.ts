import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { fromYMD, toYMD } from '@/lib/dateOnly';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, destination, clientName, startDate, endDate, requirements } = body;

    const trip = await prisma.trip.create({
      data: {
        name,
        destination: destination || null,
        clientName: clientName || null,
        startDate: fromYMD(startDate),
        endDate: fromYMD(endDate),
        requirements: requirements || null,
        currentRound: 1,
        status: 'DRAFT',
      },
    });

    // Serialize dates as YYYY-MM-DD strings
    return NextResponse.json({
      trip: {
        ...trip,
        startDate: toYMD(trip.startDate),
        endDate: toYMD(trip.endDate),
      }
    }, {
      headers: {
        'Cache-Control': 'no-store',
      }
    });
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

      // Serialize all dates as YYYY-MM-DD strings
      return NextResponse.json({
        trip: {
          ...trip,
          startDate: toYMD(trip.startDate),
          endDate: toYMD(trip.endDate),
          segments: trip.segments?.map(seg => ({
            ...seg,
            startDate: toYMD(seg.startDate),
            endDate: toYMD(seg.endDate),
          })),
        }
      });
    }

    // Otherwise fetch all trips
    const trips = await prisma.trip.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Serialize all dates as YYYY-MM-DD strings
    return NextResponse.json({
      trips: trips.map(trip => ({
        ...trip,
        startDate: toYMD(trip.startDate),
        endDate: toYMD(trip.endDate),
      }))
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trips' },
      { status: 500 }
    );
  }
}