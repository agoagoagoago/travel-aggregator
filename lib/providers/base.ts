import { Provider, ProviderItem } from '../types';
import pLimit from 'p-limit';

// Rate limiting for API calls
const limit = pLimit(parseInt(process.env.MAX_CONCURRENT_REQUESTS || '3'));

// Simple in-memory cache for provider responses
interface CacheEntry {
  key: string;
  data: ProviderItem[];
  timestamp: number;
}

const providerCache = new Map<string, CacheEntry>();
const CACHE_TTL = parseInt(process.env.PROVIDER_CACHE_TTL_MINUTES || '30') * 60 * 1000;

export abstract class BaseProvider implements Provider {
  abstract name: string;
  isEnabled: boolean = true;

  protected async fetchWithCache(
    cacheKey: string,
    fetcher: () => Promise<ProviderItem[]>
  ): Promise<ProviderItem[]> {
    // Check cache
    const cached = providerCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[${this.name}] Cache hit for ${cacheKey}`);
      return cached.data;
    }

    // Fetch with rate limiting
    console.log(`[${this.name}] Fetching data for ${cacheKey}`);
    try {
      const data = await limit(fetcher);

      // Cache the result
      providerCache.set(cacheKey, {
        key: cacheKey,
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      console.error(`[${this.name}] Error fetching data:`, error);

      // Return cached data if available, even if expired
      if (cached) {
        console.log(`[${this.name}] Using stale cache due to error`);
        return cached.data;
      }

      throw error;
    }
  }

  protected async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(
            parseInt(process.env.REQUEST_TIMEOUT_MS || '10000')
          ),
        });

        if (response.status === 429) {
          // Rate limited, wait with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          const jitter = Math.random() * 1000;
          console.log(`[${this.name}] Rate limited, waiting ${delay + jitter}ms`);
          await new Promise(resolve => setTimeout(resolve, delay + jitter));
          continue;
        }

        if (!response.ok && response.status >= 500) {
          // Server error, retry
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[${this.name}] Retry ${i + 1}/${maxRetries} failed:`, error);

        if (i < maxRetries - 1) {
          // Wait before retry with exponential backoff
          const delay = Math.min(500 * Math.pow(2, i), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Failed to fetch after retries');
  }

  abstract fetchItems(params: {
    city: string;
    bbox?: [number, number, number, number];
    startISO: string;
    endISO: string;
  }): Promise<ProviderItem[]>;
}

export function clearProviderCache(): void {
  providerCache.clear();
  console.log('Provider cache cleared');
}