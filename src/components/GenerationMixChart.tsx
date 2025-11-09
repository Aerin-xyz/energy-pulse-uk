import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatGWfromMW } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

const generationTypeInfo: Record<string, {
  description: string;
  dataSource: string;
  updateFrequency: string;
  interestingFact: string;
}> = {
  "Wind": {
    description: "Electricity generated from onshore and offshore wind turbines across the UK.",
    dataSource: "Elexon BMRS B1620 (Actual Generation Output by Fuel Type) via our Supabase Edge Function",
    updateFrequency: "Updated every 5 minutes during high-frequency updates",
    interestingFact: "Wind can account for over 50% of UK electricity generation on particularly windy days!"
  },
  "Solar": {
    description: "Electricity generated from photovoltaic solar panels, primarily from solar farms and rooftop installations.",
    dataSource: "Sheffield Solar PV_Live API via Supabase Edge Function (embedded generation estimate)",
    updateFrequency: "Updated every 5 minutes during high-frequency updates",
    interestingFact: "Solar generation peaks during summer months and can exceed 9 GW on sunny days!"
  },
  "Gas": {
    description: "Natural gas-fired power stations, providing flexible generation to balance supply and demand.",
    dataSource: "Elexon BMRS B1620 (Actual Generation Output by Fuel Type)",
    updateFrequency: "Updated every 30 minutes (per settlement period)",
    interestingFact: "Gas plants can ramp up quickly to fill gaps when wind and solar generation drops."
  },
  "Nuclear": {
    description: "Nuclear power stations providing consistent baseload electricity with zero carbon emissions.",
    dataSource: "Elexon BMRS B1620 (Actual Generation Output by Fuel Type)",
    updateFrequency: "Updated every 30 minutes (per settlement period)",
    interestingFact: "UK nuclear plants run at ~80-90% capacity year-round, providing reliable baseload power."
  },
  "Biomass": {
    description: "Renewable energy from burning organic materials like wood pellets and agricultural waste.",
    dataSource: "Elexon BMRS B1620 (Actual Generation Output by Fuel Type)",
    updateFrequency: "Updated every 30 minutes (per settlement period)",
    interestingFact: "The UK's largest biomass plant is Drax in Yorkshire, which converted from coal to biomass."
  },
  "Hydro": {
    description: "Electricity generated from water flow through dams and pumped storage facilities.",
    dataSource: "Elexon BMRS B1620 (Actual Generation Output by Fuel Type)",
    updateFrequency: "Updated every 30 minutes (per settlement period)",
    interestingFact: "Pumped storage hydro can go from zero to full power in less than 30 seconds!"
  },
  "Coal": {
    description: "Coal-fired power stations (now being phased out as part of UK's net-zero commitment).",
    dataSource: "Elexon BMRS B1620 (Actual Generation Output by Fuel Type)",
    updateFrequency: "Updated every 30 minutes (per settlement period)",
    interestingFact: "The UK plans to phase out all coal power by October 2024, ending 140+ years of coal generation."
  },
  "Imports": {
    description: "Electricity imported from neighboring countries via undersea interconnector cables.",
    dataSource: "Elexon BMRS PHYBMDATA (Physical Data) via Supabase Edge Function",
    updateFrequency: "Updated every 15 minutes during mid-frequency updates",
    interestingFact: "The UK is connected to France, Belgium, Netherlands, Norway, and Ireland via interconnectors!"
  },
  "Other": {
    description: "Other generation sources including oil, pumped storage discharge, and miscellaneous renewables.",
    dataSource: "Elexon BMRS B1620 (Actual Generation Output by Fuel Type)",
    updateFrequency: "Updated every 30 minutes (per settlement period)",
    interestingFact: "This category often includes backup generators and smaller renewable sources not tracked separately."
  }
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (name: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

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
                {data.map((item, index) => {
                  const isExpanded = expandedRows.has(item.name);
                  const info = generationTypeInfo[item.name];
                  
                  return (
                    <Collapsible 
                      key={index}
                      open={isExpanded}
                      onOpenChange={() => toggleRow(item.name)}
                    >
                      {/* Main row - clickable trigger */}
                      <TableRow 
                        className="border-primary/10 hover:bg-primary/5 transition-all duration-200 group cursor-pointer"
                      >
                        <CollapsibleTrigger asChild>
                          <TableCell className="py-3" colSpan={2}>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-3 h-3 rounded-sm flex-shrink-0 transition-all duration-200 group-hover:scale-125 group-hover:shadow-lg"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-sm font-medium group-hover:text-cosmic-cyan transition-colors">
                                  {item.name}
                                </span>
                                {info && (
                                  isExpanded ? 
                                    <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-cosmic-cyan transition-colors ml-2" /> :
                                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-cosmic-cyan transition-colors ml-2" />
                                )}
                              </div>
                              <div className="space-y-0.5 text-right">
                                <div className="text-base font-bold text-cosmic-cyan group-hover:text-glow transition-all">
                                  {formatGWfromMW(item.value, 2)} GW
                                </div>
                                <div className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                  {item.percentage}% of mix
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </CollapsibleTrigger>
                      </TableRow>

                      {/* Expandable content row */}
                      {info && (
                        <CollapsibleContent asChild>
                          <TableRow className="border-primary/10 bg-primary/5">
                            <TableCell colSpan={2} className="py-4 px-6">
                              <div className="space-y-3 text-sm animate-accordion-down">
                                {/* Description */}
                                <div>
                                  <p className="text-muted-foreground leading-relaxed">
                                    {info.description}
                                  </p>
                                </div>
                                
                                {/* Data source */}
                                <div className="grid grid-cols-[120px_1fr] gap-2">
                                  <span className="font-semibold text-cosmic-cyan">Data Source:</span>
                                  <span className="text-muted-foreground">{info.dataSource}</span>
                                </div>
                                
                                {/* Update frequency */}
                                <div className="grid grid-cols-[120px_1fr] gap-2">
                                  <span className="font-semibold text-cosmic-cyan">Update Freq:</span>
                                  <span className="text-muted-foreground">{info.updateFrequency}</span>
                                </div>
                                
                                {/* Interesting fact */}
                                <div className="pt-2 border-t border-primary/20">
                                  <p className="text-xs italic text-primary/80">
                                    💡 {info.interestingFact}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};