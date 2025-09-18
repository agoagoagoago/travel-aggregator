'use client';

import Image from 'next/image';
import { Calendar, MapPin, DollarSign, ExternalLink, Heart, HeartOff } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NormalizedItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ResultCardProps {
  item: NormalizedItem;
  viewMode: 'grid' | 'list';
  shortlist: {
    isInShortlist: (id: string) => boolean;
    addItem: (item: NormalizedItem) => void;
    removeItem: (id: string) => void;
  };
}

export function ResultCard({ item, viewMode, shortlist }: ResultCardProps) {
  const isInShortlist = shortlist.isInShortlist(item.id);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = () => {
    if (item.priceMin === undefined) return 'Price TBD';
    if (item.priceMin === 0) return 'Free';
    const currency = item.currency || 'USD';
    const symbol = currency === 'USD' ? '$' : currency;
    if (item.priceMax && item.priceMax !== item.priceMin) {
      return `${symbol}${item.priceMin}-${item.priceMax}`;
    }
    return `${symbol}${item.priceMin}`;
  };

  const categoryColors: Record<string, string> = {
    event: 'bg-blue-100 text-blue-800',
    exhibition: 'bg-purple-100 text-purple-800',
    attraction: 'bg-green-100 text-green-800',
    seminar: 'bg-orange-100 text-orange-800',
    tour: 'bg-pink-100 text-pink-800',
  };

  return (
    <Card className={cn(
      'overflow-hidden transition-all hover:shadow-lg',
      viewMode === 'list' && 'flex flex-row'
    )}>
      {item.imageUrl && viewMode === 'grid' && (
        <div className="h-48 overflow-hidden bg-muted">
          <Image
            src={item.imageUrl}
            alt={item.title}
            width={400}
            height={200}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div className={cn('flex flex-col', viewMode === 'list' && 'flex-1')}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg line-clamp-2">{item.title}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => isInShortlist ? shortlist.removeItem(item.id) : shortlist.addItem(item)}
            >
              {isInShortlist ? (
                <Heart className="h-5 w-5 fill-current text-red-500" />
              ) : (
                <HeartOff className="h-5 w-5" />
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {item.category.map(cat => (
              <Badge
                key={cat}
                variant="secondary"
                className={cn('text-xs', categoryColors[cat])}
              >
                {cat}
              </Badge>
            ))}
            {item.isFamilyFriendly && (
              <Badge variant="outline" className="text-xs">
                Family-friendly
              </Badge>
            )}
            {item.isIndoor !== undefined && (
              <Badge variant="outline" className="text-xs">
                {item.isIndoor ? 'Indoor' : 'Outdoor'}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1">
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {item.description}
            </p>
          )}

          <div className="space-y-2 text-sm">
            {item.startTime && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(item.startTime)}</span>
              </div>
            )}

            {item.venueName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{item.venueName}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{formatPrice()}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button variant="outline" size="sm" className="w-full" asChild>
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              View Details
              <ExternalLink className="ml-2 h-3 w-3" />
            </a>
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}