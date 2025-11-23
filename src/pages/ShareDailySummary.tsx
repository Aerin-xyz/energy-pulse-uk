import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DailySummaryCard } from '@/components/share/DailySummaryCard';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';

interface FuelMixItem {
  fuelType: string;
  percentage: number;
  color: string;
}

interface DailySummary {
  date: string;
  carbonIntensity: number;
  lowCarbonPercent: number;
  renewablesPercent: number;
  mixBreakdown: FuelMixItem[];
}

// Fuel type color mapping using design system colors
const FUEL_COLORS: Record<string, string> = {
  'Wind': 'hsl(168 42% 59%)',
  'Solar': 'hsl(40 92% 58%)',
  'Gas': 'hsl(6 87% 59%)',
  'Nuclear': 'hsl(260 54% 74%)',
  'Imports': 'hsl(0 0% 84%)',
  'Biomass': 'hsl(150 40% 70%)',
  'Hydro': 'hsl(212 28% 53%)',
  'Coal': 'hsl(35 22% 82%)',
  'Other': 'hsl(220 20% 50%)',
};

const ShareDailySummary = () => {
  const [searchParams] = useSearchParams();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDailySummary = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get target date (default to yesterday in Europe/London)
        let targetDate = searchParams.get('date');
        if (!targetDate) {
          const now = new Date();
          const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
          londonTime.setDate(londonTime.getDate() - 1);
          targetDate = londonTime.toISOString().split('T')[0];
        }

        // Fetch historical data for the target date (24h period)
        const { data: response, error: fetchError } = await supabase.functions.invoke(
          'historical-generation',
          {
            body: { 
              period: '24h',
              date: targetDate
            }
          }
        );

        if (fetchError) throw new Error(fetchError.message);
        if (response.error) throw new Error(response.error);

        const historicalData = response.data || [];
        
        if (historicalData.length === 0) {
          throw new Error('No data available for this date');
        }

        // Calculate daily averages
        const fuelTotals: Record<string, { mw: number; count: number }> = {};
        let totalMW = 0;
        let totalCO2 = 0;
        let co2Count = 0;

        historicalData.forEach((period: any) => {
          totalMW += period.totalMW || 0;
          
          // Aggregate fuel mix
          period.fuelMix?.forEach((fuel: any) => {
            if (!fuelTotals[fuel.fuelType]) {
              fuelTotals[fuel.fuelType] = { mw: 0, count: 0 };
            }
            fuelTotals[fuel.fuelType].mw += fuel.mw || 0;
            fuelTotals[fuel.fuelType].count += 1;
          });
        });

        // Calculate percentages and create mix breakdown
        const avgTotalMW = totalMW / historicalData.length;
        const mixBreakdown: FuelMixItem[] = Object.entries(fuelTotals).map(([fuelType, data]) => {
          const avgMW = data.mw / data.count;
          const percentage = (avgMW / avgTotalMW) * 100;
          return {
            fuelType,
            percentage,
            color: FUEL_COLORS[fuelType] || FUEL_COLORS['Other'],
          };
        });

        // Calculate low carbon % (everything except Gas and Coal)
        const lowCarbonFuels = ['Wind', 'Solar', 'Nuclear', 'Hydro', 'Biomass'];
        const lowCarbonPercent = mixBreakdown
          .filter(item => lowCarbonFuels.includes(item.fuelType))
          .reduce((sum, item) => sum + item.percentage, 0);

        // Calculate renewables % (Wind, Solar, Hydro, Biomass)
        const renewableFuels = ['Wind', 'Solar', 'Hydro', 'Biomass'];
        const renewablesPercent = mixBreakdown
          .filter(item => renewableFuels.includes(item.fuelType))
          .reduce((sum, item) => sum + item.percentage, 0);

        // Estimate carbon intensity (simplified calculation)
        // This is a rough estimate based on typical emissions factors
        const emissionFactors: Record<string, number> = {
          'Gas': 400,
          'Coal': 900,
          'Biomass': 120,
          'Wind': 0,
          'Solar': 0,
          'Nuclear': 0,
          'Hydro': 0,
          'Imports': 200, // Average estimate
          'Other': 300,
        };
        
        const carbonIntensity = Math.round(
          mixBreakdown.reduce((sum, item) => {
            const factor = emissionFactors[item.fuelType] || 200;
            return sum + (factor * item.percentage / 100);
          }, 0)
        );

        setSummary({
          date: targetDate,
          carbonIntensity,
          lowCarbonPercent,
          renewablesPercent,
          mixBreakdown,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        console.error('Error fetching daily summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDailySummary();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-[1200px] h-[630px] border-2">
          <CardContent className="h-full flex items-center justify-center">
            <div className="text-2xl text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-[1200px] h-[630px] border-2">
          <CardContent className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground mb-4">
                No data available
              </div>
              <div className="text-xl text-muted-foreground">
                {error || 'No data available for this date'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <DailySummaryCard
        date={summary.date}
        carbonIntensity={summary.carbonIntensity}
        lowCarbonPercent={summary.lowCarbonPercent}
        renewablesPercent={summary.renewablesPercent}
        mixBreakdown={summary.mixBreakdown}
      />
    </div>
  );
};

export default ShareDailySummary;
