import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Activity } from 'lucide-react';

interface ForecastPoint {
  from: string;
  to: string;
  intensity: {
    forecast: number;
    index: string;
  };
}

interface CarbonIntensityChartProps {
  forecastData?: ForecastPoint[];
  currentIntensity: number;
}

const chartConfig = {
  intensity: {
    label: 'Carbon Intensity',
    color: 'hsl(var(--primary))',
  },
};

const getCarbonColorForValue = (value: number): string => {
  if (value < 100) return 'hsl(var(--carbon-very-low))';
  if (value < 150) return 'hsl(var(--carbon-low))';
  if (value < 200) return 'hsl(var(--carbon-moderate))';
  if (value < 250) return 'hsl(var(--carbon-high))';
  return 'hsl(var(--carbon-very-high))';
};

export const CarbonIntensityChart = ({ forecastData, currentIntensity }: CarbonIntensityChartProps) => {
  if (!forecastData || forecastData.length === 0) {
    return null;
  }

  // Transform forecast data for chart
  const chartData = forecastData.slice(0, 48).map((point) => ({
    time: new Date(point.from).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: point.from,
    intensity: point.intensity.forecast,
    index: point.intensity.index,
  }));

  // Get next 24 hours (48 half-hourly periods)
  const next24Hours = chartData.slice(0, 48);

  // Calculate average
  const avgIntensity = next24Hours.reduce((sum, d) => sum + d.intensity, 0) / next24Hours.length;
  const GB_AVERAGE = 233;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-energy rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle>Carbon Intensity Forecast</CardTitle>
            <CardDescription>Next 24 hours - half-hourly forecast</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="24h" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="24h">Next 24 Hours</TabsTrigger>
            <TabsTrigger value="48h">Next 48 Hours</TabsTrigger>
          </TabsList>

          <TabsContent value="24h" className="space-y-4">
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={next24Hours}>
                  <defs>
                    <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="time"
                    className="text-xs"
                    interval={5}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'gCO₂/kWh', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <ReferenceLine 
                    y={GB_AVERAGE} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                    label={{ value: 'GB Avg', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ReferenceLine
                    y={currentIntensity}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    label={{ value: 'Now', fill: 'hsl(var(--primary))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="intensity"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorIntensity)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>

            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-muted-foreground">Current</div>
                <div className="text-lg font-bold" style={{ color: getCarbonColorForValue(currentIntensity) }}>
                  {currentIntensity} g
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">24h Average</div>
                <div className="text-lg font-bold text-foreground">
                  {avgIntensity.toFixed(0)} g
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">GB Average</div>
                <div className="text-lg font-bold text-muted-foreground">
                  {GB_AVERAGE} g
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="48h" className="space-y-4">
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIntensity48" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="time"
                    className="text-xs"
                    interval={11}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'gCO₂/kWh', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <ReferenceLine 
                    y={GB_AVERAGE} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                    label={{ value: 'GB Avg', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="intensity"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorIntensity48)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
