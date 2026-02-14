import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
  }

  try {
    // Use the new Places API (New) text search endpoint
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.types,places.location,places.rating,places.googleMapsUri',
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'en',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to search places', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform the response to match our expected format
    const places = (data.places || []).map((place: any) => ({
      placeId: place.id,
      displayName: place.displayName?.text || 'Unknown',
      formattedAddress: place.formattedAddress || '',
      types: place.types || [],
      location: place.location,
      rating: place.rating,
      googleMapsUri: place.googleMapsUri,
    }));

    return NextResponse.json({ places });
  } catch (error) {
    console.error('Error searching places:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
