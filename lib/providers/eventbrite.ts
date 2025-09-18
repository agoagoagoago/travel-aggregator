import { BaseProvider } from './base';
import { ProviderItem, HappenCategory } from '../types';

export class EventbriteProvider extends BaseProvider {
  name = 'Eventbrite';
  private apiKey: string | undefined;

  constructor() {
    super();
    this.apiKey = process.env.EVENTBRITE_API_KEY;
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

    const cacheKey = `eventbrite:${params.city}:${params.startISO}:${params.endISO}`;

    return this.fetchWithCache(cacheKey, async () => {
      const items: ProviderItem[] = [];

      try {
        // Search for events in the city
        const searchParams = new URLSearchParams({
          'location.address': params.city,
          'start_date.range_start': params.startISO,
          'start_date.range_end': params.endISO,
          'expand': 'venue,category',
          'page_size': '50',
          'token': this.apiKey, // Add token as query parameter
        });

        // If we have bbox, use it for more precise location filtering
        if (params.bbox) {
          searchParams.append('location.within', '20km'); // Radius search
          searchParams.append('location.latitude', ((params.bbox[1] + params.bbox[3]) / 2).toString());
          searchParams.append('location.longitude', ((params.bbox[0] + params.bbox[2]) / 2).toString());
        }

        const response = await this.fetchWithRetry(
          `https://www.eventbriteapi.com/v3/events/search/?${searchParams}`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Eventbrite API error: ${response.statusText}`);
        }

        const data = await response.json();

        for (const event of data.events || []) {
          // Map Eventbrite categories to our categories
          const categories: HappenCategory[] = ['event'];
          const categoryName = event.category?.name?.toLowerCase() || '';

          if (categoryName.includes('conference') || categoryName.includes('seminar')) {
            categories.push('seminar');
          } else if (categoryName.includes('tour')) {
            categories.push('tour');
          }

          // Determine if indoor/outdoor
          const isIndoor = !event.online_event &&
            (event.venue?.name?.toLowerCase().includes('center') ||
             event.venue?.name?.toLowerCase().includes('hall') ||
             event.venue?.name?.toLowerCase().includes('theatre'));

          // Determine if family-friendly
          const isFamilyFriendly = categoryName.includes('family') ||
            categoryName.includes('kids') ||
            event.name?.text?.toLowerCase().includes('family') ||
            event.name?.text?.toLowerCase().includes('children');

          const item: ProviderItem = {
            externalId: event.id,
            source: 'eventbrite',
            title: event.name?.text || 'Untitled Event',
            description: event.description?.text,
            category: categories,
            startTime: event.start?.utc,
            endTime: event.end?.utc,
            timezone: event.start?.timezone,
            venueName: event.venue?.name,
            address: event.venue?.address?.localized_address_display,
            city: event.venue?.address?.city || params.city,
            lat: event.venue?.latitude ? parseFloat(event.venue.latitude) : undefined,
            lng: event.venue?.longitude ? parseFloat(event.venue.longitude) : undefined,
            priceMin: event.is_free ? 0 : undefined,
            currency: event.currency,
            url: event.url,
            imageUrl: event.logo?.url,
            tags: [categoryName].filter(Boolean),
            isFamilyFriendly,
            isIndoor,
            language: event.locale?.split('_')[0] || 'en',
            popularity: event.capacity ? Math.min(1, (event.capacity - (event.capacity_remaining || 0)) / event.capacity) : undefined,
          };

          items.push(item);
        }

        // Handle pagination if needed (simplified for now)
        console.log(`[${this.name}] Found ${items.length} items`);
      } catch (error) {
        console.error(`[${this.name}] Error:`, error);
        // Return empty array instead of throwing to allow other providers to continue
      }

      return items;
    });
  }
}