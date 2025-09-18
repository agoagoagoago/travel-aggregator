import { GeocodingResult } from './types';

// Simple in-memory cache for geocoding results
const geocodeCache = new Map<string, { result: GeocodingResult; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Timezone approximation based on longitude (simplified)
function estimateTimezone(lng: number): string {
  const offset = Math.round(lng / 15);
  if (offset === 0) return 'UTC';
  const sign = offset > 0 ? '+' : '';
  return `UTC${sign}${offset}`;
}

export async function geocodeCity(city: string): Promise<GeocodingResult> {
  const cacheKey = city.toLowerCase();

  // Check cache
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  try {
    // Try Nominatim first (free, no API key required)
    const result = await geocodeWithNominatim(city);

    // Cache the result
    geocodeCache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  } catch {
    // If Google Places API key is available, try that as fallback
    if (process.env.GOOGLE_PLACES_API_KEY) {
      return geocodeWithGooglePlaces(city);
    }

    throw new Error(`Failed to geocode city: ${city}`);
  }
}

async function geocodeWithNominatim(city: string): Promise<GeocodingResult> {
  const params = new URLSearchParams({
    q: city,
    format: 'json',
    limit: '1',
    'accept-language': 'en',
    addressdetails: '1',
    extratags: '1',
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        'User-Agent': 'TravelAggregator/1.0',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error(`City not found: ${city}`);
  }

  const place = data[0];
  const lat = parseFloat(place.lat);
  const lng = parseFloat(place.lon);

  // Get bounding box
  let bbox: [number, number, number, number];
  if (place.boundingbox && place.boundingbox.length === 4) {
    bbox = [
      parseFloat(place.boundingbox[2]), // west
      parseFloat(place.boundingbox[0]), // south
      parseFloat(place.boundingbox[3]), // east
      parseFloat(place.boundingbox[1]), // north
    ];
  } else {
    // Create a default bounding box (~20km radius)
    const delta = 0.18; // roughly 20km at equator
    bbox = [
      lng - delta,
      lat - delta,
      lng + delta,
      lat + delta,
    ];
  }

  // Try to get timezone from extratags or estimate it
  const timezone = place.extratags?.timezone || estimateTimezone(lng);

  // Extract city name from address details
  const cityName = place.address?.city ||
                   place.address?.town ||
                   place.address?.municipality ||
                   place.display_name.split(',')[0];

  return {
    lat,
    lng,
    bbox,
    timezone,
    displayName: place.display_name,
    city: cityName,
    country: place.address?.country || '',
  };
}

async function geocodeWithGooglePlaces(city: string): Promise<GeocodingResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  const params = new URLSearchParams({
    address: city,
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Google Geocoding API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`City not found: ${city}`);
  }

  const place = data.results[0];
  const location = place.geometry.location;
  const viewport = place.geometry.viewport;

  // Convert viewport to bounding box
  const bbox: [number, number, number, number] = [
    viewport.southwest.lng,
    viewport.southwest.lat,
    viewport.northeast.lng,
    viewport.northeast.lat,
  ];

  // Extract city name from address components
  const cityComponent = place.address_components.find((c: { types: string[], long_name: string }) =>
    c.types.includes('locality') || c.types.includes('administrative_area_level_1')
  );

  const countryComponent = place.address_components.find((c: { types: string[], long_name: string }) =>
    c.types.includes('country')
  );

  // Need another API call for timezone
  const timezone = await getTimezoneFromGoogle(location.lat, location.lng, apiKey);

  return {
    lat: location.lat,
    lng: location.lng,
    bbox,
    timezone,
    displayName: place.formatted_address,
    city: cityComponent?.long_name || city,
    country: countryComponent?.long_name || '',
  };
}

async function getTimezoneFromGoogle(lat: number, lng: number, apiKey: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    timestamp: timestamp.toString(),
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/timezone/json?${params}`
  );

  if (!response.ok) {
    return estimateTimezone(lng); // Fallback to estimation
  }

  const data = await response.json();
  return data.timeZoneId || estimateTimezone(lng);
}

// Get current time in city's timezone
export function getCurrentTimeInCity(timezone: string): Date {
  try {
    return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
  } catch {
    return new Date();
  }
}