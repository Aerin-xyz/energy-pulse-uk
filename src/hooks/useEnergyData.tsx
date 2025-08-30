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
  lastUpdated: Date;
}

// Energy source color mapping
const ENERGY_COLORS = {
  'Gas': 'hsl(205, 100%, 58%)',
  'Wind': 'hsl(162, 73%, 46%)',
  'Nuclear': 'hsl(210, 11%, 55%)',
  'Solar': 'hsl(39, 85%, 65%)',
  'Hydro': 'hsl(195, 100%, 58%)',
  'Coal': 'hsl(355, 65%, 65%)',
  'Biomass': 'hsl(25, 31%, 53%)',
  'Imports': 'hsl(271, 76%, 53%)',
  'PSH': 'hsl(195, 100%, 58%)',
  'Other': 'hsl(210, 11%, 55%)',
  'Misc': 'hsl(210, 11%, 55%)'
};

// Mock data for development - replace with real API calls
const generateMockData = (): EnergyData => {
  const generationTypes = [
    { name: 'Gas', value: 11.2 },
    { name: 'Wind', value: 10.8 },
    { name: 'Nuclear', value: 6.4 },
    { name: 'Solar', value: 2.8 },
    { name: 'Hydro', value: 0.9 },
    { name: 'Biomass', value: 2.4 },
    { name: 'Imports', value: 2.1 },
    { name: 'Coal', value: 0.0 },
    { name: 'PSH', value: 0.3 },
    { name: 'Other', value: 0.8 }
  ];

  const total = generationTypes.reduce((sum, item) => sum + item.value, 0);
  
  const generationMix = generationTypes
    .filter(item => item.value > 0)
    .map(item => ({
      name: item.name,
      value: item.value,
      percentage: (item.value / total) * 100,
      color: ENERGY_COLORS[item.name as keyof typeof ENERGY_COLORS] || ENERGY_COLORS.Other
    }));

  const interconnectors = [
    { name: 'IFA', country: 'France', flow: 2008, capacity: 2000 },
    { name: 'BritNed', country: 'Netherlands', flow: 882, capacity: 1000 },
    { name: 'Nemolink', country: 'Belgium', flow: 999, capacity: 1000 },
    { name: 'INTELEC', country: 'Eleclink', flow: 998, capacity: 1000 },
    { name: 'Viking Link', country: 'Denmark', flow: 724, capacity: 1400 },
    { name: 'East-West', country: 'Ireland', flow: -527, capacity: 500 },
    { name: 'Greenlink', country: 'Ireland', flow: -515, capacity: 500 },
    { name: 'Moyle', country: 'Northern Ireland', flow: -450, capacity: 500 },
    { name: 'INTIFA2', country: 'IFA2', flow: -4, capacity: 1000 },
    { name: 'INTNSL', country: 'North Sea Link', flow: 0, capacity: 1400 }
  ];

  return {
    generationMix,
    interconnectors,
    totalGeneration: total,
    lastUpdated: new Date()
  };
};

export const useEnergyData = () => {
  const [data, setData] = useState<EnergyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEnergyData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, use mock data
      // TODO: Replace with actual API calls to BMRS and National Grid
      const mockData = generateMockData();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setData(mockData);
      
      toast({
        title: "Data Updated",
        description: `Energy data refreshed at ${mockData.lastUpdated.toLocaleTimeString()}`,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch energy data';
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
    fetchEnergyData();
  }, [fetchEnergyData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchEnergyData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEnergyData]);

  return {
    data,
    loading,
    error,
    refetch: fetchEnergyData
  };
};