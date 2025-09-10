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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextUpdateAt, setNextUpdateAt] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchAndSetEnergyData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching energy data from API...');
      
      // Fetch data directly from our Edge Function
      const energyData = await fetchEnergyData();
      console.log('Processed energy data:', {
        generationMixLength: energyData.generationMix?.length,
        interconnectorsLength: energyData.interconnectors?.length,
        totalGenerationMW: energyData.totalGenerationMW,
        dataFreshness: energyData.dataFreshness,
        diagnostics: energyData.diagnostics
      });

      // Debug summary for interconnectors
      console.info('Interconnector debug:', {
        status: energyData.dataFreshness?.interconnectorStatus,
        count: energyData.diagnostics?.icCount || 0,
        ok: energyData.diagnostics?.icOk,
        source: energyData.diagnostics?.icSource,
        firstAttempt: energyData.diagnostics?.icAttempts?.[0]?.variant || 'none'
      });

      setData({
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
      });

      // Calculate next update time (5 minutes from now)
      const nextUpdate = new Date();
      nextUpdate.setMinutes(nextUpdate.getMinutes() + 5);
      setNextUpdateAt(nextUpdate);

      toast({
        title: "Data Updated",
        description: `Live UK grid data refreshed at ${new Date().toLocaleTimeString()}`,
      });
      
    } catch (err) {
      console.error('Energy data fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch live energy data';
      setError(errorMessage);
      toast({
        title: "Update Failed", 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchAndSetEnergyData();
  }, [fetchAndSetEnergyData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchAndSetEnergyData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAndSetEnergyData]);

  // Refresh when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Tab became visible, refreshing data...');
        fetchAndSetEnergyData();
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
    refetch: fetchAndSetEnergyData
  };
};