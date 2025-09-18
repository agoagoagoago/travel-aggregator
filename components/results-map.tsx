'use client';

import { useRef } from 'react';
import { NormalizedItem } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Heart, HeartOff, MapPin } from 'lucide-react';

interface ResultsMapProps {
  items: NormalizedItem[];
  center?: [number, number];
  bbox?: [number, number, number, number];
  shortlist: {
    isInShortlist: (id: string) => boolean;
    addItem: (item: NormalizedItem) => void;
    removeItem: (id: string) => void;
  };
}

export function ResultsMap({ items, shortlist }: ResultsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  // For now, we'll create a simple list view with location info
  // In production, you'd integrate with MapLibre GL or Google Maps
  const itemsWithLocation = items.filter(item => item.lat && item.lng);

  if (itemsWithLocation.length === 0) {
    return (
      <div className="text-center py-12 bg-muted rounded-lg">
        <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          No items with location data available for map view.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        ref={mapRef}
        className="h-96 bg-muted rounded-lg flex items-center justify-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />
        <div className="text-center z-10">
          <MapPin className="h-16 w-16 mx-auto mb-4 text-primary/50" />
          <p className="text-muted-foreground font-medium">Interactive Map</p>
          <p className="text-sm text-muted-foreground mt-2">
            To enable the interactive map, configure a map provider API key in your environment variables.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {itemsWithLocation.map((item) => {
          const isInShortlist = shortlist.isInShortlist(item.id);

          return (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold line-clamp-1">{item.title}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.category.map(cat => (
                        <Badge key={cat} variant="secondary" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                    {item.venueName && (
                      <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.venueName}
                      </p>
                    )}
                    {item.address && (
                      <p className="text-xs text-muted-foreground">{item.address}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Coordinates: {item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => isInShortlist ? shortlist.removeItem(item.id) : shortlist.addItem(item)}
                    >
                      {isInShortlist ? (
                        <Heart className="h-4 w-4 fill-current text-red-500" />
                      ) : (
                        <HeartOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Showing {itemsWithLocation.length} of {items.length} items with location data
      </p>
    </div>
  );
}