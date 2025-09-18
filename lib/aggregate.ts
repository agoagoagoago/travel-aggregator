import { ProviderItem, NormalizedItem, HappenCategory } from './types';
import { DateTime } from 'luxon';
import crypto from 'crypto';

// Simple string similarity calculation (Levenshtein distance)
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const maxLen = Math.max(s1.length, s2.length);
  const editDistance = levenshteinDistance(s1, s2);
  return 1 - editDistance / maxLen;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Calculate distance between two coordinates in meters
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Normalize provider items to consistent format
export function normalize(
  items: ProviderItem[],
  timezone: string,
  filterCategories?: HappenCategory[]
): NormalizedItem[] {
  return items
    .filter(item => {
      if (!filterCategories || filterCategories.length === 0) return true;
      return item.category.some(cat => filterCategories.includes(cat));
    })
    .map(item => {
      // Generate unique ID based on source and external ID
      const id = crypto
        .createHash('sha256')
        .update(`${item.source}:${item.externalId}`)
        .digest('hex')
        .substring(0, 16);

      // Normalize title for comparison
      const normalizedTitle = item.title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ');

      // Convert times to target timezone if provided
      let startTime = item.startTime;
      let endTime = item.endTime;

      if (startTime && item.timezone && item.timezone !== timezone) {
        try {
          const dt = DateTime.fromISO(startTime, { zone: item.timezone });
          startTime = dt.setZone(timezone).toISO() || startTime;
        } catch {
          // Keep original if conversion fails
        }
      }

      if (endTime && item.timezone && item.timezone !== timezone) {
        try {
          const dt = DateTime.fromISO(endTime, { zone: item.timezone });
          endTime = dt.setZone(timezone).toISO() || endTime;
        } catch {
          // Keep original if conversion fails
        }
      }

      return {
        ...item,
        id,
        normalizedTitle,
        startTime,
        endTime,
        timezone,
        lastUpdated: item.lastUpdated || new Date().toISOString(),
      };
    });
}

// Deduplicate items based on similarity
export function dedupe(items: NormalizedItem[]): NormalizedItem[] {
  const uniqueItems: NormalizedItem[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    let isDuplicate = false;

    for (const uniqueItem of uniqueItems) {
      // Check if items are similar enough to be duplicates
      const titleSimilarity = stringSimilarity(
        item.normalizedTitle,
        uniqueItem.normalizedTitle
      );

      // Check time proximity (within 30 minutes)
      let timeSimilar = false;
      if (item.startTime && uniqueItem.startTime) {
        const time1 = new Date(item.startTime).getTime();
        const time2 = new Date(uniqueItem.startTime).getTime();
        timeSimilar = Math.abs(time1 - time2) < 30 * 60 * 1000;
      }

      // Check location proximity (within 200m)
      let locationSimilar = false;
      if (item.lat && item.lng && uniqueItem.lat && uniqueItem.lng) {
        const distance = getDistance(item.lat, item.lng, uniqueItem.lat, uniqueItem.lng);
        locationSimilar = distance < 200;
      }

      // Consider items duplicate if:
      // 1. Title is >90% similar AND time is similar OR
      // 2. Title is >80% similar AND location is similar AND time is similar
      if (
        (titleSimilarity > 0.9 && timeSimilar) ||
        (titleSimilarity > 0.8 && locationSimilar && timeSimilar)
      ) {
        isDuplicate = true;

        // If the new item has more information, replace the old one
        if (
          (!uniqueItem.description && item.description) ||
          (!uniqueItem.imageUrl && item.imageUrl) ||
          (item.popularity && (!uniqueItem.popularity || item.popularity > uniqueItem.popularity))
        ) {
          const index = uniqueItems.indexOf(uniqueItem);
          uniqueItems[index] = { ...item, id: uniqueItem.id };
        }
        break;
      }
    }

    if (!isDuplicate) {
      uniqueItems.push(item);
    }
  }

  return uniqueItems;
}

// Rank items based on various factors
export function rank(
  items: NormalizedItem[],
  params: {
    center?: [number, number];
    sortBy?: 'recommended' | 'soonest' | 'closest' | 'price';
  } = {}
): NormalizedItem[] {
  const { center, sortBy = 'recommended' } = params;

  const scoredItems = items.map(item => {
    let score = 0;

    if (sortBy === 'soonest') {
      // Sort by start time
      if (item.startTime) {
        const timeUntil = new Date(item.startTime).getTime() - Date.now();
        score = 1 / (1 + timeUntil);
      }
    } else if (sortBy === 'closest' && center) {
      // Sort by distance from center
      if (item.lat && item.lng) {
        const distance = getDistance(center[0], center[1], item.lat, item.lng);
        score = 1 / (1 + distance);
      }
    } else if (sortBy === 'price') {
      // Sort by price (lowest first)
      if (item.priceMin !== undefined) {
        score = 1 / (1 + item.priceMin);
      } else {
        score = 1; // Free events get highest score
      }
    } else {
      // Recommended (default) - weighted combination of factors

      // Popularity factor (0-30 points)
      if (item.popularity) {
        score += item.popularity * 30;
      }
      if (item.attendeeCount) {
        score += Math.min(10, Math.log10(item.attendeeCount + 1) * 2);
      }

      // Recency factor (0-20 points)
      if (item.lastUpdated) {
        const hoursSinceUpdate =
          (Date.now() - new Date(item.lastUpdated).getTime()) / (1000 * 60 * 60);
        score += Math.max(0, 20 - hoursSinceUpdate / 24);
      }

      // Distance factor (0-20 points)
      if (center && item.lat && item.lng) {
        const distance = getDistance(center[0], center[1], item.lat, item.lng);
        score += Math.max(0, 20 - distance / 1000); // Reduce by 1 point per km
      }

      // Information completeness (0-15 points)
      if (item.description) score += 3;
      if (item.imageUrl) score += 3;
      if (item.venueName) score += 3;
      if (item.address) score += 3;
      if (item.priceMin !== undefined) score += 3;

      // Category diversity boost (0-10 points)
      // This would need to be calculated across all items
      const categoryWeights: Record<HappenCategory, number> = {
        event: 1,
        exhibition: 1.2,
        attraction: 1.1,
        seminar: 1.3,
        tour: 1.2,
      };
      const categoryBoost = item.category.reduce(
        (acc, cat) => acc + (categoryWeights[cat] || 1),
        0
      );
      score += Math.min(10, categoryBoost * 2);

      // Time relevance (0-5 points)
      if (item.startTime) {
        const daysUntil =
          (new Date(item.startTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysUntil < 1) score += 5; // Happening today
        else if (daysUntil < 3) score += 3; // Next few days
        else if (daysUntil < 7) score += 1; // This week
      }
    }

    return { ...item, score };
  });

  // Sort by score (highest first)
  return scoredItems.sort((a, b) => (b.score || 0) - (a.score || 0));
}

// Filter items based on date range
export function filterByDateRange(
  items: NormalizedItem[],
  startISO: string,
  endISO: string
): NormalizedItem[] {
  const startDate = new Date(startISO).getTime();
  const endDate = new Date(endISO).getTime();

  return items.filter(item => {
    // Attractions without specific times are always included
    if (!item.startTime && item.category.includes('attraction')) {
      return true;
    }

    if (item.startTime) {
      const itemStart = new Date(item.startTime).getTime();
      const itemEnd = item.endTime ? new Date(item.endTime).getTime() : itemStart;

      // Check if event overlaps with date range
      return itemStart <= endDate && itemEnd >= startDate;
    }

    return false;
  });
}