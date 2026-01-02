import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tripId } = body;

    if (!tripId) {
      return NextResponse.json(
        { error: 'Trip ID is required' },
        { status: 400 }
      );
    }

    // Check if trip exists
    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    });

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Generate a secure random token if one doesn't exist
    let reviewToken = trip.reviewToken;
    
    if (!reviewToken) {
      reviewToken = randomBytes(32).toString('hex');
      
      // Update trip with review token
      await prisma.trip.update({
        where: { id: tripId },
        data: { reviewToken }
      });
    }

    return NextResponse.json({ 
      reviewToken,
      reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/review/${reviewToken}`
    });
  } catch (error) {
    console.error('Error generating review token:', error);
    return NextResponse.json(
      { error: 'Failed to generate review token' },
      { status: 500 }
    );
  }
}