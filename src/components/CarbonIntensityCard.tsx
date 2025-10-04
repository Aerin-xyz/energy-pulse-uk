import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Leaf, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarbonIntensityCardProps {
  actual: number;
  forecast: number;
  index: string;
  timestamp: string;
  percentOfAverage: number;
}

const getCarbonColor = (index: string): string => {
  switch (index.toLowerCase()) {
    case 'very low':
      return 'text-carbon-very-low';
    case 'low':
      return 'text-carbon-low';
    case 'moderate':
      return 'text-carbon-moderate';
    case 'high':
      return 'text-carbon-high';
    case 'very high':
      return 'text-carbon-very-high';
    default:
      return 'text-muted-foreground';
  }
};

const getCarbonBadgeVariant = (index: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (index.toLowerCase()) {
    case 'very low':
    case 'low':
      return 'default';
    case 'moderate':
      return 'secondary';
    case 'high':
    case 'very high':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getProgressColor = (index: string): string => {
  switch (index.toLowerCase()) {
    case 'very low':
      return 'bg-carbon-very-low';
    case 'low':
      return 'bg-carbon-low';
    case 'moderate':
      return 'bg-carbon-moderate';
    case 'high':
      return 'bg-carbon-high';
    case 'very high':
      return 'bg-carbon-very-high';
    default:
      return 'bg-muted';
  }
};

// Map intensity to 0-100 scale (0-500 gCO2/kWh range)
const getProgressValue = (actual: number): number => {
  return Math.min((actual / 500) * 100, 100);
};

export const CarbonIntensityCard = ({
  actual,
  forecast,
  index,
  timestamp,
  percentOfAverage
}: CarbonIntensityCardProps) => {
  const isLow = percentOfAverage < 0;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-energy rounded-lg">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Carbon Intensity</CardTitle>
              <CardDescription>Grid emissions in real-time</CardDescription>
            </div>
          </div>
          <Badge variant={getCarbonBadgeVariant(index)} className="capitalize">
            {index}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Intensity Display */}
        <div className="text-center space-y-2">
          <div className="text-5xl font-bold">
            <span className={getCarbonColor(index)}>{actual}</span>
            <span className="text-2xl text-muted-foreground ml-2">gCO₂/kWh</span>
          </div>
          
          {/* Progress Bar */}
          <div className="relative">
            <Progress 
              value={getProgressValue(actual)} 
              className="h-3"
            />
            <div 
              className={cn(
                "absolute top-0 left-0 h-3 rounded-full transition-all",
                getProgressColor(index)
              )}
              style={{ width: `${getProgressValue(actual)}%` }}
            />
          </div>
        </div>

        {/* Comparison to Average */}
        <div className="flex items-center justify-center gap-2 text-sm">
          {isLow ? (
            <TrendingDown className="w-4 h-4 text-carbon-low" />
          ) : (
            <TrendingUp className="w-4 h-4 text-carbon-high" />
          )}
          <span className={cn(
            "font-semibold",
            isLow ? "text-carbon-low" : "text-carbon-high"
          )}>
            {Math.abs(percentOfAverage).toFixed(0)}% {isLow ? 'below' : 'above'} GB average
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Current</div>
            <div className="text-lg font-bold text-foreground">{actual} g</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Forecast</div>
            <div className="text-lg font-bold text-foreground">{forecast} g</div>
          </div>
        </div>

        {/* Environmental Context */}
        {isLow && actual < 150 && (
          <div className="bg-carbon-low/10 border border-carbon-low/20 rounded-lg p-3 text-sm">
            <p className="text-carbon-low font-medium">⚡ Great time to use electricity!</p>
            <p className="text-muted-foreground text-xs mt-1">
              Low carbon intensity - ideal for charging EVs or running high-energy appliances.
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          Last updated: {new Date(timestamp).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};
