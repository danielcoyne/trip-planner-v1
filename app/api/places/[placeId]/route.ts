import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await params;

  if (!placeId) {
    return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
  }

  try {
    // Check cache first (placeId might be with or without "places/" prefix)
    const cleanPlaceId = placeId.replace('places/', '');
    const cached = await prisma.googlePlaceCache.findUnique({
      where: { placeId: cleanPlaceId },
    });

    if (cached && cached.expiresAt > new Date()) {
      return NextResponse.json({ place: cached });
    }

    // Fetch from Google Places API
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
    }

    // The new API expects the full place ID without "places/" prefix in the URL path
    const fullPlaceId = placeId.startsWith('places/') ? placeId : `places/${placeId}`;

    const response = await fetch(`https://places.googleapis.com/v1/${fullPlaceId}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,types,location,rating,googleMapsUri',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch place details', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Cache the result for 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const place = await prisma.googlePlaceCache.upsert({
      where: { placeId: cleanPlaceId },
      update: {
        displayName: data.displayName?.text || 'Unknown',
        formattedAddress: data.formattedAddress || '',
        lat: data.location?.latitude || 0,
        lng: data.location?.longitude || 0,
        googleMapsUri: data.googleMapsUri || '',
        types: data.types || [],
        rating: data.rating,
        expiresAt,
      },
      create: {
        placeId: cleanPlaceId,
        displayName: data.displayName?.text || 'Unknown',
        formattedAddress: data.formattedAddress || '',
        lat: data.location?.latitude || 0,
        lng: data.location?.longitude || 0,
        googleMapsUri: data.googleMapsUri || '',
        types: data.types || [],
        rating: data.rating,
        expiresAt,
      },
    });

    return NextResponse.json({ place });
  } catch (error) {
    console.error('Error fetching place details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
