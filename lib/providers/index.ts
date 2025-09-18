import { Provider } from '../types';
import { EventbriteProvider } from './eventbrite';
import { OpenTripMapProvider } from './opentripmap';
import { MeetupProvider } from './meetup';

// Registry of all available providers
const providerClasses = [
  EventbriteProvider,
  OpenTripMapProvider,
  MeetupProvider,
];

// Initialize providers
export const providers: Provider[] = providerClasses
  .map(ProviderClass => new ProviderClass())
  .filter(provider => provider.isEnabled);

// Get provider by name
export function getProvider(name: string): Provider | undefined {
  return providers.find(p => p.name.toLowerCase() === name.toLowerCase());
}

// Get all enabled provider names
export function getEnabledProviders(): string[] {
  return providers.map(p => p.name);
}

console.log(`Enabled providers: ${getEnabledProviders().join(', ') || 'none (using mock data)'}`);

// Export individual providers for testing
export { EventbriteProvider, OpenTripMapProvider, MeetupProvider };