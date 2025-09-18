import { NextResponse } from 'next/server';
import { getEnabledProviders } from '@/lib/providers';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    providers: getEnabledProviders(),
    environment: process.env.NODE_ENV,
  });
}