// Country Types
export interface Country {
  code: string;
  ko: string;
  en: string;
  flag: string;
  continent: string;
  lat: number;
  lng: number;
}

export interface VisitedCountry extends Country {
  year?: string;
  note?: string;
}

// Cruise Types
export interface CruiseWaypoint {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  day?: string;
}

export interface CruisePreset {
  id: string;
  region: string;
  name: string;
  subtitle: string;
  badge?: string;
  recommendedMode: TransitMode;
  curvature: number;
  waypoints: CruiseWaypoint[];
}

export interface LegDistance {
  from: CruiseWaypoint;
  to: CruiseWaypoint;
  distKm: number;
  distNM: number;
}

export interface ActiveLegInfo {
  legNum: number;
  totalLegs: number;
  fromName: string;
  toName: string;
  fromCountry: string;
  toCountry: string;
  legPercent: number;
  currentPort: CruiseWaypoint | null;
  nextPort: CruiseWaypoint | null;
  dockedPort: CruiseWaypoint | null;
}

export interface CurrentMotion {
  lat: number;
  lng: number;
  heading: number;
}

// UI Types
export type TabType = 'cruise' | 'visited';
export type MapTheme = 'dark' | 'satellite' | 'light';
export type TransitMode = 'boat' | 'arrow' | 'plane' | 'car';
export type PortStatus = 'visited' | 'docked' | 'upcoming';
export type ItineraryViewMode = 'table' | 'cards';
export type SyncStatus = 'connecting' | 'synced' | 'offline';

export interface CountryInfo {
  code: string;
  ko: string;
  en: string;
  flag: string;
}

// Continent Stats
export interface ContinentCounts {
  [key: string]: number;
}

export interface VisitedStats {
  count: number;
  worldPercent: string;
  continentCounts: ContinentCounts;
}
