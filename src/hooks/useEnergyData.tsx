import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface GenerationData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface InterconnectorData {
  name: string;
  country: string;
  flow: number;
  capacity: number;
}

interface EUCountryGeneration {
  country: string;
  totalMW: number;
  fuelMix: Record<string, number>;
  timestamp: string;
}

interface CarbonIntensityData {
  actual: number;
  forecast: number;
  index: string;
  timestamp: string;
  percentOfAverage: number;
  forecastData?: Array<{
    from: string;
    to: string;
    intensity: {
      forecast: number;
      index: string;
    };
  }>;
}

interface EnergyData {
  generationMix: GenerationData[];
  interconnectors: InterconnectorData[];
  euGenerationMix?: EUCountryGeneration[];
  totalGeneration: number;
  totalDemand: number;
  totalGenerationMW: number;
  totalDemandMW: number;
  lastUpdated: Date;
  carbonIntensity?: CarbonIntensityData;
  dataFreshness?: {
    source?: string;
    isRealtime?: boolean;
    spFrom?: string | null;
    spTo?: string | null;
    variant?: string;
    note?: string;
    interconnectorStatus?: 'live' | 'cached' | 'unavailable';
  };
  asOf?: {
    settlementDate?: string;
    settlementPeriod?: number;
    percentageSum?: number;
  };
}

interface BMRSResponse {
  data: Array<{
    startTime: string;
    settlementDate: string;
    settlementPeriod: number;
    quantity: number;
    fuelType: string;
  }>;
}

interface InterconnectorFlow {
  startTime: string;
  quantity: number;
  interconnectorName: string;
}

// Energy source color mapping - Refreshed Palette
const ENERGY_COLORS = {
  'Gas': '#F2553C',     // Coral Red
  'Wind': '#6BC1B0',    // Teal Blue
  'Nuclear': '#E15D72', // Warm Rose
  'Solar': '#F7B633',   // Soft Mustard
  'Hydro': '#4F6C8D',   // Slate Indigo
  'Coal': '#C9BBA8',    // Light Mushroom
  'Biomass': '#94D1B2', // Cool Mint
  'Imports': '#D6D6D6', // Fog Grey
  'PSH': '#4F6C8D',     // Slate Indigo
  'Other': '#C9BBA8',   // Light Mushroom
  'Misc': '#C9BBA8'     // Light Mushroom
};

// Map BMRS fuel types to our simplified categories
const FUEL_TYPE_MAPPING: { [key: string]: string } = {
  'CCGT': 'Gas',
  'OCGT': 'Gas',
  'WIND': 'Wind',
  'NUCLEAR': 'Nuclear',
  'NPSHYD': 'Hydro',
  'PS': 'PSH',
  'COAL': 'Coal',
  'OIL': 'Other',
  'BIOMASS': 'Biomass',
  'INTFR': 'Imports',
  'INTIRL': 'Imports',
  'INTNED': 'Imports',
  'INTBEL': 'Imports',
  'INTEW': 'Imports',
  'INTNEM': 'Imports',
  'INTNSL': 'Imports',
  'INTDK1': 'Imports',
  'INTELEC': 'Imports',
  'INTIFA2': 'Imports',
  'OTHER': 'Other'
};

// Real API integration using Supabase Edge Function
async function fetchEnergyData(updateType: 'high' | 'mid' | 'full' = 'full'): Promise<any> {
  // Add cache-busting timestamp
  const timestamp = new Date().getTime();
  const response = await fetch(`https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/energy-data?debug=1&updateType=${updateType}&t=${timestamp}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Raw API response (${updateType}):`, data);
  return data;
}


