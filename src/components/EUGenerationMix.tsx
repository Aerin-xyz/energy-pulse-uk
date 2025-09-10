import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import { formatGWfromMW } from '@/lib/utils';

interface EUCountryGeneration {
  country: string;
  totalMW: number;
  fuelMix: Record<string, number>;
  timestamp: string;
}

interface EUGenerationMixProps {
  data: EUCountryGeneration[];
}

const fuelTypeColors: Record<string, string> = {
  'B01': '#10b981', // Biomass - green
  'B02': '#059669', // Lignite - dark green
  'B03': '#ef4444', // Natural Gas - red
  'B04': '#dc2626', // Hard coal - dark red
  'B05': '#f59e0b', // Nuclear - amber
  'B06': '#3b82f6', // Hydro - blue
  'B07': '#06b6d4', // Pumped Storage - cyan
  'B08': '#8b5cf6', // Geothermal - purple
  'B09': '#10b981', // Wind Offshore - green
  'B10': '#059669', // Wind Onshore - dark green
  'B11': '#fbbf24', // Solar - yellow
  'B12': '#6366f1', // Waste - indigo
  'B13': '#ec4899', // Marine - pink
  'B14': '#10b981', // Bioenergy - green
  'B15': '#ef4444', // Fossil Oil - red
  'B16': '#6b7280', // Other - gray
  'B17': '#f59e0b', // AC Link - amber
  'B18': '#f59e0b', // DC Link - amber
  'B19': '#6b7280'  // Substation - gray
};

const fuelTypeNames: Record<string, string> = {
  'B01': 'Biomass',
  'B02': 'Lignite',
  'B03': 'Natural Gas',
  'B04': 'Hard Coal',
  'B05': 'Nuclear',
  'B06': 'Hydro',
  'B07': 'Pumped Storage',
  'B08': 'Geothermal',
  'B09': 'Wind Offshore',
  'B10': 'Wind Onshore',
  'B11': 'Solar',
  'B12': 'Waste',
  'B13': 'Marine',
  'B14': 'Bioenergy',
  'B15': 'Fossil Oil',
  'B16': 'Other',
  'B17': 'AC Link',
  'B18': 'DC Link',
  'B19': 'Substation'
};

export const EUGenerationMix = ({ data }: EUGenerationMixProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6 bg-gradient-card border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-energy rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-card-foreground">EU Energy Generation Mix</h2>
              <p className="text-sm text-muted-foreground">No EU data available right now</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center">
            We’ll show EU country generation as soon as ENTSO-E responds.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort countries by total generation
  const sortedData = [...data].sort((a, b) => b.totalMW - a.totalMW);

  // Calculate EU totals
  const euTotals: Record<string, number> = {};
  let euTotalGeneration = 0;

  data.forEach(country => {
    euTotalGeneration += country.totalMW;
    Object.entries(country.fuelMix).forEach(([fuel, amount]) => {
      euTotals[fuel] = (euTotals[fuel] || 0) + amount;
    });
  });

  const sortedEuFuels = Object.entries(euTotals)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8); // Top 8 fuel types

  return (
    <Card className="p-6 bg-gradient-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-energy rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">EU Energy Generation Mix</h2>
            <p className="text-sm text-muted-foreground">Live generation data from ENTSO-E</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* EU Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-card-foreground">European Union Total</h3>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {formatGWfromMW(euTotalGeneration)} GW
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {sortedEuFuels.map(([fuelCode, amount]) => {
              const percentage = Math.round((amount / euTotalGeneration) * 100);
              return (
                <div key={fuelCode} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: fuelTypeColors[fuelCode] || '#6b7280' }}
                  />
                  <span className="text-xs font-medium text-card-foreground">
                    {fuelTypeNames[fuelCode] || fuelCode}: {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Country Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedData.slice(0, 12).map((country) => {
            const topFuels = Object.entries(country.fuelMix)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3);

            return (
              <div key={country.country} className="bg-muted/30 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-card-foreground">{country.country}</h4>
                  <Badge variant="outline" className="text-xs">
                    {formatGWfromMW(country.totalMW)} GW
                  </Badge>
                </div>
                <div className="space-y-1">
                  {topFuels.map(([fuelCode, amount]) => {
                    const percentage = Math.round((amount / country.totalMW) * 100);
                    return (
                      <div key={fuelCode} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: fuelTypeColors[fuelCode] || '#6b7280' }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {fuelTypeNames[fuelCode] || fuelCode}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-card-foreground">
                          {percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Data from ENTSO-E Transparency Platform • Updated every 5 minutes
        </div>
      </CardContent>
    </Card>
  );
};