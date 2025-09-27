import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HistoricalDataPoint {
  settlementDate: string;
  settlementPeriod: number;
  timestamp: Date;
  fuelMix: Array<{
    fuelType: string;
    mw: number;
    percentage: number;
    color: string;
  }>;
  totalMW: number;
}

interface HistoricalGenerationData {
  data: HistoricalDataPoint[];
  lastUpdated: string;
  totalPeriods: number;
}

export const useHistoricalGeneration = () => {
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchHistoricalData = useCallback(async (showToast = true) => {
    try {
      setLoading(true);
      setError(null);

      const { data: response, error: supabaseError } = await supabase.functions.invoke('historical-generation');

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (response.error) {
        throw new Error(response.error);
      }

      const historicalData: HistoricalGenerationData = response;
      
      // Convert timestamp strings back to Date objects
      const processedData = historicalData.data.map(point => ({
        ...point,
        timestamp: new Date(point.timestamp)
      }));

      setData(processedData);
      setLastUpdated(new Date(historicalData.lastUpdated));

      if (showToast) {
        toast({
          title: "Historical data updated",
          description: `Loaded ${historicalData.totalPeriods} periods`,
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch historical data';
      setError(errorMessage);
      
      if (showToast) {
        toast({
          title: "Error loading historical data",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchHistoricalData(false);
  }, [fetchHistoricalData]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHistoricalData(false);
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchHistoricalData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: () => fetchHistoricalData(true)
  };
};