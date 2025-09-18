'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Share2, Filter as FilterIcon, Grid2x2, List, MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useShortlist } from '@/hooks/use-shortlist';
import { NormalizedItem, SearchFilters } from '@/lib/types';
import { ResultCard } from '@/components/result-card';
import { FilterPanel } from '@/components/filter-panel';
import { ShortlistDrawer } from '@/components/shortlist-drawer';
import { ResultsMap } from '@/components/results-map';

function ResultsContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<NormalizedItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<NormalizedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchInfo, setSearchInfo] = useState<any>(null);

  const shortlist = useShortlist();

  useEffect(() => {
    fetchResults();
  }, [searchParams]);

  useEffect(() => {
    applyFilters();
  }, [items, filters]);

  const fetchResults = async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams(searchParams);

    try {
      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch results');
      }

      setItems(data.items || []);
      setSearchInfo({
        city: data.city,
        country: data.country,
        displayName: data.displayName,
        timezone: data.timezone,
        center: data.center,
        bbox: data.bbox,
        startISO: data.startISO,
        endISO: data.endISO,
        count: data.count,
        providers: data.providers,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Filter by categories
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(item =>
        item.category.some(cat => filters.categories?.includes(cat))
      );
    }

    // Filter by price range
    if (filters.priceRange) {
      if (filters.priceRange.min !== undefined) {
        filtered = filtered.filter(item =>
          item.priceMin === undefined || item.priceMin >= (filters.priceRange?.min ?? 0)
        );
      }
      if (filters.priceRange.max !== undefined) {
        filtered = filtered.filter(item =>
          item.priceMin === undefined || item.priceMin <= (filters.priceRange?.max ?? Infinity)
        );
      }
    }

    // Filter by indoor/outdoor
    if (filters.isIndoor !== undefined) {
      filtered = filtered.filter(item => item.isIndoor === filters.isIndoor);
    }

    // Filter by family-friendly
    if (filters.isFamilyFriendly !== undefined) {
      filtered = filtered.filter(item => item.isFamilyFriendly === filters.isFamilyFriendly);
    }

    // Sort
    if (filters.sortBy) {
      const sorted = [...filtered];
      switch (filters.sortBy) {
        case 'soonest':
          sorted.sort((a, b) => {
            if (!a.startTime) return 1;
            if (!b.startTime) return -1;
            return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
          });
          break;
        case 'price':
          sorted.sort((a, b) => {
            const aPrice = a.priceMin ?? 0;
            const bPrice = b.priceMin ?? 0;
            return aPrice - bPrice;
          });
          break;
        // 'recommended' is default (already sorted by score)
      }
      filtered = sorted;
    }

    setFilteredItems(filtered);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {searchInfo?.displayName || searchInfo?.city}
            </h1>
            <p className="text-muted-foreground">
              {new Date(searchInfo?.startISO).toLocaleDateString()} -{' '}
              {new Date(searchInfo?.endISO).toLocaleDateString()} •{' '}
              {filteredItems.length} of {items.length} happenings
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                New Search
              </Link>
            </Button>

            <ShortlistDrawer shortlist={shortlist} />

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <FilterPanel filters={filters} onFiltersChange={setFilters} />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Data from:</span>
          {searchInfo?.providers?.map((provider: string) => (
            <Badge key={provider} variant="secondary">
              {provider}
            </Badge>
          )) || <Badge variant="secondary">Mock Data</Badge>}
        </div>
      </header>

      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="grid" onClick={() => setViewMode('grid')}>
            <Grid2x2 className="mr-2 h-4 w-4" />
            Grid
          </TabsTrigger>
          <TabsTrigger value="list" onClick={() => setViewMode('list')}>
            <List className="mr-2 h-4 w-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="map">
            <MapIcon className="mr-2 h-4 w-4" />
            Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <ResultCard
                key={item.id}
                item={item}
                viewMode="grid"
                shortlist={shortlist}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <ResultCard
                key={item.id}
                item={item}
                viewMode="list"
                shortlist={shortlist}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <ResultsMap
            items={filteredItems}
            center={searchInfo?.center}
            bbox={searchInfo?.bbox}
            shortlist={shortlist}
          />
        </TabsContent>
      </Tabs>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No results match your filters. Try adjusting them or widening your date range.
          </p>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<LoadingSkeleton />}>
          <ResultsContent />
        </Suspense>
      </div>
    </div>
  );
}