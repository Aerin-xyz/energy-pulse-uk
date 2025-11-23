import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import energyMixLogo from '@/assets/energy-mix-logo.png';

interface FuelMixItem {
  fuelType: string;
  percentage: number;
  color: string;
}

interface DailySummaryCardProps {
  date: string; // YYYY-MM-DD
  carbonIntensity: number; // gCO2/kWh
  lowCarbonPercent: number;
  renewablesPercent: number;
  mixBreakdown: FuelMixItem[];
}

export function DailySummaryCard({
  date,
  carbonIntensity,
  lowCarbonPercent,
  renewablesPercent,
  mixBreakdown,
}: DailySummaryCardProps) {
  // Format date as "Fri 14 Nov 2025"
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00Z'); // Use noon to avoid timezone issues
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Sort mix by percentage descending
  const sortedMix = [...mixBreakdown].sort((a, b) => b.percentage - a.percentage);

  return (
    <Card className="w-[1200px] h-[630px] border-2 border-border/50 shadow-2xl relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-cosmic opacity-90" />
      <div className="absolute inset-0 bg-gradient-nebula" />
      
      <CardContent className="relative h-full flex flex-col justify-between p-12">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-5xl font-bold text-foreground mb-2">
              UK Energy Mix
            </h1>
            <p className="text-2xl text-muted-foreground">
              {formatDate(date)}
            </p>
          </div>
          <img 
            src={energyMixLogo} 
            alt="Energy Mix" 
            className="h-16 w-16 object-contain opacity-90"
          />
        </div>

        {/* Main metrics */}
        <div className="grid grid-cols-3 gap-8 my-8">
          <div className="text-center">
            <div className="text-6xl font-bold text-primary mb-2">
              {carbonIntensity}
            </div>
            <div className="text-xl text-muted-foreground">
              gCO₂/kWh
            </div>
          </div>
          <div className="text-center">
            <div className="text-6xl font-bold text-energy-wind mb-2">
              {lowCarbonPercent.toFixed(1)}%
            </div>
            <div className="text-xl text-muted-foreground">
              Low Carbon
            </div>
          </div>
          <div className="text-center">
            <div className="text-6xl font-bold text-energy-solar mb-2">
              {renewablesPercent.toFixed(1)}%
            </div>
            <div className="text-xl text-muted-foreground">
              Renewables
            </div>
          </div>
        </div>

        <Separator className="my-6 bg-border/50" />

        {/* Generation mix bars */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Generation Sources
          </h2>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3">
            {sortedMix.slice(0, 8).map((item) => (
              <div key={item.fuelType} className="flex items-center gap-4">
                <div className="w-32 text-right text-lg text-muted-foreground">
                  {item.fuelType}
                </div>
                <div className="flex-1 h-8 bg-muted/30 rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-3">
                    <span className="text-sm font-semibold text-foreground/90 drop-shadow-md">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-8">
          <div className="text-muted-foreground text-lg">
            energymix.info
          </div>
          <div className="text-muted-foreground text-sm">
            Daily average • UK electricity generation
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
