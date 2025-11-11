import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Cache configuration
const HISTORICAL_CACHE_KEY = 'energymix_historical_v1';
const WEEKLY_CACHE_KEY = 'energymix_weekly_v1';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

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

interface HistoricalCachedData {
  data: HistoricalDataPoint[];
  timestamp: number;
  lastUpdated: string;
  meta: any;
}

interface WeeklyCachedData {
  data: DailyDataPoint[];
  timestamp: number;
  lastUpdated: string;
  meta: any;
}

// Load historical data from localStorage
function loadHistoricalFromCache(): HistoricalCachedData | null {
  try {
    const cached = localStorage.getItem(HISTORICAL_CACHE_KEY);
    if (!cached) return null;
    
    const parsed: HistoricalCachedData = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age < CACHE_EXPIRY_MS) {
      console.log('[Historical Cache] Loaded from cache, age:', Math.round(age / 1000), 'seconds');
      return parsed;
    }
    
    console.log('[Historical Cache] Cache expired, age:', Math.round(age / 1000), 'seconds');
    localStorage.removeItem(HISTORICAL_CACHE_KEY);
    return null;
  } catch (error) {
    console.error('[Historical Cache] Load failed:', error);
    return null;
  }
}

// Save historical data to localStorage
function saveHistoricalToCache(data: HistoricalDataPoint[], lastUpdated: string, meta: any): void {
  try {
    const cacheData: HistoricalCachedData = {
      data,
      timestamp: Date.now(),
      lastUpdated,
      meta
    };
    localStorage.setItem(HISTORICAL_CACHE_KEY, JSON.stringify(cacheData));
    console.log('[Historical Cache] Saved to cache, size:', JSON.stringify(cacheData).length, 'bytes');
  } catch (error) {
    console.error('[Historical Cache] Save failed:', error);
  }
}

// Load weekly data from localStorage
function loadWeeklyFromCache(): WeeklyCachedData | null {
  try {
    const cached = localStorage.getItem(WEEKLY_CACHE_KEY);
    if (!cached) return null;
    
    const parsed: WeeklyCachedData = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age < CACHE_EXPIRY_MS) {
      console.log('[Weekly Cache] Loaded from cache, age:', Math.round(age / 1000), 'seconds');
      return parsed;
    }
    
    console.log('[Weekly Cache] Cache expired, age:', Math.round(age / 1000), 'seconds');
    localStorage.removeItem(WEEKLY_CACHE_KEY);
    return null;
  } catch (error) {
    console.error('[Weekly Cache] Load failed:', error);
    return null;
  }
}

// Save weekly data to localStorage
function saveWeeklyToCache(data: DailyDataPoint[], lastUpdated: string, meta: any): void {
  try {
    const cacheData: WeeklyCachedData = {
      data,
      timestamp: Date.now(),
      lastUpdated,
      meta
    };
    localStorage.setItem(WEEKLY_CACHE_KEY, JSON.stringify(cacheData));
    console.log('[Weekly Cache] Saved to cache, size:', JSON.stringify(cacheData).length, 'bytes');
  } catch (error) {
    console.error('[Weekly Cache] Save failed:', error);
  }
}

export const useHistoricalGeneration = () => {
  // Load from cache on mount
  const cachedHistorical = loadHistoricalFromCache();
  const cachedWeekly = loadWeeklyFromCache();

  // Initialize historical data state with cache
  const [data, setData] = useState<HistoricalDataPoint[]>(
    cachedHistorical ? cachedHistorical.data.map(point => ({
      ...point,
      timestamp: new Date(point.timestamp)
    })) : []
  );
  const [loading, setLoading] = useState(!cachedHistorical); // Skip loading if cached
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    cachedHistorical ? new Date(cachedHistorical.lastUpdated) : null
  );
  const [meta, setMeta] = useState<{periods: number; solarMatchedCount: number; pvSource: string} | null>(cachedHistorical?.meta || null);
  
  // Initialize weekly data state with cache
  const [weeklyData, setWeeklyData] = useState<DailyDataPoint[]>(
    cachedWeekly ? cachedWeekly.data.map(point => ({
      ...point,
      timestamp: new Date(point.timestamp)
    })) : []
  );
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [weeklyLastUpdated, setWeeklyLastUpdated] = useState<Date | null>(
    cachedWeekly ? new Date(cachedWeekly.lastUpdated) : null
  );
  const [weeklyMeta, setWeeklyMeta] = useState<{periods: number; solarMatchedDays: number; totalDays: number; pvSource: string} | null>(cachedWeekly?.meta || null);
  
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

      // Save to localStorage for instant loading on next visit
      saveHistoricalToCache(processedData, historicalData.lastUpdated, historicalData.meta);

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

      // Save to localStorage for instant loading on next visit
      saveWeeklyToCache(processedData, weeklyHistoricalData.lastUpdated, weeklyHistoricalData.meta as any);

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
    // Only show toast if fetching fresh data (no cache)
    const hasCache = loadHistoricalFromCache() !== null;
    fetchHistoricalData(!hasCache);
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