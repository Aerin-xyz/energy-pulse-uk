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
  solarMatched?: boolean;
}

interface DailyDataPoint {
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
  solarMatched?: boolean;
  dayName?: string;
  solarMatchedPeriods?: number;
  totalPeriods?: number;
}

interface HistoricalGenerationData {
  data: HistoricalDataPoint[];
  lastUpdated: string;
  totalPeriods: number;
  meta?: {
    period?: string;
    periods: number;
    solarMatchedCount: number;
    pvSource: string;
    solarMatchedDays?: number;
    totalDays?: number;
  };
}

export const useHistoricalGeneration = () => {
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [meta, setMeta] = useState<{periods: number; solarMatchedCount: number; pvSource: string} | null>(null);
  
  // Weekly data state
  const [weeklyData, setWeeklyData] = useState<DailyDataPoint[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [weeklyLastUpdated, setWeeklyLastUpdated] = useState<Date | null>(null);
  const [weeklyMeta, setWeeklyMeta] = useState<{periods: number; solarMatchedDays: number; totalDays: number; pvSource: string} | null>(null);
  
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
      setMeta(historicalData.meta || null);

      if (showToast) {
        const solarInfo = historicalData.meta 
          ? `, ${historicalData.meta.solarMatchedCount}/${historicalData.meta.periods} solar periods matched`
          : '';
        toast({
          title: "Historical data updated",
          description: `Loaded ${historicalData.totalPeriods} periods${solarInfo}`,
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

  const fetchWeeklyData = useCallback(async (showToast = true) => {
    try {
      setWeeklyLoading(true);
      setWeeklyError(null);

      const { data: response, error: supabaseError } = await supabase.functions.invoke('historical-generation?period=7d');

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (response.error) {
        throw new Error(response.error);
      }

      const weeklyHistoricalData: HistoricalGenerationData = response;
      
      // Convert timestamp strings back to Date objects
      const processedData = weeklyHistoricalData.data.map(point => ({
        ...point,
        timestamp: new Date(point.timestamp)
      }));

      setWeeklyData(processedData);
      setWeeklyLastUpdated(new Date(weeklyHistoricalData.lastUpdated));
      setWeeklyMeta(weeklyHistoricalData.meta as any || null);

      if (showToast) {
        const solarInfo = weeklyHistoricalData.meta 
          ? `, ${weeklyHistoricalData.meta.solarMatchedDays}/${weeklyHistoricalData.meta.totalDays} days with solar data`
          : '';
        toast({
          title: "Weekly data updated",
          description: `Loaded ${weeklyHistoricalData.totalPeriods} days${solarInfo}`,
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weekly data';
      setWeeklyError(errorMessage);
      
      if (showToast) {
        toast({
          title: "Error loading weekly data",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setWeeklyLoading(false);
    }
  }, [toast]);

  // Fetch historical data in parallel with energy data for faster initial load
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
    meta,
    refetch: () => fetchHistoricalData(true),
    // Weekly data
    weeklyData,
    weeklyLoading,
    weeklyError,
    weeklyLastUpdated,
    weeklyMeta,
    fetchWeeklyData: () => fetchWeeklyData(true)
  };
};