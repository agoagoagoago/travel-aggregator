export type HappenCategory = "event" | "exhibition" | "attraction" | "seminar" | "tour";

export interface ProviderItem {
  externalId: string;
  source: string;                 // "eventbrite", "meetup", etc.
  title: string;
  description?: string;
  category: HappenCategory[];
  startTime?: string;             // ISO
  endTime?: string;               // ISO
  timezone?: string;
  venueName?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  url: string;                    // official page
  imageUrl?: string;
  tags?: string[];
  isFamilyFriendly?: boolean;
  isIndoor?: boolean;
  language?: string;
  lastUpdated?: string;           // ISO
  popularity?: number;            // For ranking
  attendeeCount?: number;
}

export interface Provider {
  name: string;
  isEnabled: boolean;
  fetchItems(params: {
    city: string;
    bbox?: [number, number, number, number]; // west,south,east,north for geo filter
    startISO: string;
    endISO: string;
  }): Promise<ProviderItem[]>;
}

export interface NormalizedItem extends ProviderItem {
  id: string;                     // Unique ID after normalization
  normalizedTitle: string;        // Lowercased, trimmed for deduping
  score?: number;                 // Ranking score
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  bbox: [number, number, number, number];
  timezone: string;
  displayName: string;
  city: string;
  country: string;
}

export interface SearchParams {
  city: string;
  start: string;
  end: string;
  categories?: HappenCategory[];
}

export interface SearchFilters {
  categories?: HappenCategory[];
  priceRange?: { min?: number; max?: number };
  isIndoor?: boolean;
  isFamilyFriendly?: boolean;
  maxDistance?: number;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  sortBy?: 'recommended' | 'soonest' | 'closest' | 'price';
}

export interface ShortlistItem {
  id: string;
  item: NormalizedItem;
  addedAt: string;
  notes?: string;
}