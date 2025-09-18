import { NextRequest, NextResponse } from 'next/server';
import { geocodeCity } from '@/lib/geocoding';
import { z } from 'zod';

const geocodeParamsSchema = z.object({
  city: z.string().min(1).max(100),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city') || '';

    // Validate input
    const validated = geocodeParamsSchema.parse({ city });

    // Geocode the city
    const result = await geocodeCity(validated.city);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Geocode API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid city parameter', details: error.issues },
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
      { error: 'Failed to geocode city' },
      { status: 500 }
    );
  }
}