export const useEnergyData = () => {
  const [data, setData] = useState<EnergyData | null>(null);
  const [rawData, setRawData] = useState<any>(null);
  const [cachedData, setCachedData] = useState<EnergyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextUpdateAt, setNextUpdateAt] = useState<Date | null>(null);
  const [nextHighFreqAt, setNextHighFreqAt] = useState<Date | null>(null);
  const [nextMidFreqAt, setNextMidFreqAt] = useState<Date | null>(null);
  const [lastUpdateType, setLastUpdateType] = useState<'high' | 'mid' | 'full'>('full');
  const { toast } = useToast();

  const fetchAndSetEnergyData = useCallback(async (updateType: 'high' | 'mid' | 'full' = 'full', showToast = true) => {
    try {
      // If we have cached data, show it immediately while fetching new data
      if (cachedData && !initialLoad) {
        setData(cachedData);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Fetch data directly from our Edge Function with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const energyData = await fetchEnergyData(updateType);
      clearTimeout(timeoutId);

      // Store raw data for debugging
      setRawData(energyData);

      const newData = {
        generationMix: energyData.generationMix,
        interconnectors: (energyData.interconnectors || []).filter((ic: InterconnectorData) => 
          ic.name !== 'Denmark West'
        ),
        euGenerationMix: energyData.euGenerationMix || [],
        totalGeneration: energyData.totalGeneration || (energyData.totalGenerationMW || 0) / 1000,
        totalDemand: energyData.totalDemand || (energyData.totalDemandMW || 0) / 1000,
        totalGenerationMW: energyData.totalGenerationMW || (energyData.totalGeneration || 0) * 1000,
        totalDemandMW: energyData.totalDemandMW || (energyData.totalDemand || 0) * 1000,
        lastUpdated: new Date(energyData.lastUpdated),
        carbonIntensity: energyData.carbonIntensity,
        dataFreshness: energyData.dataFreshness,
        asOf: energyData.asOf,
      };

      // Smart merging for partial updates
      if (updateType === 'high' && cachedData) {
        // Only update embedded sources for high frequency
        newData.generationMix = newData.generationMix.map(item => {
          if (item.name === 'Wind' || item.name === 'Solar') {
            return item; // Use new data
          }
          // Find matching item in cached data
          const cachedItem = cachedData.generationMix.find(c => c.name === item.name);
          return cachedItem || item;
        });
      } else if (updateType === 'mid' && cachedData) {
        // Update embedded sources and interconnectors for mid frequency
        newData.totalGeneration = cachedData.totalGeneration;
        newData.totalDemand = cachedData.totalDemand;
        newData.totalGenerationMW = cachedData.totalGenerationMW;
        newData.totalDemandMW = cachedData.totalDemandMW;
      }

      setData(newData);
      setCachedData(newData); // Cache for next time
      setLastUpdateType(updateType);
      
      // Calculate next update times
      const now = new Date();
      const nextHigh = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
      const nextMid = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
      const nextFull = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
      
      setNextHighFreqAt(nextHigh);
      setNextMidFreqAt(nextMid);
      setNextUpdateAt(updateType === 'full' ? nextFull : nextHigh);

      // Only show toast on manual refresh or after initial load
      if (showToast && !initialLoad) {
        const updateLabels = {
          high: 'embedded sources',
          mid: 'interconnectors & EU data',
          full: 'all data'
        };
        toast({
          title: "Data Updated",
          description: `${updateLabels[updateType]} refreshed at ${new Date().toLocaleTimeString()}`,
        });
      }
      
    } catch (err) {
      console.error('Energy data fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch live energy data';
      
      // If we have cached data, use it and show a subtle warning
      if (cachedData) {
        setData(cachedData);
        if (showToast) {
          toast({
            title: "Using cached data", 
            description: "Live data unavailable, showing last known data",
            variant: "default",
          });
        }
      } else {
        setError(errorMessage);
        if (showToast) {
          toast({
            title: "Update Failed", 
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [toast, cachedData, initialLoad]);

  // Initial fetch (full data)
  useEffect(() => {
    fetchAndSetEnergyData('full', false); // No toast on initial load
  }, [fetchAndSetEnergyData]);

  // Multi-frequency auto-refresh intervals
  useEffect(() => {
    // High frequency updates (5 minutes) - embedded sources only
    const highFreqInterval = setInterval(() => {
      fetchAndSetEnergyData('high', false);
    }, 5 * 60 * 1000);

    // Mid frequency updates (15 minutes) - interconnectors & EU data
    const midFreqInterval = setInterval(() => {
      fetchAndSetEnergyData('mid', false);
    }, 15 * 60 * 1000);

    // Full frequency updates (30 minutes) - complete refresh
    const fullFreqInterval = setInterval(() => {
      fetchAndSetEnergyData('full', false);
    }, 30 * 60 * 1000);

    return () => {
      clearInterval(highFreqInterval);
      clearInterval(midFreqInterval);
      clearInterval(fullFreqInterval);
    };
  }, [fetchAndSetEnergyData]);

  // Refresh when tab becomes visible again (full refresh)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAndSetEnergyData('full', false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchAndSetEnergyData]);

  return {
    data,
    rawData,
    loading,
    error,
    nextUpdateAt,
    nextHighFreqAt,
    nextMidFreqAt,
    lastUpdateType,
    refetch: () => fetchAndSetEnergyData('full', true) // Show toast on manual refresh
  };
};