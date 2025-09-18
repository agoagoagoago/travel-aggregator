import { BaseProvider } from './base';
import { ProviderItem, HappenCategory } from '../types';

export class OpenTripMapProvider extends BaseProvider {
  name = 'OpenTripMap';
  private apiKey: string | undefined;

  constructor() {
    super();
    this.apiKey = process.env.OPENTRIPMAP_API_KEY;
    this.isEnabled = !!this.apiKey;
  }

  async fetchItems(params: {
    city: string;
    bbox?: [number, number, number, number];
    startISO: string;
    endISO: string;
  }): Promise<ProviderItem[]> {
    if (!this.isEnabled || !this.apiKey) {
      console.log(`[${this.name}] Provider disabled (no API key)`);
      return [];
    }

    const cacheKey = `opentripmap:${params.city}:${params.bbox?.join(',')}`;

    return this.fetchWithCache(cacheKey, async () => {
      const items: ProviderItem[] = [];

      try {
        if (!params.bbox) {
          console.log(`[${this.name}] No bounding box provided, skipping`);
          return [];
        }

        const [west, south, east, north] = params.bbox;
        const centerLat = (south + north) / 2;
        const centerLng = (west + east) / 2;

        // Calculate radius from bbox (approximate)
        const radiusKm = Math.min(
          50, // Max 50km radius
          Math.max(
            Math.abs(north - south) * 111, // degrees to km
            Math.abs(east - west) * 111 * Math.cos(centerLat * Math.PI / 180)
          ) / 2
        );

        // Fetch places by radius
        const categories = [
          'cultural',        // Museums, galleries, theatres
          'architecture',    // Historic buildings, monuments
          'entertainment',   // Entertainment venues
          'amusements',     // Theme parks, zoos
          'interesting_places', // Various attractions
        ];

        for (const category of categories) {
          const searchParams = new URLSearchParams();
          searchParams.append('radius', (radiusKm * 1000).toString()); // Convert to meters
          searchParams.append('lon', centerLng.toString());
          searchParams.append('lat', centerLat.toString());
          searchParams.append('kinds', category);
          searchParams.append('rate', '3'); // Minimum rating
          searchParams.append('format', 'json');
          searchParams.append('limit', '100');
          if (this.apiKey) {
            searchParams.append('apikey', this.apiKey);
          }

          const response = await this.fetchWithRetry(
            `https://api.opentripmap.com/0.1/en/places/radius?${searchParams}`
          );

          if (!response.ok) {
            console.warn(`[${this.name}] API error for ${category}: ${response.statusText}`);
            continue;
          }

          const data = await response.json();

          for (const place of data || []) {
            // Skip places without names
            if (!place.name) continue;

            // Map OpenTripMap kinds to our categories
            const categories: HappenCategory[] = ['attraction'];
            if (place.kinds?.includes('museums') || place.kinds?.includes('galleries')) {
              categories.push('exhibition');
            } else if (place.kinds?.includes('urban_environment') || place.kinds?.includes('historic')) {
              categories.push('tour');
            }

            // Get detailed info for highly rated places
            let detailInfo: {
              name?: string;
              wikipedia_extracts?: { text?: string };
              info?: { descr?: string };
              address?: {
                city?: string;
                county?: string;
                country?: string;
                postcode?: string;
                state?: string;
                house_number?: string;
                road?: string;
              };
              otm?: string;
              wikipedia?: string;
              preview?: { source?: string };
            } = {};
            if (place.rate >= 5 && place.xid) {
              try {
                const detailResponse = await this.fetchWithRetry(
                  `https://api.opentripmap.com/0.1/en/places/xid/${place.xid}?apikey=${this.apiKey}`
                );
                if (detailResponse.ok) {
                  detailInfo = await detailResponse.json();
                }
              } catch {
                // Ignore detail fetch errors
              }
            }

            const item: ProviderItem = {
              externalId: place.xid || `${place.point.lon},${place.point.lat}`,
              source: 'opentripmap',
              title: place.name,
              description: detailInfo.wikipedia_extracts?.text || detailInfo.info?.descr,
              category: categories,
              // Attractions typically don't have specific times
              venueName: place.name,
              address: detailInfo.address?.house_number
                ? `${detailInfo.address.house_number} ${detailInfo.address.road}, ${detailInfo.address.city || params.city}`
                : detailInfo.address?.road,
              city: detailInfo.address?.city || params.city,
              lat: place.point.lat,
              lng: place.point.lon,
              // Most attractions have entry fees, but we don't have price data
              url: detailInfo.otm || detailInfo.wikipedia || `https://www.openstreetmap.org/?mlat=${place.point.lat}&mlon=${place.point.lon}`,
              imageUrl: detailInfo.preview?.source,
              tags: place.kinds?.split(',').filter((k: string) => k.length > 0) || [],
              // Assume most cultural attractions are indoor and family-friendly
              isFamilyFriendly: !place.kinds?.includes('nightclubs') && !place.kinds?.includes('adult'),
              isIndoor: place.kinds?.includes('museums') || place.kinds?.includes('theatres'),
              popularity: place.rate ? place.rate / 10 : undefined, // Normalize to 0-1
            };

            items.push(item);
          }
        }

        // Deduplicate by location (some places might appear in multiple categories)
        const uniqueItems = new Map<string, ProviderItem>();
        for (const item of items) {
          const key = `${item.lat?.toFixed(4)},${item.lng?.toFixed(4)}`;
          if (!uniqueItems.has(key) || (item.description && !uniqueItems.get(key)?.description)) {
            uniqueItems.set(key, item);
          }
        }

        const finalItems = Array.from(uniqueItems.values());
        console.log(`[${this.name}] Found ${finalItems.length} unique attractions`);
        return finalItems;
      } catch (error) {
        console.error(`[${this.name}] Error:`, error);
        return [];
      }
    });
  }
}