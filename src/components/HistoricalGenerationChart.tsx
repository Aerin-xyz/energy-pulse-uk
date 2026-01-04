import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { formatGWfromMW, formatGWh } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';

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

interface ForecastDataPoint {
  timestamp: string;
  windForecastMW: number;
  solarForecastMW: number;
  source: 'day-ahead' | 'latest';
}

interface HistoricalGenerationChartProps {
  data: HistoricalDataPoint[];
  lastUpdated?: Date | null;
  meta?: {
    periods: number;
    solarMatchedCount: number;
    pvSource: string;
  };
  weeklyData: DailyDataPoint[];
  weeklyLoading: boolean;
  weeklyError: string | null;
  weeklyLastUpdated?: Date | null;
  weeklyMeta?: {
    periods: number;
    solarMatchedDays: number;
    totalDays: number;
    pvSource: string;
  } | null;
  onFetchWeeklyData: () => void;
  forecastData?: ForecastDataPoint[];
  forecastLoading?: boolean;
  onFetchForecastData?: () => void;
}

const CustomTooltip = ({ active, payload, label, showForecast }: any) => {
  if (active && payload && payload.length) {
    // Handle both timestamp (number) and day name (string)
    let timestamp: Date;
    if (typeof label === 'number') {
      timestamp = new Date(label);
    } else {
      // For weekly chart, get timestamp from payload
      timestamp = payload[0]?.payload?.timestamp 
        ? new Date(payload[0].payload.timestamp)
        : new Date();
    }

    // Separate actual generation from forecast data
    const actualPayload = payload.filter((item: any) => 
      !['windForecast', 'solarForecast'].includes(item.dataKey)
    );
    const forecastPayload = payload.filter((item: any) => 
      ['windForecast', 'solarForecast'].includes(item.dataKey)
    );
    
    const total = actualPayload.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
    const isForecastOnly = payload[0]?.payload?.isForecastOnly;
    
    return (
      <div className="glass-morphism border-primary/30 rounded-lg p-3 shadow-lg max-w-xs glow-cyan">
        <p className="text-muted-foreground text-xs mb-2">
          {timestamp.toLocaleDateString()} {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isForecastOnly && <span className="ml-1 text-primary">(Forecast)</span>}
        </p>
        {!isForecastOnly && (
          <p className="font-bold text-sm mb-2">Total: {formatGWh(total / 1000, 1)}</p>
        )}
        <div className="space-y-1">
          {actualPayload
            .filter((entry: any) => entry.value > 0)
            .sort((a: any, b: any) => b.value - a.value)
            .map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs">{entry.dataKey}</span>
                </div>
                <span className="text-xs font-medium">
                  {formatGWh(entry.value / 1000, 1)}
                </span>
              </div>
            ))}
        </div>
        {/* Forecast section */}
        {showForecast && forecastPayload.length > 0 && (
          <div className="mt-2 pt-2 border-t border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Forecast:</p>
            <div className="space-y-1">
              {forecastPayload
                .filter((entry: any) => entry.value != null && entry.value > 0)
                .map((entry: any, index: number) => (
                  <div key={index} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-2 h-0.5"
                        style={{ 
                          backgroundColor: entry.color,
                          borderTop: entry.dataKey === 'windForecast' ? '2px dashed' : '2px dotted'
                        }}
                      />
                      <span className="text-xs">
                        {entry.dataKey === 'windForecast' ? 'Wind' : 'Solar'}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-primary">
                      {formatGWh(entry.value / 1000, 1)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const HistoricalGenerationChart = ({ 
  data, 
  lastUpdated, 
  meta, 
  weeklyData, 
  weeklyLoading, 
  weeklyError, 
  weeklyLastUpdated, 
  weeklyMeta, 
  onFetchWeeklyData,
  forecastData,
  forecastLoading,
  onFetchForecastData
}: HistoricalGenerationChartProps) => {
  const [activeTab, setActiveTab] = useState("chart");
  const [weeklyDataFetched, setWeeklyDataFetched] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [forecastFetched, setForecastFetched] = useState(false);

  // Automatically fetch weekly data when tab is first accessed
  useEffect(() => {
    if (activeTab === "weekly" && !weeklyDataFetched && !weeklyLoading && weeklyData.length === 0) {
      onFetchWeeklyData();
      setWeeklyDataFetched(true);
    }
  }, [activeTab, weeklyDataFetched, weeklyLoading, weeklyData.length, onFetchWeeklyData]);

  // Fetch forecast data when toggle is enabled
  useEffect(() => {
    if (showForecast && !forecastFetched && !forecastLoading && onFetchForecastData) {
      onFetchForecastData();
      setForecastFetched(true);
    }
  }, [showForecast, forecastFetched, forecastLoading, onFetchForecastData]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historical Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No historical data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for stacked area chart with forecast overlay
  const chartData = data.map(point => {
    const chartPoint: any = {
      timestamp: point.timestamp.getTime(),
      time: point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      total: point.totalMW
    };
    
    // Add each fuel type as a separate property (values are in MW for hourly data)
    point.fuelMix.forEach(fuel => {
      chartPoint[fuel.fuelType] = fuel.mw;
    });

    // Merge forecast data if enabled and available
    if (showForecast && forecastData && forecastData.length > 0) {
      const forecastPoint = forecastData.find(f => {
        const forecastTime = new Date(f.timestamp).getTime();
        // Match within 15 minutes (half a settlement period)
        return Math.abs(forecastTime - point.timestamp.getTime()) < 15 * 60 * 1000;
      });
      if (forecastPoint) {
        chartPoint.windForecast = forecastPoint.windForecastMW;
        chartPoint.solarForecast = forecastPoint.solarForecastMW;
      }
    }
    
    return chartPoint;
  });

  // Add future forecast points that extend beyond historical data
  const forecastOnlyPoints: any[] = [];
  if (showForecast && forecastData && forecastData.length > 0 && data.length > 0) {
    const lastHistoricalTime = data[data.length - 1].timestamp.getTime();
    
    forecastData.forEach(f => {
      const forecastTime = new Date(f.timestamp).getTime();
      if (forecastTime > lastHistoricalTime) {
        forecastOnlyPoints.push({
          timestamp: forecastTime,
          time: new Date(forecastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          windForecast: f.windForecastMW,
          solarForecast: f.solarForecastMW,
          isForecastOnly: true
        });
      }
    });
  }

  const combinedChartData = [...chartData, ...forecastOnlyPoints];

  // Get all unique fuel types and their colors
  const allFuelTypes = Array.from(
    new Set(data.flatMap(point => point.fuelMix.map(fuel => fuel.fuelType)))
  );
  
  const fuelColors = data[0]?.fuelMix.reduce((acc, fuel) => {
    acc[fuel.fuelType] = fuel.color;
    return acc;
  }, {} as Record<string, string>) || {};

  // Sort fuel types by average generation (largest first)
  const sortedFuelTypes = allFuelTypes.sort((a, b) => {
    const avgA = data.reduce((sum, point) => {
      const fuel = point.fuelMix.find(f => f.fuelType === a);
      return sum + (fuel?.mw || 0);
    }, 0) / data.length;
    
    const avgB = data.reduce((sum, point) => {
      const fuel = point.fuelMix.find(f => f.fuelType === b);
      return sum + (fuel?.mw || 0);
    }, 0) / data.length;
    
    return avgB - avgA;
  });

  const formatXAxisTick = (tickItem: number) => {
    const date = new Date(tickItem);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Prepare table data for latest periods (last 12 periods = 6 hours)
  const recentData = data.slice(-12).reverse();

  // Weekly chart data  
  const weeklyChartData = weeklyData.map(point => {
    const chartPoint: any = {
      day: point.dayName || new Date(point.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
      date: point.settlementDate,
      timestamp: point.timestamp.getTime(),
      total: point.totalMW
    };
    
    // Add each fuel type as a separate property (values are MWh for daily data)
    point.fuelMix.forEach(fuel => {
      chartPoint[fuel.fuelType] = fuel.mw;
    });
    
    return chartPoint;
  });

  // Get weekly fuel types and colors
  const weeklyFuelTypes = weeklyData.length > 0 
    ? Array.from(new Set(weeklyData.flatMap(point => point.fuelMix.map(fuel => fuel.fuelType))))
    : [];
    
  const weeklyFuelColors = weeklyData[0]?.fuelMix.reduce((acc, fuel) => {
    acc[fuel.fuelType] = fuel.color;
    return acc;
  }, {} as Record<string, string>) || {};

  // Sort weekly fuel types by average generation (values are MWh)
  const sortedWeeklyFuelTypes = weeklyFuelTypes.sort((a, b) => {
    const avgA = weeklyData.reduce((sum, point) => {
      const fuel = point.fuelMix.find(f => f.fuelType === a);
      return sum + (fuel?.mw || 0);
    }, 0) / weeklyData.length;
    
    const avgB = weeklyData.reduce((sum, point) => {
      const fuel = point.fuelMix.find(f => f.fuelType === b);
      return sum + (fuel?.mw || 0);
    }, 0) / weeklyData.length;
    
    return avgB - avgA;
  });

  return (
    <Card className="glow-cyan border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle>Historical Generation</CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <Badge variant="outline" className="text-xs">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 md:px-6 pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="chart">Last 24 hours</TabsTrigger>
            <TabsTrigger value="weekly">Weekly View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="mt-4">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={combinedChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={formatXAxisTick}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}GW`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip showForecast={showForecast} />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="rect"
                  />
                  
                  {sortedFuelTypes.map((fuelType) => (
                    <Area
                      key={fuelType}
                      type="monotone"
                      dataKey={fuelType}
                      stackId="1"
                      stroke={fuelColors[fuelType]}
                      fill={fuelColors[fuelType]}
                      fillOpacity={0.8}
                      strokeWidth={1}
                    />
                  ))}

                  {/* Forecast overlay lines */}
                  {showForecast && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="windForecast"
                        stroke="hsl(var(--energy-wind))"
                        strokeWidth={2}
                        strokeDasharray="8 4"
                        dot={false}
                        name="Wind Forecast"
                        legendType="none"
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="solarForecast"
                        stroke="hsl(var(--energy-solar))"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        dot={false}
                        name="Solar Forecast"
                        legendType="none"
                        connectNulls
                      />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          

          <TabsContent value="weekly" className="mt-4">
            {weeklyError ? (
              <div className="text-center py-8">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-destructive font-medium mb-2">Weekly Data Error</p>
                  <p className="text-sm text-muted-foreground mb-4">{weeklyError}</p>
                  <button 
                    onClick={onFetchWeeklyData}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : weeklyLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Loading weekly data...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Weekly Bar Chart */}
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="day"
                        tick={{ fontSize: 12 }}
                      />
                       <YAxis 
                         tickFormatter={(value) => `${(value / 1000).toFixed(0)}GWh`}
                         tick={{ fontSize: 12 }}
                       />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ fontSize: '12px' }}
                        iconType="rect"
                      />
                      
                      {sortedWeeklyFuelTypes.map((fuelType) => (
                        <Bar
                          key={fuelType}
                          dataKey={fuelType}
                          stackId="1"
                          fill={weeklyFuelColors[fuelType]}
                          stroke={weeklyFuelColors[fuelType]}
                          strokeWidth={0.5}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Weekly Data Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Day</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Gas (GWh)</TableHead>
                        <TableHead>Nuclear (GWh)</TableHead>
                        <TableHead>Wind (GWh)</TableHead>
                        <TableHead>Solar (GWh)</TableHead>
                        <TableHead>Biomass (GWh)</TableHead>
                        <TableHead>Hydro (GWh)</TableHead>
                        <TableHead>Other (GWh)</TableHead>
                        <TableHead>Total (GWh)</TableHead>
                        <TableHead>Solar Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weeklyData.map((point, index) => {
                        const getFuelMWh = (fuelType: string) => 
                          point.fuelMix.find(f => f.fuelType === fuelType)?.mw || 0;
                        
                        const solarMWh = getFuelMWh('Solar');
                        const solarMatchedPeriods = point.solarMatchedPeriods || 0;
                        const totalPeriods = point.totalPeriods || 48;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {point.dayName || new Date(point.timestamp).toLocaleDateString('en-US', { weekday: 'short' })}
                            </TableCell>
                            <TableCell>{point.settlementDate}</TableCell>
                            <TableCell>{formatGWh(getFuelMWh('Gas') / 1000)}</TableCell>
                            <TableCell>{formatGWh(getFuelMWh('Nuclear') / 1000)}</TableCell>
                            <TableCell>{formatGWh(getFuelMWh('Wind') / 1000)}</TableCell>
                            <TableCell>{formatGWh(solarMWh / 1000)}</TableCell>
                            <TableCell>{formatGWh(getFuelMWh('Biomass') / 1000)}</TableCell>
                            <TableCell>{formatGWh((getFuelMWh('Hydro') + getFuelMWh('PSH')) / 1000)}</TableCell>
                            <TableCell>{formatGWh((getFuelMWh('Other') + getFuelMWh('Coal')) / 1000)}</TableCell>
                            <TableCell className="font-medium">{formatGWh(point.totalMW / 1000)}</TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger>
                                    <Badge 
                                      variant={solarMatchedPeriods > 24 ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {solarMatchedPeriods}/{totalPeriods}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      Solar data matched for {solarMatchedPeriods} out of {totalPeriods} settlement periods
                                    </p>
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Weekly Metadata */}
                {weeklyMeta && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Weekly Solar from PV Live (measured) • {weeklyMeta.solarMatchedDays}/{weeklyMeta.totalDays} days with matched data</p>
                    <p>PV Source: {weeklyMeta.pvSource === 'eso' ? 'ESO Open Data' : weeklyMeta.pvSource === 'sheffield' ? 'Sheffield Solar' : 'None available'}</p>
                    {weeklyLastUpdated && (
                      <p>Last updated: {weeklyLastUpdated.toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Settlement periods (30-minute intervals) • Data from BMRS + PV Live
        </div>
      </CardContent>
    </Card>
  );
};