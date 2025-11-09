import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { formatGWfromMW } from '@/lib/utils';

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
      <div className="glass-morphism border-primary/30 rounded-lg p-3 shadow-lg glow-cyan">
        <p className="text-muted-foreground text-xs">{data.name}</p>
        <p className="font-bold text-sm text-cosmic-cyan">{formatGWfromMW(data.value, 2)} GW</p>
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
      textAnchor="middle" 
      dominantBaseline="central"
      className="text-sm font-medium"
    >
      {`${percentage.toFixed(1)}%`}
    </text>
  );
};

export const GenerationMixChart = ({ data, totalGenerationMW, dataFreshness, asOf }: GenerationMixChartProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Format settlement period time
  const formatSPTime = (sp: number) => {
    const startMinutes = (sp - 1) * 30;
    const hours = Math.floor(startMinutes / 60);
    const minutes = startMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 20}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    );
  };


  return (
    <Card className="glow-cyan border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>UK Energy Mix</CardTitle>
          <Badge variant={dataFreshness?.isRealtime ? "default" : "secondary"}>
            {dataFreshness?.status === "live" || dataFreshness?.status === "live-partial" ? "Live" : "Delayed (LKG)"}
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
              <PieChart style={{ outline: 'none' }}>
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
                  activeIndex={activeIndex !== null ? activeIndex : undefined}
                  activeShape={renderActiveShape}
                  onClick={(_, index) => setActiveIndex(activeIndex === index ? null : index)}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-center space-y-1">
                <div className="text-3xl font-bold text-cosmic-cyan text-glow">
                  {formatGWfromMW(totalGenerationMW + (data.find(item => item.name === "Imports")?.value || 0))} GW
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Supply
                </div>
                <div className="text-xl font-semibold text-primary mt-2">
                  {formatGWfromMW(totalGenerationMW)} GW
                </div>
                <div className="text-xs text-muted-foreground">
                  UK Generation
                </div>
              </div>
            </div>
          </div>
          
          {/* Detailed Legend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2 lg:gap-y-3">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm truncate">{item.name}</span>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold">{formatGWfromMW(item.value, 2)} GW</div>
                      <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};