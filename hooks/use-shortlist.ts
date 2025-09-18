'use client';

import { useState, useEffect } from 'react';
import { NormalizedItem, ShortlistItem } from '@/lib/types';

const STORAGE_KEY = 'travel-shortlist';

export function useShortlist() {
  const [items, setItems] = useState<ShortlistItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {
        console.error('Failed to parse shortlist from localStorage');
      }
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: NormalizedItem, notes?: string) => {
    setItems(prev => {
      // Check if already in shortlist
      if (prev.some(s => s.id === item.id)) {
        return prev;
      }

      return [...prev, {
        id: item.id,
        item,
        addedAt: new Date().toISOString(),
        notes,
      }];
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(s => s.id !== id));
  };

  const updateNotes = (id: string, notes: string) => {
    setItems(prev =>
      prev.map(s => s.id === id ? { ...s, notes } : s)
    );
  };

  const clearAll = () => {
    setItems([]);
  };

  const isInShortlist = (id: string) => {
    return items.some(s => s.id === id);
  };

  // Export to ICS calendar format
  const exportToICS = () => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Travel Aggregator//EN',
      'CALSCALE:GREGORIAN',
    ];

    items.forEach(({ item }) => {
      if (item.startTime) {
        const start = new Date(item.startTime);
        const end = item.endTime ? new Date(item.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

        lines.push(
          'BEGIN:VEVENT',
          `UID:${item.id}@travel-aggregator`,
          `DTSTAMP:${formatICSDate(new Date())}`,
          `DTSTART:${formatICSDate(start)}`,
          `DTEND:${formatICSDate(end)}`,
          `SUMMARY:${escapeICS(item.title)}`,
          item.description ? `DESCRIPTION:${escapeICS(item.description)}` : '',
          item.venueName ? `LOCATION:${escapeICS(item.venueName + (item.address ? ', ' + item.address : ''))}` : '',
          item.url ? `URL:${item.url}` : '',
          'END:VEVENT'
        );
      }
    });

    lines.push('END:VCALENDAR');

    const blob = new Blob([lines.filter(Boolean).join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'travel-itinerary.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Title', 'Category', 'Date', 'Time', 'Venue', 'Address', 'Price', 'URL', 'Notes'];
    const rows = items.map(({ item, notes }) => {
      const date = item.startTime ? new Date(item.startTime).toLocaleDateString() : '';
      const time = item.startTime ? new Date(item.startTime).toLocaleTimeString() : '';
      const price = item.priceMin !== undefined
        ? item.priceMin === 0 ? 'Free' : `${item.currency || '$'}${item.priceMin}${item.priceMax && item.priceMax !== item.priceMin ? `-${item.priceMax}` : ''}`
        : '';

      return [
        item.title,
        item.category.join(', '),
        date,
        time,
        item.venueName || '',
        item.address || '',
        price,
        item.url,
        notes || '',
      ].map(escapeCSV).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'travel-itinerary.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate shareable link
  const getShareableLink = () => {
    const ids = items.map(s => s.id).join(',');
    const url = new URL(window.location.origin);
    url.pathname = '/shared';
    url.searchParams.set('items', ids);
    return url.toString();
  };

  return {
    items,
    addItem,
    removeItem,
    updateNotes,
    clearAll,
    isInShortlist,
    exportToICS,
    exportToCSV,
    getShareableLink,
  };
}

// Helper functions
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICS(str: string): string {
  return str.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
}

function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}