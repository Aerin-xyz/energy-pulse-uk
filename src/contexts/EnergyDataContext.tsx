import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

// localStorage cache utilities for instant loading
const CACHE_KEY = 'energymix_cache_v3'; // Bumped to invalidate slower pre-FUELINST cache
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

interface CachedData {
  data: EnergyData;
  timestamp: number;
}

function loadFromLocalStorage(): EnergyData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedData = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    // Return cached data if less than 10 minutes old
    if (age < CACHE_EXPIRY_MS) {
      // Reconstruct Date objects
      return {
        ...parsed.data,
        lastUpdated: new Date(parsed.data.lastUpdated)
      };
    }
    
    // Expired, remove it
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (error) {
    console.error('[localStorage] Failed to load cache:', error);
    return null;
  }
}

function saveToLocalStorage(data: EnergyData): void {
  try {
    const cacheData: CachedData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('[localStorage] Failed to save cache:', error);
  }
}

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

interface EnergyDataContextValue {
  data: EnergyData | null;
  rawData: any;
  loading: boolean;
  error: string | null;
  nextUpdateAt: Date | null;
  nextHighFreqAt: Date | null;
  nextMidFreqAt: Date | null;
  lastUpdateType: 'high' | 'mid' | 'full';
  refetch: () => Promise<void>;
}

const EnergyDataContext = createContext<EnergyDataContextValue | undefined>(undefined);

// Real API integration using Supabase Edge Function
async function fetchEnergyData(updateType: 'high' | 'mid' | 'full' = 'full', signal?: AbortSignal): Promise<any> {
  const timestamp = new Date().getTime();
  const response = await fetch(`https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/energy-data?debug=1&updateType=${updateType}&t=${timestamp}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Raw API response (${updateType}):`, data);
  return data;
}

