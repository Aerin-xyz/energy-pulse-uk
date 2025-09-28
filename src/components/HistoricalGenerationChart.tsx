import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { formatGWfromMW } from '@/lib/utils';
import { useState, useEffect } from 'react';

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
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const timestamp = new Date(label);
    const total = payload.reduce((sum: number, item: any) => sum + item.value, 0);
    
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg max-w-xs">
        <p className="text-muted-foreground text-xs mb-2">
          {timestamp.toLocaleDateString()} {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="font-bold text-sm mb-2">Total: {formatGWfromMW(total, 2)} GW</p>
        <div className="space-y-1">
          {payload
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
                  {formatGWfromMW(entry.value, 1)} GW
                </span>
              </div>
            ))}
        </div>
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
  onFetchWeeklyData 
}: HistoricalGenerationChartProps) => {
  const [activeTab, setActiveTab] = useState("chart");
  const [weeklyDataFetched, setWeeklyDataFetched] = useState(false);

  // Automatically fetch weekly data when tab is first accessed
  useEffect(() => {
    if (activeTab === "weekly" && !weeklyDataFetched && !weeklyLoading && weeklyData.length === 0) {
      onFetchWeeklyData();
      setWeeklyDataFetched(true);
    }
  }, [activeTab, weeklyDataFetched, weeklyLoading, weeklyData.length, onFetchWeeklyData]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Past 24 Hours Generation by Fuel Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No historical data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for stacked area chart
  const chartData = data.map(point => {
    const chartPoint: any = {
      timestamp: point.timestamp.getTime(),
      time: point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      total: point.totalMW
    };
    
    // Add each fuel type as a separate property
    point.fuelMix.forEach(fuel => {
      chartPoint[fuel.fuelType] = fuel.mw;
    });
    
    return chartPoint;
  });

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
      total: point.totalMW
    };
    
    // Add each fuel type as a separate property
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

  // Sort weekly fuel types by average generation
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Past 24 Hours Generation by Fuel Type</CardTitle>
          {lastUpdated && (
            <Badge variant="outline" className="text-xs">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="chart">Chart View</TabsTrigger>
            <TabsTrigger value="table">Data Table</TabsTrigger>
            <TabsTrigger value="weekly">Weekly View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="mt-4">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                  <Tooltip content={<CustomTooltip />} />
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
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="table" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Gas (GW)</TableHead>
                    <TableHead>Nuclear (GW)</TableHead>
                    <TableHead>Wind (GW)</TableHead>
                    <TableHead>Solar (GW)</TableHead>
                    <TableHead>Biomass (GW)</TableHead>
                    <TableHead>Hydro (GW)</TableHead>
                    <TableHead>Other (GW)</TableHead>
                    <TableHead>Total (GW)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentData.map((point, index) => {
                    const getFuelValue = (fuelType: string) => 
                      point.fuelMix.find(f => f.fuelType === fuelType)?.mw || 0;
                    
                    const solarMW = getFuelValue('Solar');
                    const solarMatched = point.solarMatched;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>{formatGWfromMW(getFuelValue('Gas'))}</TableCell>
                        <TableCell>{formatGWfromMW(getFuelValue('Nuclear'))}</TableCell>
                        <TableCell>{formatGWfromMW(getFuelValue('Wind'))}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{formatGWfromMW(solarMW)}</span>
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger>
                                  <div 
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      solarMatched 
                                        ? 'bg-green-500' 
                                        : 'bg-muted-foreground/40'
                                    }`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    Solar data {solarMatched ? 'matched' : 'not available'} within 45min tolerance
                                  </p>
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell>{formatGWfromMW(getFuelValue('Biomass'))}</TableCell>
                        <TableCell>{formatGWfromMW(getFuelValue('Hydro') + getFuelValue('PSH'))}</TableCell>
                        <TableCell>{formatGWfromMW(getFuelValue('Other') + getFuelValue('Coal'))}</TableCell>
                        <TableCell className="font-medium">{formatGWfromMW(point.totalMW)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {meta && (
              <div className="mt-4 text-xs text-muted-foreground space-y-1">
                <p>Solar from PV Live (measured) • {meta.solarMatchedCount}/{meta.periods} periods matched</p>
                <p>PV Source: {meta.pvSource === 'eso' ? 'ESO Open Data' : meta.pvSource === 'sheffield' ? 'Sheffield Solar' : 'None available'}</p>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger className="underline decoration-dotted">
                      <span>Tolerance: ±45 minutes from period end</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs">
                        Solar data is accepted when PV Live measurements are within 45 minutes of the settlement period end time.
                        This ensures data quality while accounting for reporting delays.
                      </p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
            )}
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
                    <BarChart data={weeklyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="day"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}GW`}
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
                        <TableHead>Gas (GW)</TableHead>
                        <TableHead>Nuclear (GW)</TableHead>
                        <TableHead>Wind (GW)</TableHead>
                        <TableHead>Solar (GW)</TableHead>
                        <TableHead>Biomass (GW)</TableHead>
                        <TableHead>Hydro (GW)</TableHead>
                        <TableHead>Other (GW)</TableHead>
                        <TableHead>Total (GW)</TableHead>
                        <TableHead>Solar Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weeklyData.map((point, index) => {
                        const getFuelValue = (fuelType: string) => 
                          point.fuelMix.find(f => f.fuelType === fuelType)?.mw || 0;
                        
                        const solarMW = getFuelValue('Solar');
                        const solarMatchedPeriods = point.solarMatchedPeriods || 0;
                        const totalPeriods = point.totalPeriods || 48;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {point.dayName || new Date(point.timestamp).toLocaleDateString('en-US', { weekday: 'short' })}
                            </TableCell>
                            <TableCell>{point.settlementDate}</TableCell>
                            <TableCell>{formatGWfromMW(getFuelValue('Gas'))}</TableCell>
                            <TableCell>{formatGWfromMW(getFuelValue('Nuclear'))}</TableCell>
                            <TableCell>{formatGWfromMW(getFuelValue('Wind'))}</TableCell>
                            <TableCell>{formatGWfromMW(solarMW)}</TableCell>
                            <TableCell>{formatGWfromMW(getFuelValue('Biomass'))}</TableCell>
                            <TableCell>{formatGWfromMW(getFuelValue('Hydro') + getFuelValue('PSH'))}</TableCell>
                            <TableCell>{formatGWfromMW(getFuelValue('Other') + getFuelValue('Coal'))}</TableCell>
                            <TableCell className="font-medium">{formatGWfromMW(point.totalMW)}</TableCell>
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