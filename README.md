# Travel Aggregator

A modern web application that aggregates events, exhibitions, attractions, and more from multiple sources for any city and date range. Built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- **Multi-Source Aggregation**: Pulls data from Eventbrite, OpenTripMap, Meetup, and more
- **Intelligent Geocoding**: City search with automatic location resolution using Nominatim
- **Smart Deduplication**: Removes duplicate events using fuzzy matching and geo-proximity
- **Advanced Filtering**: Filter by category, price, indoor/outdoor, family-friendly
- **Shortlist Management**: Save favorites and export to calendar (.ics) or spreadsheet (.csv)
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Performance Optimized**: Built-in caching, rate limiting, and concurrent request management

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd travel-aggregator
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment template:
```bash
cp .env.local.example .env.local
```

4. (Optional) Add API keys to `.env.local`:
```env
# Eventbrite
EVENTBRITE_API_KEY=your_key_here

# OpenTripMap
OPENTRIPMAP_API_KEY=your_key_here

# Meetup
MEETUP_API_KEY=your_key_here

# Google Places (for geocoding fallback)
GOOGLE_PLACES_API_KEY=your_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## API Keys Setup

The application works without API keys using mock data, but for real data you'll need to obtain keys from:

### Eventbrite
1. Go to [Eventbrite App Management](https://www.eventbrite.com/platform/)
2. Create a new app
3. Copy your OAuth token
4. Add as `EVENTBRITE_API_KEY` in `.env.local`

### OpenTripMap
1. Register at [OpenTripMap](https://opentripmap.io/product)
2. Get your API key
3. Add as `OPENTRIPMAP_API_KEY` in `.env.local`

### Meetup (Note: API access is limited)
1. Apply for API access at [Meetup API](https://www.meetup.com/api/)
2. OAuth2 authentication may be required
3. Add credentials to `.env.local`

### Google Places (Optional - for geocoding fallback)
1. Enable Places API in [Google Cloud Console](https://console.cloud.google.com/)
2. Create API key with Places API enabled
3. Add as `GOOGLE_PLACES_API_KEY` in `.env.local`

## Project Structure

```
travel-aggregator/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   │   ├── search/        # Main search endpoint
│   │   ├── geocode/       # Geocoding endpoint
│   │   └── health/        # Health check
│   ├── results/           # Results page
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── search-form.tsx    # Search form component
│   ├── result-card.tsx    # Result card display
│   ├── filter-panel.tsx   # Filter controls
│   └── shortlist-drawer.tsx # Shortlist management
├── lib/                   # Core logic
│   ├── types.ts           # TypeScript types
│   ├── validation.ts      # Zod schemas
│   ├── geocoding.ts       # Geocoding service
│   ├── aggregate.ts       # Normalization, deduping, ranking
│   └── providers/         # Data providers
│       ├── base.ts        # Base provider class
│       ├── eventbrite.ts  # Eventbrite integration
│       ├── opentripmap.ts # OpenTripMap integration
│       └── meetup.ts      # Meetup integration
└── hooks/                 # Custom React hooks
    └── use-shortlist.ts   # Shortlist management hook
```

## Data Providers

### Implemented Providers

1. **Eventbrite**: Events, conferences, workshops
2. **OpenTripMap**: Attractions, museums, points of interest
3. **Meetup**: Community events, tech meetups, social gatherings

### Adding New Providers

1. Create a new file in `lib/providers/`
2. Extend the `BaseProvider` class
3. Implement the `fetchItems` method
4. Add to the provider registry in `lib/providers/index.ts`

Example:
```typescript
import { BaseProvider } from './base';
import { ProviderItem } from '../types';

export class MyProvider extends BaseProvider {
  name = 'MyProvider';

  constructor() {
    super();
    this.isEnabled = !!process.env.MY_PROVIDER_API_KEY;
  }

  async fetchItems(params: {...}): Promise<ProviderItem[]> {
    // Implementation here
  }
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CACHE_TTL_MINUTES` | General cache TTL | 10 |
| `PROVIDER_CACHE_TTL_MINUTES` | Provider cache TTL | 30 |
| `MAX_CONCURRENT_REQUESTS` | Max concurrent API calls | 3 |
| `REQUEST_TIMEOUT_MS` | Request timeout | 10000 |

### Caching Strategy

- **Provider responses**: Cached for 30 minutes (configurable)
- **Geocoding results**: Cached for 1 hour
- **Normalized results**: Cached for 5-10 minutes
- Cache is in-memory (consider Redis for production)

## Testing

```bash
# Run tests (when implemented)
npm test

# Run linting
npm run lint

# Type checking
npm run type-check
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

```bash
# Build image
docker build -t travel-aggregator .

# Run container
docker run -p 3000:3000 --env-file .env.local travel-aggregator
```

## Performance Considerations

- **Rate Limiting**: Built-in rate limiting with exponential backoff
- **Concurrent Requests**: Limited to 3 by default (configurable)
- **Deduplication**: Fuzzy matching with >90% similarity threshold
- **Response Size**: Limited to 200 items per search for performance

## Attribution Requirements

When using this application, ensure you comply with each provider's attribution requirements:

- **Eventbrite**: Display "Powered by Eventbrite" where applicable
- **OpenTripMap**: Include OpenStreetMap attribution
- **Meetup**: Follow Meetup brand guidelines

## Troubleshooting

### No Results Showing
- Check if API keys are properly configured
- Verify the city name is recognized
- Try widening the date range
- Check browser console for errors

### Geocoding Failures
- Nominatim may have rate limits
- Configure Google Places API as fallback
- Try using a more specific city name

### Provider Errors
- Check API key validity
- Verify you haven't hit rate limits
- Some providers may have geographic restrictions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please use the GitHub Issues tab.

---

Built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui components.