export function EnergyDataProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage for instant loading
  const [data, setData] = useState<EnergyData | null>(() => loadFromLocalStorage());
  const [rawData, setRawData] = useState<any>(null);
  const [cachedData, setCachedData] = useState<EnergyData | null>(() => loadFromLocalStorage());
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextUpdateAt, setNextUpdateAt] = useState<Date | null>(null);
  const [nextHighFreqAt, setNextHighFreqAt] = useState<Date | null>(null);
  const [nextMidFreqAt, setNextMidFreqAt] = useState<Date | null>(null);
  const [lastUpdateType, setLastUpdateType] = useState<'high' | 'mid' | 'full'>('full');
  const [retryCount, setRetryCount] = useState(0);
  const pendingRequest = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);
  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchAndSetEnergyData = useCallback(async (updateType: 'high' | 'mid' | 'full' = 'full', showToast = true) => {
    // Prevent duplicate simultaneous requests
    if (pendingRequest.current) {
      console.log('[EnergyDataProvider] Request already in flight, skipping');
      return pendingRequest.current;
    }
    
    // Don't start new requests if unmounted
    if (!isMountedRef.current) {
      return;
    }
    
    const promise = (async () => {
      try {
        // Check if still mounted before setting state
        if (!isMountedRef.current) return;
        
        // OPTIMIZATION: Always show cached data immediately to improve perceived performance
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          
          // Show toast if cache is stale (>10 minutes)
          const cacheAge = Math.floor((Date.now() - cachedData.lastUpdated.getTime()) / 60000);
          if (cacheAge > 10 && showToast && initialLoad) {
            toast({
              title: "Showing Recent Data",
              description: `Data is ${cacheAge} minutes old. Refreshing now...`,
              variant: "default"
            });
          }
        }
        
        // Only show loading on initial load if no cached data
        if (!cachedData && initialLoad) {
          setLoading(true);
        }
        
        setError(null);
        
        // Fetch data directly from our Edge Function with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
        const energyData = await fetchEnergyData(updateType, controller.signal);
        clearTimeout(timeoutId);

        // Check if still mounted before setting state
        if (!isMountedRef.current) return;
        
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
          carbonIntensity: energyData.carbonIntensity || cachedData?.carbonIntensity,
          dataFreshness: energyData.dataFreshness,
          asOf: energyData.asOf,
        };

        // High-frequency responses now include fresh Elexon FUELINST generation, so do
        // not freeze non-wind/solar categories from cache. Preserve slower-changing
        // enrichments only when a fast response omits them.
        if (cachedData && !energyData.carbonIntensity) {
          newData.carbonIntensity = cachedData.carbonIntensity;
        }

        setData(newData);
        setCachedData(newData); // Cache for next time
        saveToLocalStorage(newData); // Persist to localStorage for instant loading
        setLastUpdateType(updateType);
        
        // Calculate next update times
        const now = new Date();
        const nextHigh = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes
        const nextMid = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
        const nextFull = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
        
        setNextHighFreqAt(nextHigh);
        setNextMidFreqAt(nextMid);
        setNextUpdateAt(updateType === 'full' ? nextFull : nextHigh);

        // Reset retry count on successful fetch
        setRetryCount(0);

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
        
        // Handle rate limiting with exponential backoff
        if (errorMessage.includes('429') || errorMessage.includes('API error: 429')) {
          const backoffMinutes = Math.min(Math.pow(2, retryCount), 30);
          setRetryCount(prev => prev + 1);
          
          if (showToast) {
            toast({
              title: "Rate Limited",
              description: `Too many requests. Retrying in ${backoffMinutes} minutes...`,
              variant: "destructive"
            });
          }
          
          // Schedule retry
          setTimeout(() => {
            fetchAndSetEnergyData(updateType, false);
          }, backoffMinutes * 60 * 1000);
          
          // Use cached data if available
          if (cachedData) {
            setData(cachedData);
          }
          return;
        }
        
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
        if (isMountedRef.current) {
          setLoading(false);
          setInitialLoad(false);
        }
        pendingRequest.current = null;
      }
    })();
    
    pendingRequest.current = promise;
    return promise;
  }, [toast, cachedData, initialLoad, retryCount]);

  // Initial fetch (full data)
  useEffect(() => {
    fetchAndSetEnergyData('full', false); // No toast on initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Staggered multi-frequency auto-refresh intervals to prevent simultaneous requests
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];
    
    // Start high frequency after 30 seconds (prevents clash with initial load)
    const highFreqTimeout = setTimeout(() => {
      const highFreqInterval = setInterval(() => {
        fetchAndSetEnergyData('high', false);
      }, 2 * 60 * 1000);
      intervals.push(highFreqInterval);
    }, 30 * 1000);

    // Start mid frequency after 2 minutes
    const midFreqTimeout = setTimeout(() => {
      const midFreqInterval = setInterval(() => {
        fetchAndSetEnergyData('mid', false);
      }, 5 * 60 * 1000);
      intervals.push(midFreqInterval);
    }, 2 * 60 * 1000);

    // Start full frequency after 5 minutes
    const fullFreqTimeout = setTimeout(() => {
      const fullFreqInterval = setInterval(() => {
        fetchAndSetEnergyData('full', false);
      }, 10 * 60 * 1000);
      intervals.push(fullFreqInterval);
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(highFreqTimeout);
      clearTimeout(midFreqTimeout);
      clearTimeout(fullFreqTimeout);
      intervals.forEach(interval => clearInterval(interval));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - set up intervals once on mount

  // Refresh when tab becomes visible again (full refresh)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAndSetEnergyData('full', false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - set up listener once on mount

  const value: EnergyDataContextValue = {
    data,
    rawData,
    loading,
    error,
    nextUpdateAt,
    nextHighFreqAt,
    nextMidFreqAt,
    lastUpdateType,
    refetch: () => fetchAndSetEnergyData('full', true)
  };

  return (
    <EnergyDataContext.Provider value={value}>
      {children}
    </EnergyDataContext.Provider>
  );
}

export function useEnergyData() {
  const context = useContext(EnergyDataContext);
  if (context === undefined) {
    throw new Error('useEnergyData must be used within an EnergyDataProvider');
  }
  return context;
}
