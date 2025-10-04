import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { TrendingDown, Leaf } from 'lucide-react';

interface GenerationData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface CarbonGenerationCorrelationProps {
  generationMix: GenerationData[];
  carbonIntensity: number;
}

// Carbon intensity factors (gCO2/kWh) for each fuel type
const CARBON_FACTORS: Record<string, number> = {
  'Coal': 820,
  'Gas': 490,
  'Biomass': 120,
  'Nuclear': 12,
  'Hydro': 24,
  'Wind': 11,
  'LV Wind': 11,
  'Solar': 45,
  'Other': 300,
};

const getCarbonImpact = (fuelType: string, mw: number): number => {
  const factor = CARBON_FACTORS[fuelType] || 0;
  return (factor * mw) / 1000; // Convert to tonnes CO2/hour
};

export const CarbonGenerationCorrelation = ({ 
  generationMix, 
  carbonIntensity 
}: CarbonGenerationCorrelationProps) => {
  // Calculate carbon impact for each source
  const correlationData = generationMix
    .map(source => ({
      name: source.name,
      generation: source.value,
      carbonFactor: CARBON_FACTORS[source.name] || 0,
      carbonImpact: getCarbonImpact(source.name, source.value),
      percentage: source.percentage,
      color: source.color,
    }))
    .sort((a, b) => b.carbonImpact - a.carbonImpact);

  const totalCarbonImpact = correlationData.reduce((sum, d) => sum + d.carbonImpact, 0);
  const totalGeneration = correlationData.reduce((sum, d) => sum + d.generation, 0);

  // Identify cleanest sources
  const cleanSources = correlationData.filter(d => d.carbonFactor < 100);
  const cleanPercentage = cleanSources.reduce((sum, d) => sum + d.percentage, 0);

  const chartConfig = {
    carbonImpact: {
      label: 'Carbon Impact (tCO₂/h)',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-energy rounded-lg">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle>Generation Mix Carbon Impact</CardTitle>
            <CardDescription>How each energy source affects carbon intensity</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-carbon-low">{cleanPercentage.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Clean Energy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{carbonIntensity}</div>
            <div className="text-xs text-muted-foreground">gCO₂/kWh</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">{totalCarbonImpact.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">tCO₂/hour</div>
          </div>
        </div>

        {/* Bar Chart */}
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={correlationData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Carbon Impact (tCO₂/hour)', position: 'insideBottom', offset: -5, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                type="category"
                dataKey="name"
                className="text-xs"
                width={80}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold text-foreground">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Generation: {data.generation.toFixed(0)} MW ({data.percentage}%)
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Factor: {data.carbonFactor} gCO₂/kWh
                        </p>
                        <p className="text-sm font-semibold text-primary">
                          Impact: {data.carbonImpact.toFixed(1)} tCO₂/h
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="carbonImpact" radius={[0, 4, 4, 0]}>
                {correlationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Clean Energy Highlight */}
        {cleanPercentage > 50 && (
          <div className="bg-carbon-low/10 border border-carbon-low/20 rounded-lg p-3 flex items-start gap-2">
            <Leaf className="w-5 h-5 text-carbon-low flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-carbon-low font-medium">Excellent clean energy mix!</p>
              <p className="text-muted-foreground text-xs mt-1">
                {cleanPercentage.toFixed(0)}% of electricity is from low-carbon sources (nuclear, renewables).
              </p>
            </div>
          </div>
        )}

        {/* Carbon Factor Legend */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-semibold">Carbon Intensity Factors (gCO₂/kWh):</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(CARBON_FACTORS)
              .sort((a, b) => b[1] - a[1])
              .map(([fuel, factor]) => (
                <div key={fuel} className="flex justify-between">
                  <span>{fuel}:</span>
                  <span className="font-mono">{factor}</span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
