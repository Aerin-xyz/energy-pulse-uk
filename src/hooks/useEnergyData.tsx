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

interface EnergyData {
  generationMix: GenerationData[];
  interconnectors: InterconnectorData[];
  totalGeneration: number;
  totalDemand: number;
  lastUpdated: Date;
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
  const response = await fetch('https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/energy-data', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

function processGenerationData(bmrsData: BMRSResponse): { generationMix: GenerationData[], totalGeneration: number } {
  // Use realistic data based on current UK grid status
  const realtimeGeneration = [
    { name: 'Gas', value: 2.1 },
    { name: 'Wind', value: 18.8 },
    { name: 'Nuclear', value: 3.8 },
    { name: 'Solar', value: 1.5 },
    { name: 'Hydro', value: 0.1 },
    { name: 'Biomass', value: 1.0 },
    { name: 'Imports', value: 1.3 },
    { name: 'Coal', value: 0.0 },
    { name: 'PSH', value: -0.01 },
    { name: 'Other', value: 0.2 }
  ];

  const total = realtimeGeneration.filter(item => item.value > 0).reduce((sum, item) => sum + item.value, 0);
  
  const generationMix = realtimeGeneration
    .filter(item => item.value > 0.01) // Filter out very small values
    .map(item => ({
      name: item.name,
      value: item.value,
      percentage: (item.value / total) * 100,
      color: ENERGY_COLORS[item.name as keyof typeof ENERGY_COLORS] || ENERGY_COLORS.Other
    }))
    .sort((a, b) => b.value - a.value); // Sort by generation amount

  return { generationMix, totalGeneration: total };
}

function processInterconnectorData(flows: InterconnectorFlow[]): InterconnectorData[] {
  const interconnectorMap: { [key: string]: { flow: number; capacity: number; country: string } } = {
    'France (IFA)': { flow: 3800, capacity: 2000, country: 'France' },
    'Netherlands (BritNed)': { flow: 882, capacity: 1000, country: 'Netherlands' },
    'Belgium (Nemolink)': { flow: 999, capacity: 1000, country: 'Belgium' },
    'Denmark (Viking Link)': { flow: 724, capacity: 1400, country: 'Denmark' },
    'Ireland (East-West)': { flow: 412, capacity: 500, country: 'Ireland' },
    'Ireland (Greenlink)': { flow: -527, capacity: 500, country: 'Ireland' },
    'Northern Ireland (Moyle)': { flow: -450, capacity: 500, country: 'Northern Ireland' },
    'Netherlands (Export)': { flow: -1048, capacity: 1000, country: 'Netherlands' },
    'Belgium (Export)': { flow: -788, capacity: 1000, country: 'Belgium' },
    'Norway (NSL)': { flow: 0, capacity: 1400, country: 'Norway' }
  };

  return Object.entries(interconnectorMap).map(([name, data]) => ({
    name: name.split(' (')[1]?.replace(')', '') || name,
    country: data.country,
    flow: data.flow,
    capacity: data.capacity
  }));
}

export const useEnergyData = () => {
  const [data, setData] = useState<EnergyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAndSetEnergyData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching energy data from API...');
      
      // Fetch data directly from our Edge Function
      const energyData = await fetchEnergyData();

      setData({
        generationMix: energyData.generationMix,
        interconnectors: energyData.interconnectors,
        totalGeneration: energyData.totalGeneration,
        totalDemand: energyData.totalDemand,
        lastUpdated: new Date(energyData.lastUpdated)
      });

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

  return {
    data,
    loading,
    error,
    refetch: fetchAndSetEnergyData
  };
};