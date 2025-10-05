import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LabelList } from 'recharts';
import { formatGWfromMW } from '@/lib/utils';
import { Leaf, Flame, Zap } from 'lucide-react';

interface GenerationData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface GenerationMixChartProps {
  data: GenerationData[];
  totalGenerationMW: number;
  dataFreshness?: {
    source?: string;
    isRealtime?: boolean;
    variant?: string;
    interconnectorStatus?: string;
    status?: string;
  };
  asOf?: {
    settlementDate?: string;
    settlementPeriod?: number;
    percentageSum?: number;
  };
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-muted-foreground text-xs">{data.name}</p>
        <p className="font-bold text-sm">{formatGWfromMW(data.value, 2)} GW</p>
        <p className="text-primary text-xs">{data.percentage}%</p>
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
  if (percentage < 5) return null; // Don't show labels for small slices
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-sm font-medium"
    >
      {`${percentage.toFixed(1)}%`}
    </text>
  );
};

export const GenerationMixChart = ({ data, totalGenerationMW, dataFreshness, asOf }: GenerationMixChartProps) => {
  // Format settlement period time
  const formatSPTime = (sp: number) => {
    const startMinutes = (sp - 1) * 30;
    const hours = Math.floor(startMinutes / 60);
    const minutes = startMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Categorize and calculate energy mix percentages
  const calculateMixSummary = () => {
    const renewables = ['Wind', 'Solar', 'Hydro', 'PSH'];
    const fossilFuels = ['Gas', 'Coal', 'Oil'];
    
    const renewablesMW = data
      .filter(item => renewables.includes(item.name))
      .reduce((sum, item) => sum + item.value, 0);
    
    const fossilMW = data
      .filter(item => fossilFuels.includes(item.name))
      .reduce((sum, item) => sum + item.value, 0);
    
    const otherMW = totalGenerationMW - renewablesMW - fossilMW;
    
    return {
      renewables: totalGenerationMW > 0 ? ((renewablesMW / totalGenerationMW) * 100).toFixed(1) : '0.0',
      fossil: totalGenerationMW > 0 ? ((fossilMW / totalGenerationMW) * 100).toFixed(1) : '0.0',
      other: totalGenerationMW > 0 ? ((otherMW / totalGenerationMW) * 100).toFixed(1) : '0.0',
    };
  };

  const mixSummary = calculateMixSummary();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>UK Energy Mix</CardTitle>
          <Badge variant={dataFreshness?.isRealtime ? "default" : "secondary"}>
            {dataFreshness?.status === "live" ? "Live" : 
             dataFreshness?.status === "live-partial" ? "Live (partial)" :
             "Delayed (LKG)"}
          </Badge>
        </div>
        {asOf?.settlementPeriod && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              As of {asOf.settlementPeriod && formatSPTime(asOf.settlementPeriod)} (SP {asOf.settlementPeriod})
              {asOf.settlementDate && ` on ${new Date(asOf.settlementDate).toLocaleDateString()}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Mix updates each settlement period (every 30 min); values may fast-follow embedded Solar
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="relative w-[400px] h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={160}
                  innerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-center space-y-1">
                <div className="text-3xl font-bold text-foreground">
                  {formatGWfromMW(totalGenerationMW + (data.find(item => item.name === "Imports")?.value || 0))} GW
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Supply
                </div>
                <div className="text-xl font-semibold text-muted-foreground mt-2">
                  {formatGWfromMW(totalGenerationMW)} GW
                </div>
                <div className="text-xs text-muted-foreground">
                  UK Generation
                </div>
              </div>
            </div>
          </div>
          
          {/* Energy Mix Summary and Legend */}
          <div className="space-y-4 lg:space-y-6">
            {/* Mix Summary Panel */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Energy Mix Summary</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm">Renewables</span>
                  </div>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">{mixSummary.renewables}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm">Fossil Fuels</span>
                  </div>
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{mixSummary.fossil}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Other</span>
                  </div>
                  <span className="text-sm font-bold text-muted-foreground">{mixSummary.other}%</span>
                </div>
              </div>
            </div>

            {/* Detailed Legend */}
            <div className="space-y-2 lg:space-y-3">
              {data.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{item.name}</span>
                    <div className="text-right">
                      <div className="text-sm font-bold">{formatGWfromMW(item.value, 2)} GW</div>
                      <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};