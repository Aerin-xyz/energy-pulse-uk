import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LabelList } from 'recharts';
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

export const GenerationMixChart = ({ data, totalGenerationMW }: GenerationMixChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>UK Generation Mix</CardTitle>
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
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">
                  {formatGWfromMW(totalGenerationMW)}
                </div>
                <div className="text-xs text-muted-foreground">
                  GW
                </div>
              </div>
            </div>
          </div>
          
          {/* Legend */}
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
      </CardContent>
    </Card>
  );
};