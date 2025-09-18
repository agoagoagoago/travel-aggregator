import { NextRequest, NextResponse } from 'next/server';
import { providers } from '@/lib/providers';
import { normalize, dedupe, rank, filterByDateRange } from '@/lib/aggregate';
import { geocodeCity } from '@/lib/geocoding';
import { searchParamsSchema } from '@/lib/validation';
import { HappenCategory } from '@/lib/types';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Parse and validate parameters
    const params = {
      city: searchParams.get('city') || '',
      start: searchParams.get('start') || '',
      end: searchParams.get('end') || '',
      categories: searchParams.get('cats')?.split(',').filter(Boolean),
    };

    // Validate input
    const validated = searchParamsSchema.parse(params);

    // Resolve city to bbox + timezone
    const geo = await geocodeCity(validated.city);

    // Fetch from all enabled providers in parallel
    console.log(`Searching for events in ${geo.city}, ${geo.country}`);
    console.log(`Date range: ${validated.start} to ${validated.end}`);
    console.log(`Timezone: ${geo.timezone}`);

    const settled = await Promise.allSettled(
      providers.map(p =>
        p.fetchItems({
          city: validated.city,
          bbox: geo.bbox,
          startISO: validated.start,
          endISO: validated.end,
        })
      )
    );

    // Collect all items from successful providers
    const allItems = settled.flatMap((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Provider ${providers[index].name}: ${result.value.length} items`);
        return result.value;
      } else {
        console.error(`Provider ${providers[index].name} failed:`, result.reason);
        return [];
      }
    });

    // If no providers are enabled or all failed, return mock data
    if (allItems.length === 0) {
      console.log('No items from providers, using mock data');
      allItems.push(...getMockItems(validated.city, validated.start, validated.end));
    }

    // Process items through aggregation pipeline
    const normalized = normalize(allItems, geo.timezone, validated.categories);
    const filtered = filterByDateRange(normalized, validated.start, validated.end);
    const unique = dedupe(filtered);
    const ranked = rank(unique, { center: [geo.lat, geo.lng] });

    console.log(`Final results: ${ranked.length} unique items`);

    return NextResponse.json({
      city: geo.city,
      country: geo.country,
      displayName: geo.displayName,
      timezone: geo.timezone,
      center: [geo.lat, geo.lng],
      bbox: geo.bbox,
      startISO: validated.start,
      endISO: validated.end,
      count: ranked.length,
      providers: providers.map(p => p.name),
      items: ranked.slice(0, 200), // Limit to 200 items for performance
    });
  } catch (error) {
    console.error('Search API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('City not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mock data for demonstration when no providers are configured
function getMockItems(city: string, startISO: string, _endISO: string) {
  return [
    {
      externalId: 'mock-1',
      source: 'mock',
      title: `${city} City Museum`,
      description: 'Explore the rich history and culture of the city through interactive exhibitions.',
      category: ['attraction', 'exhibition'] as HappenCategory[],
      venueName: 'City Museum',
      city,
      priceMin: 15,
      priceMax: 25,
      currency: 'USD',
      url: 'https://example.com/museum',
      tags: ['museum', 'history', 'culture'],
      isFamilyFriendly: true,
      isIndoor: true,
      popularity: 0.8,
    },
    {
      externalId: 'mock-2',
      source: 'mock',
      title: `${city} Food Festival`,
      description: 'Annual food festival featuring local cuisine and international dishes.',
      category: ['event'] as HappenCategory[],
      startTime: startISO,
      endTime: new Date(new Date(startISO).getTime() + 8 * 60 * 60 * 1000).toISOString(),
      venueName: 'City Park',
      city,
      priceMin: 0,
      priceMax: 0,
      currency: 'USD',
      url: 'https://example.com/food-festival',
      tags: ['food', 'festival', 'outdoor'],
      isFamilyFriendly: true,
      isIndoor: false,
      popularity: 0.9,
    },
    {
      externalId: 'mock-3',
      source: 'mock',
      title: `${city} Walking Tour`,
      description: 'Guided walking tour through historic downtown.',
      category: ['tour'] as HappenCategory[],
      startTime: new Date(new Date(startISO).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(new Date(startISO).getTime() + 26 * 60 * 60 * 1000).toISOString(),
      venueName: 'Tourist Information Center',
      city,
      priceMin: 20,
      priceMax: 20,
      currency: 'USD',
      url: 'https://example.com/walking-tour',
      tags: ['tour', 'walking', 'history'],
      isFamilyFriendly: true,
      isIndoor: false,
      popularity: 0.7,
    },
    {
      externalId: 'mock-4',
      source: 'mock',
      title: 'Tech Conference 2025',
      description: 'Annual technology conference with keynote speakers and workshops.',
      category: ['seminar', 'event'] as HappenCategory[],
      startTime: new Date(new Date(startISO).getTime() + 48 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(new Date(startISO).getTime() + 56 * 60 * 60 * 1000).toISOString(),
      venueName: 'Convention Center',
      city,
      priceMin: 150,
      priceMax: 300,
      currency: 'USD',
      url: 'https://example.com/tech-conf',
      tags: ['technology', 'conference', 'networking'],
      isFamilyFriendly: false,
      isIndoor: true,
      popularity: 0.85,
    },
    {
      externalId: 'mock-5',
      source: 'mock',
      title: 'Modern Art Exhibition',
      description: 'Contemporary art exhibition featuring local and international artists.',
      category: ['exhibition'] as HappenCategory[],
      venueName: 'Art Gallery',
      city,
      priceMin: 12,
      priceMax: 12,
      currency: 'USD',
      url: 'https://example.com/art-exhibition',
      tags: ['art', 'exhibition', 'gallery'],
      isFamilyFriendly: true,
      isIndoor: true,
      popularity: 0.6,
    },
  ];
}