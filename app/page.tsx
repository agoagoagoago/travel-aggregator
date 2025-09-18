import { SearchForm } from '@/components/search-form';
import { Globe, Calendar, MapPin, Filter } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <div className="relative mb-8 py-4">
            {/* Background glow effect */}
            <div className="absolute inset-0 blur-3xl opacity-30">
              <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent py-2">
                Travel Aggregator
              </h1>
            </div>
            {/* Main title */}
            <h1 className="relative text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight py-2">
              <span className="inline-block bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent animate-pulse">
                Travel
              </span>
              <span className="mx-2 md:mx-4 text-2xl md:text-4xl lg:text-5xl">✈️</span>
              <span className="inline-block bg-gradient-to-r from-teal-600 via-emerald-600 to-blue-600 bg-clip-text text-transparent">
                Aggregator
              </span>
            </h1>
            {/* Decorative elements */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full opacity-60"></div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-purple-400 to-emerald-400 rounded-full opacity-60"></div>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            <span className="font-medium text-foreground">Discover</span> events, exhibitions, attractions, and more happening during your visit to
            <span className="font-medium bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent"> any city</span>
          </p>

          {/* Subtle animation indicators */}
          <div className="flex justify-center items-center mt-6 space-x-3 opacity-60">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto">
          <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
            <SearchForm />
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Feature
              icon={<Globe className="h-8 w-8" />}
              title="Any City"
              description="Search events worldwide with intelligent geocoding"
            />
            <Feature
              icon={<Calendar className="h-8 w-8" />}
              title="Date Range"
              description="Find happenings during your exact travel dates"
            />
            <Feature
              icon={<MapPin className="h-8 w-8" />}
              title="Multiple Sources"
              description="Aggregated from Eventbrite, Meetup, and more"
            />
            <Feature
              icon={<Filter className="h-8 w-8" />}
              title="Smart Filters"
              description="Filter by category, price, distance, and time"
            />
          </div>
        </div>

        <footer className="text-center mt-16 text-sm text-muted-foreground">
          <p>Data aggregated from multiple sources • Results may vary by location</p>
        </footer>
      </div>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}