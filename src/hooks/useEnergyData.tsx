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

interface EnergyData {
  generationMix: GenerationData[];
  interconnectors: InterconnectorData[];
  euGenerationMix?: EUCountryGeneration[];
  totalGeneration: number;
  totalDemand: number;
  totalGenerationMW: number;
  totalDemandMW: number;
  lastUpdated: Date;
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

// Energy source color mapping based on real dashboard colors
const ENERGY_COLORS = {
  'Gas': '#3B82F6', // Blue
  'Wind': '#10B981', // Green  
  'Nuclear': '#6B7280', // Gray
  'Solar': '#F59E0B', // Yellow
  'Hydro': '#06B6D4', // Cyan
  'Coal': '#EF4444', // Red
  'Biomass': '#A16207', // Brown
  'Imports': '#8B5CF6', // Purple
  'PSH': '#06B6D4', // Cyan (same as hydro)
  'Other': '#6B7280', // Gray
  'Misc': '#6B7280' // Gray
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
async function fetchEnergyData(): Promise<any> {
  // Add cache-busting timestamp
  const timestamp = new Date().getTime();
  const response = await fetch(`https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/energy-data?debug=1&t=${timestamp}`, {
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
  console.log('Raw API response:', data);
  return data;
}


export const useEnergyData = () => {
  const [data, setData] = useState<EnergyData | null>(null);
  const [cachedData, setCachedData] = useState<EnergyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextUpdateAt, setNextUpdateAt] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchAndSetEnergyData = useCallback(async (showToast = true) => {
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
      
      const energyData = await fetchEnergyData();
      clearTimeout(timeoutId);

      const newData = {
        generationMix: energyData.generationMix,
        interconnectors: energyData.interconnectors,
        euGenerationMix: energyData.euGenerationMix || [],
        totalGeneration: energyData.totalGeneration || (energyData.totalGenerationMW || 0) / 1000,
        totalDemand: energyData.totalDemand || (energyData.totalDemandMW || 0) / 1000,
        totalGenerationMW: energyData.totalGenerationMW || (energyData.totalGeneration || 0) * 1000,
        totalDemandMW: energyData.totalDemandMW || (energyData.totalDemand || 0) * 1000,
        lastUpdated: new Date(energyData.lastUpdated),
        dataFreshness: energyData.dataFreshness,
        asOf: energyData.asOf,
      };

      setData(newData);
      setCachedData(newData); // Cache for next time
      
      // Calculate next update time (5 minutes from now)
      const nextUpdate = new Date();
      nextUpdate.setMinutes(nextUpdate.getMinutes() + 5);
      setNextUpdateAt(nextUpdate);

      // Only show toast on manual refresh or after initial load
      if (showToast && !initialLoad) {
        toast({
          title: "Data Updated",
          description: `Live UK grid data refreshed at ${new Date().toLocaleTimeString()}`,
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

  // Initial fetch
  useEffect(() => {
    fetchAndSetEnergyData(false); // No toast on initial load
  }, [fetchAndSetEnergyData]);

  // Auto-refresh every 5 minutes (silent)
  useEffect(() => {
    const interval = setInterval(() => fetchAndSetEnergyData(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAndSetEnergyData]);

  // Refresh when tab becomes visible again (silent)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAndSetEnergyData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchAndSetEnergyData]);

  return {
    data,
    loading,
    error,
    nextUpdateAt,
    refetch: () => fetchAndSetEnergyData(true) // Show toast on manual refresh
  };
};