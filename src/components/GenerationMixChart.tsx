
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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
  // Format settlement period time
  const formatSPTime = (sp: number) => {
    const startMinutes = (sp - 1) * 30;
    const hours = Math.floor(startMinutes / 60);
    const minutes = startMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
                  ))}
                </Pie>
                <Tooltip cursor={false} content={() => null} />
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
          
          {/* Generation Table */}
          <div className="flex-1 min-w-0">
            <Table>
              <TableHeader>
                <TableRow className="border-primary/20">
                  <TableHead className="text-cosmic-cyan font-semibold">Generation Type</TableHead>
                  <TableHead className="text-right text-cosmic-cyan font-semibold">Live Generation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow 
                    key={index}
                    className="border-primary/10 hover:bg-primary/5 transition-all duration-200 group"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-sm flex-shrink-0 transition-all duration-200 group-hover:scale-125 group-hover:shadow-lg"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium group-hover:text-cosmic-cyan transition-colors">
                          {item.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="space-y-0.5">
                        <div className="text-base font-bold text-cosmic-cyan group-hover:text-glow transition-all">
                          {formatGWfromMW(item.value, 2)} GW
                        </div>
                        <div className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                          {item.percentage}% of mix
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};