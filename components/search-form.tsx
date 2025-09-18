'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Search, MapPin, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { HappenCategory } from '@/lib/types';
import { searchCities, getPopularCities, City } from '@/lib/cities';

const searchSchema = z.object({
  city: z.string().min(1, 'City is required'),
  startDate: z.date({
    message: 'Start date is required',
  }),
  endDate: z.date({
    message: 'End date is required',
  }),
  categories: z.array(z.string()).optional(),
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type SearchFormData = z.infer<typeof searchSchema>;

const categoryOptions: { value: HappenCategory; label: string }[] = [
  { value: 'event', label: 'Events' },
  { value: 'exhibition', label: 'Exhibitions' },
  { value: 'attraction', label: 'Attractions' },
  { value: 'seminar', label: 'Seminars & Conferences' },
  { value: 'tour', label: 'Tours' },
];

export function SearchForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [citySearchOpen, setCitySearchOpen] = useState(false);
  const [citySearchValue, setCitySearchValue] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    setError,
    clearErrors,
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      city: '',
      categories: [],
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  // Load popular cities initially
  useEffect(() => {
    setCitySuggestions(getPopularCities(15));
  }, []);

  // Search cities when input changes
  useEffect(() => {
    if (citySearchValue.length >= 2) {
      const results = searchCities(citySearchValue, 10);
      setCitySuggestions(results);
    } else {
      setCitySuggestions(getPopularCities(15));
    }
  }, [citySearchValue]);

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setCitySearchValue(`${city.name}, ${city.country}`);
    setValue('city', `${city.name}, ${city.country}`);
    setCitySearchOpen(false);
    clearErrors('city');
  };

  const onSubmit = async (data: SearchFormData) => {
    // Validate city selection
    if (!selectedCity && !citySearchValue) {
      setError('city', { message: 'Please select a city' });
      return;
    }

    if (!data.startDate) {
      setError('startDate', { message: 'Start date is required' });
      return;
    }

    if (!data.endDate) {
      setError('endDate', { message: 'End date is required' });
      return;
    }

    setIsLoading(true);

    const cityName = selectedCity ? selectedCity.name : citySearchValue.split(',')[0];
    const params = new URLSearchParams({
      city: cityName,
      start: data.startDate.toISOString(),
      end: data.endDate.toISOString(),
    });

    if (selectedCategories.length > 0) {
      params.append('cats', selectedCategories.join(','));
    }

    router.push(`/results?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label>City</Label>
        <Popover open={citySearchOpen} onOpenChange={setCitySearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={citySearchOpen}
              className="w-full justify-between"
            >
              <div className="flex items-center">
                <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                {selectedCity ? (
                  <span>{selectedCity.name}, {selectedCity.country}</span>
                ) : (
                  <span className="text-muted-foreground">Search for a city...</span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search cities..."
                value={citySearchValue}
                onValueChange={setCitySearchValue}
              />
              <CommandList>
                <CommandEmpty>No cities found.</CommandEmpty>
                <CommandGroup heading={citySearchValue.length >= 2 ? "Search Results" : "Popular Cities"}>
                  {citySuggestions.map((city) => (
                    <CommandItem
                      key={`${city.name}-${city.country}`}
                      value={`${city.name}, ${city.country}`}
                      onSelect={() => handleCitySelect(city)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCity?.name === city.name && selectedCity?.country === city.country
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div>
                            <div className="font-medium">{city.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {city.country} • {city.continent}
                            </div>
                          </div>
                        </div>
                        {city.population && (
                          <div className="text-xs text-muted-foreground">
                            {(city.population / 1000000).toFixed(1)}M
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors.city && (
          <p className="text-sm text-destructive">{errors.city.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => setValue('startDate', date!)}
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.startDate && (
            <p className="text-sm text-destructive">{errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => setValue('endDate', date!)}
                disabled={(date) =>
                  date < (startDate || new Date(new Date().setHours(0, 0, 0, 0)))
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.endDate && (
            <p className="text-sm text-destructive">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Categories (Optional)</Label>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((category) => (
            <Button
              key={category.value}
              type="button"
              variant={selectedCategories.includes(category.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedCategories(prev =>
                  prev.includes(category.value)
                    ? prev.filter(c => c !== category.value)
                    : [...prev, category.value]
                );
                setValue('categories', selectedCategories);
              }}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isLoading}
      >
        <Search className="mr-2 h-5 w-5" />
        {isLoading ? 'Searching...' : 'Find Happenings'}
      </Button>
    </form>
  );
}