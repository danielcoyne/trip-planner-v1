'use client';

import { useEffect, useRef, useState } from 'react';

interface PlaceCache {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  rating: number | null;
  googleMapsUri: string;
}

interface TripIdea {
  id: string;
  placeId: string;
  category: string;
  state: string;
  day: number | null;
  mealSlot: string | null;
  agentNotes: string | null;
  status: string;
}

interface TripMapProps {
  ideas: TripIdea[];
  placesCache: Record<string, PlaceCache>;
}

export default function TripMap({ ideas, placesCache }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsLoaded(true);
      document.head.appendChild(script);
    } else if (window.google) {
      setIsLoaded(true);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    const newMap = new google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: 41.9028, lng: 12.4964 }, // Default to Rome
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });

    setMap(newMap);
  }, [isLoaded, map]);

  // Add markers when map is ready
  useEffect(() => {
    if (!map || ideas.length === 0) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    const newMarkers: google.maps.Marker[] = [];
    const bounds = new google.maps.LatLngBounds();

    ideas.forEach((idea) => {
      const place = placesCache[idea.placeId];
      if (!place) return;

      const position = { lat: place.lat, lng: place.lng };
      
      // Get marker color based on state
      const markerColor = getMarkerColor(idea.state);
      
      const marker = new google.maps.Marker({
        position,
        map,
        title: place.displayName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: markerColor,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        label: idea.day ? {
          text: idea.day.toString(),
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 'bold',
        } : undefined,
      });

      // Create info window
      const infoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(idea, place),
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
      bounds.extend(position);
    });

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      map.fitBounds(bounds);
    }

    setMarkers(newMarkers);
  }, [map, ideas, placesCache]);

  const getMarkerColor = (state: string): string => {
    switch (state) {
      case 'ANCHOR': return '#ef4444'; // red
      case 'FLEXIBLE': return '#3b82f6'; // blue
      case 'SPONTANEOUS': return '#10b981'; // green
      default: return '#6b7280'; // gray
    }
  };

  const createInfoWindowContent = (idea: TripIdea, place: PlaceCache): string => {
    const stateEmoji = idea.state === 'ANCHOR' ? '⚓' : idea.state === 'FLEXIBLE' ? '↕️' : '⏱️';
    const dayText = idea.day ? `Day ${idea.day}` : '';
    const ratingText = place.rating ? `⭐ ${place.rating.toFixed(1)}` : '';
    
    return `
      <div style="padding: 8px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
          ${place.displayName}
        </h3>
        <p style="margin: 4px 0; font-size: 13px; color: #666;">
          ${place.formattedAddress}
        </p>
        <div style="margin: 8px 0; display: flex; gap: 6px; flex-wrap: wrap;">
          <span style="background: ${getMarkerColor(idea.state)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
            ${stateEmoji} ${idea.state}
          </span>
          <span style="background: #e5e7eb; color: #374151; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
            ${idea.category}
          </span>
          ${dayText ? `<span style="background: #ddd6fe; color: #5b21b6; padding: 2px 8px; border-radius: 12px; font-size: 11px;">${dayText}</span>` : ''}
          ${ratingText ? `<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 11px;">${ratingText}</span>` : ''}
        </div>
        ${idea.agentNotes ? `
          <div style="margin: 8px 0; padding: 8px; background: #eff6ff; border-left: 3px solid #3b82f6; font-size: 12px; color: #1e3a8a;">
            <strong>Notes:</strong> ${idea.agentNotes}
          </div>
        ` : ''}
        <a href="${place.googleMapsUri}" target="_blank" rel="noopener noreferrer" 
           style="display: inline-block; margin-top: 8px; color: #2563eb; text-decoration: none; font-size: 13px;">
          View on Google Maps →
        </a>
      </div>
    `;
  };

  if (!isLoaded) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500">Add some ideas to see them on the map!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Anchor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Flexible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Spontaneous</span>
          </div>
        </div>
      </div>
      <div ref={mapRef} style={{ width: '100%', height: '600px' }} />
    </div>
  );
}