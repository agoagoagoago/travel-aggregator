'use client';

import { Calendar, Download, Heart, Share2, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';

interface ShortlistDrawerProps {
  shortlist: {
    items: any[];
    removeItem: (id: string) => void;
    clearAll: () => void;
    exportToICS: () => void;
    exportToCSV: () => void;
    getShareableLink: () => string;
  };
}

export function ShortlistDrawer({ shortlist }: ShortlistDrawerProps) {
  const handleShare = () => {
    const link = shortlist.getShareableLink();
    navigator.clipboard.writeText(link);
    // You could also show a toast notification here
    alert('Link copied to clipboard!');
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Date TBD';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Heart className="mr-2 h-4 w-4" />
          Shortlist ({shortlist.items.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            My Shortlist
            {shortlist.items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={shortlist.clearAll}
              >
                Clear All
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        {shortlist.items.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Your shortlist is empty. Add items from the search results to build your itinerary.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {shortlist.items.map(({ id, item, addedAt }) => (
                <Card key={id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-2">{item.title}</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.category.map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        {formatDate(item.startTime)}
                      </p>
                      {item.venueName && (
                        <p className="text-sm text-muted-foreground">
                          {item.venueName}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => shortlist.removeItem(id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Separator className="my-6" />

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={shortlist.exportToICS}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Export to Calendar (.ics)
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={shortlist.exportToCSV}
              >
                <FileText className="mr-2 h-4 w-4" />
                Export to Spreadsheet (.csv)
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleShare}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share Itinerary Link
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}