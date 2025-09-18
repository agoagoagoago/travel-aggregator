'use client';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchFilters, HappenCategory } from '@/lib/types';

interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

const categoryOptions: { value: HappenCategory; label: string }[] = [
  { value: 'event', label: 'Events' },
  { value: 'exhibition', label: 'Exhibitions' },
  { value: 'attraction', label: 'Attractions' },
  { value: 'seminar', label: 'Seminars' },
  { value: 'tour', label: 'Tours' },
];

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const handleCategoryToggle = (category: HappenCategory) => {
    const current = filters.categories || [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];

    onFiltersChange({
      ...filters,
      categories: updated.length > 0 ? updated : undefined,
    });
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    onFiltersChange({
      ...filters,
      priceRange: {
        ...filters.priceRange,
        [type]: numValue,
      },
    });
  };

  const handleReset = () => {
    onFiltersChange({});
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <Label className="text-base font-semibold mb-3 block">Sort By</Label>
        <Select
          value={filters.sortBy || 'recommended'}
          onValueChange={(value: 'recommended' | 'soonest' | 'closest' | 'price') => onFiltersChange({ ...filters, sortBy: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recommended">Recommended</SelectItem>
            <SelectItem value="soonest">Soonest</SelectItem>
            <SelectItem value="price">Price (Low to High)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div>
        <Label className="text-base font-semibold mb-3 block">Categories</Label>
        <div className="space-y-2">
          {categoryOptions.map(({ value, label }) => (
            <Button
              key={value}
              variant={filters.categories?.includes(value) ? 'default' : 'outline'}
              size="sm"
              className="w-full justify-start"
              onClick={() => handleCategoryToggle(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-base font-semibold mb-3 block">Price Range</Label>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            placeholder="Min"
            value={filters.priceRange?.min ?? ''}
            onChange={(e) => handlePriceChange('min', e.target.value)}
            min="0"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={filters.priceRange?.max ?? ''}
            onChange={(e) => handlePriceChange('max', e.target.value)}
            min="0"
          />
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-base font-semibold mb-3 block">Environment</Label>
        <div className="space-y-2">
          <Button
            variant={filters.isIndoor === true ? 'default' : 'outline'}
            size="sm"
            className="w-full justify-start"
            onClick={() => onFiltersChange({
              ...filters,
              isIndoor: filters.isIndoor === true ? undefined : true,
            })}
          >
            Indoor Only
          </Button>
          <Button
            variant={filters.isIndoor === false ? 'default' : 'outline'}
            size="sm"
            className="w-full justify-start"
            onClick={() => onFiltersChange({
              ...filters,
              isIndoor: filters.isIndoor === false ? undefined : false,
            })}
          >
            Outdoor Only
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-base font-semibold mb-3 block">Other</Label>
        <Button
          variant={filters.isFamilyFriendly ? 'default' : 'outline'}
          size="sm"
          className="w-full justify-start"
          onClick={() => onFiltersChange({
            ...filters,
            isFamilyFriendly: filters.isFamilyFriendly ? undefined : true,
          })}
        >
          Family-Friendly Only
        </Button>
      </div>

      <Separator />

      <Button variant="outline" className="w-full" onClick={handleReset}>
        Reset Filters
      </Button>
    </div>
  );
}