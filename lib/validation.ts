import { z } from 'zod';
import { HappenCategory } from './types';

export const searchParamsSchema = z.object({
  city: z.string().min(1).max(100),
  start: z.string().datetime(),
  end: z.string().datetime(),
  categories: z.array(z.enum(['event', 'exhibition', 'attraction', 'seminar', 'tour'] as const)).optional(),
}).refine(data => {
  const start = new Date(data.start);
  const end = new Date(data.end);
  return end > start;
}, {
  message: 'End date must be after start date',
}).refine(data => {
  const start = new Date(data.start);
  const end = new Date(data.end);
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 60;
}, {
  message: 'Date range cannot exceed 60 days',
});

export const providerItemSchema = z.object({
  externalId: z.string(),
  source: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.array(z.enum(['event', 'exhibition', 'attraction', 'seminar', 'tour'] as const)),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().optional(),
  venueName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  url: z.string().url(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  isFamilyFriendly: z.boolean().optional(),
  isIndoor: z.boolean().optional(),
  language: z.string().optional(),
  lastUpdated: z.string().datetime().optional(),
  popularity: z.number().min(0).max(1).optional(),
  attendeeCount: z.number().min(0).optional(),
});

export const geocodingResultSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  timezone: z.string(),
  displayName: z.string(),
  city: z.string(),
  country: z.string(),
});

export type SearchParamsInput = z.infer<typeof searchParamsSchema>;
export type ProviderItemInput = z.infer<typeof providerItemSchema>;