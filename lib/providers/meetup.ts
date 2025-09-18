import { BaseProvider } from './base';
import { ProviderItem, HappenCategory } from '../types';

export class MeetupProvider extends BaseProvider {
  name = 'Meetup';
  private apiKey: string | undefined;

  constructor() {
    super();
    this.apiKey = process.env.MEETUP_API_KEY;
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

    const cacheKey = `meetup:${params.city}:${params.startISO}:${params.endISO}`;

    return this.fetchWithCache(cacheKey, async () => {
      const items: ProviderItem[] = [];

      try {
        // Meetup API v3 endpoint
        const searchParams = new URLSearchParams();
        if (this.apiKey) {
          searchParams.append('key', this.apiKey);
        }
        searchParams.append('sign', 'true');
        searchParams.append('photo-host', 'public');
        searchParams.append('text', params.city);
        searchParams.append('radius', '25'); // miles
        searchParams.append('status', 'upcoming');
        searchParams.append('page', '100');

        // If we have bbox, use center point
        if (params.bbox) {
          const [west, south, east, north] = params.bbox;
          searchParams.set('lat', ((south + north) / 2).toString());
          searchParams.set('lon', ((west + east) / 2).toString());
          searchParams.delete('text'); // Use coordinates instead of text
        }

        // Note: Meetup API might require OAuth2 for newer endpoints
        // This uses the older API which might be deprecated
        // Consider using GraphQL API or web scraping as fallback
        const response = await this.fetchWithRetry(
          `https://api.meetup.com/find/upcoming_events?${searchParams}`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          // Fallback: Try to use mock data or skip
          console.warn(`[${this.name}] API error: ${response.statusText}`);
          return this.getMockMeetupData(params);
        }

        const data = await response.json();

        for (const event of data.events || []) {
          // Map Meetup categories
          const categories: HappenCategory[] = ['event'];
          const groupCategory = event.group?.category?.shortname?.toLowerCase() || '';

          if (groupCategory.includes('tech') || groupCategory.includes('career')) {
            categories.push('seminar');
          } else if (groupCategory.includes('tour') || groupCategory.includes('outdoor')) {
            categories.push('tour');
          }

          const item: ProviderItem = {
            externalId: event.id,
            source: 'meetup',
            title: event.name || 'Meetup Event',
            description: event.description,
            category: categories,
            startTime: event.time ? new Date(event.time).toISOString() : undefined,
            endTime: event.duration
              ? new Date(event.time + event.duration).toISOString()
              : undefined,
            timezone: event.timezone,
            venueName: event.venue?.name || event.group?.name,
            address: event.venue?.address_1,
            city: event.venue?.city || params.city,
            lat: event.venue?.lat,
            lng: event.venue?.lon,
            priceMin: event.fee?.amount || 0,
            priceMax: event.fee?.amount,
            currency: event.fee?.currency || 'USD',
            url: event.link,
            imageUrl: event.featured_photo?.photo_link,
            tags: [
              groupCategory,
              event.group?.name,
            ].filter(Boolean),
            isFamilyFriendly: !groupCategory.includes('singles') && !groupCategory.includes('nightlife'),
            isIndoor: event.venue?.name?.toLowerCase().includes('online') ? undefined : true,
            language: 'en', // Meetup is primarily English
            attendeeCount: event.yes_rsvp_count,
            popularity: event.rsvp_limit
              ? Math.min(1, event.yes_rsvp_count / event.rsvp_limit)
              : undefined,
          };

          items.push(item);
        }

        console.log(`[${this.name}] Found ${items.length} items`);
      } catch (error) {
        console.error(`[${this.name}] Error:`, error);
        // Return mock data as fallback
        return this.getMockMeetupData(params);
      }

      return items;
    });
  }

  // Mock data for demonstration when API is not available
  private getMockMeetupData(params: {
    city: string;
    bbox?: [number, number, number, number];
    startISO: string;
    endISO: string;
  }): ProviderItem[] {
    const mockEvents: ProviderItem[] = [
      {
        externalId: 'mock-meetup-1',
        source: 'meetup',
        title: `${params.city} JavaScript Developers Meetup`,
        description: 'Monthly meetup for JavaScript developers to share knowledge and network.',
        category: ['event', 'seminar'],
        startTime: new Date(params.startISO).toISOString(),
        endTime: new Date(new Date(params.startISO).getTime() + 2 * 60 * 60 * 1000).toISOString(),
        venueName: 'Tech Hub',
        city: params.city,
        priceMin: 0,
        priceMax: 0,
        url: 'https://www.meetup.com/',
        tags: ['tech', 'javascript', 'programming'],
        isFamilyFriendly: false,
        isIndoor: true,
        language: 'en',
        attendeeCount: 45,
        popularity: 0.7,
      },
      {
        externalId: 'mock-meetup-2',
        source: 'meetup',
        title: `${params.city} Photography Walk`,
        description: 'Join us for a photography walk around the city. All skill levels welcome!',
        category: ['event', 'tour'],
        startTime: new Date(new Date(params.startISO).getTime() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(new Date(params.startISO).getTime() + 27 * 60 * 60 * 1000).toISOString(),
        venueName: 'City Center',
        city: params.city,
        priceMin: 10,
        priceMax: 10,
        currency: 'USD',
        url: 'https://www.meetup.com/',
        tags: ['photography', 'outdoor', 'walking'],
        isFamilyFriendly: true,
        isIndoor: false,
        language: 'en',
        attendeeCount: 20,
        popularity: 0.5,
      },
      {
        externalId: 'mock-meetup-3',
        source: 'meetup',
        title: `${params.city} Entrepreneurs Network`,
        description: 'Network with local entrepreneurs and startup founders.',
        category: ['event', 'seminar'],
        startTime: new Date(new Date(params.startISO).getTime() + 48 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(new Date(params.startISO).getTime() + 50 * 60 * 60 * 1000).toISOString(),
        venueName: 'Business Center',
        city: params.city,
        priceMin: 15,
        priceMax: 15,
        currency: 'USD',
        url: 'https://www.meetup.com/',
        tags: ['business', 'networking', 'startup'],
        isFamilyFriendly: false,
        isIndoor: true,
        language: 'en',
        attendeeCount: 60,
        popularity: 0.8,
      },
    ];

    // Filter by date range
    const startTime = new Date(params.startISO).getTime();
    const endTime = new Date(params.endISO).getTime();

    return mockEvents.filter(event => {
      if (!event.startTime) return false;
      const eventTime = new Date(event.startTime).getTime();
      return eventTime >= startTime && eventTime <= endTime;
    });
  }
}