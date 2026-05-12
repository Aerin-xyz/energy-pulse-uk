import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, formatGWfromMW } from '@/lib/utils';
import { ArrowLeftRight, CircleHelp, Factory, Flame, Info, Leaf, RadioTower, Sun, Waves, Wind, Zap } from 'lucide-react';

interface GenerationData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface InterconnectorData {
  name: string;
  country: string;
  flow: number;
  capacity: number;
}

interface PowerFlowCardProps {
  generationMix: GenerationData[];
  interconnectors: InterconnectorData[];
  totalDemandMW: number;
  totalGenerationMW: number;
  carbonIntensity?: {
    actual: number;
    index: string;
  };
  settlementPeriod?: number;
  sourceTimestamp?: string | null;
}

type SourceNode = {
  key: string;
  label: string;
  valueMW: number;
  color: string;
  icon: typeof Wind;
  className: string;
  path: string;
  pathId: string;
  direction?: 'forward' | 'reverse';
};

const getGenerationValue = (mix: GenerationData[], names: string[]) =>
  mix
    .filter((item) => names.some((name) => item.name.toLowerCase().includes(name.toLowerCase())))
    .reduce((sum, item) => sum + Math.max(0, item.value || 0), 0);

const formatTime = (iso?: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const carbonClass = (index?: string) => {
  const lower = index?.toLowerCase() || '';
  if (lower.includes('very low') || lower === 'low') return 'bg-carbon-low text-background';
  if (lower.includes('moderate')) return 'bg-carbon-moderate text-background';
  return 'bg-carbon-high text-white';
};

const flowDuration = (valueMW: number, maxMW: number) => {
  const ratio = Math.min(1, valueMW / Math.max(maxMW, 1));
  return Math.max(1.2, 5.8 - ratio * 3.9);
};

const FlowPath = ({ node, maxMW }: { node: SourceNode; maxMW: number }) => {
  const width = Math.max(1.4, Math.min(4.2, 1.4 + (node.valueMW / Math.max(maxMW, 1)) * 3.2));
  const duration = flowDuration(node.valueMW, maxMW);

  return (
    <g className={node.valueMW <= 1 ? 'opacity-20' : undefined}>
      <path d={node.path} stroke="rgba(148,163,184,0.22)" strokeWidth={width + 2.6} strokeLinecap="round" fill="none" />
      <path id={node.pathId} d={node.path} stroke={node.color} strokeWidth={width} strokeLinecap="round" fill="none" opacity="0.82" />
      {node.valueMW > 1 && (
        <circle r="3.2" fill={node.color} className="power-flow-dot">
          <animateMotion dur={`${duration}s`} repeatCount="indefinite" calcMode="paced" keyPoints={node.direction === 'reverse' ? '1;0' : undefined} keyTimes={node.direction === 'reverse' ? '0;1' : undefined}>
            <mpath href={`#${node.pathId}`} />
          </animateMotion>
        </circle>
      )}
    </g>
  );
};

const NodeCircle = ({ node }: { node: SourceNode }) => {
  const Icon = node.icon;
  return (
    <div className={cn('pf-node', node.className)} style={{ '--node-color': node.color } as React.CSSProperties}>
      <div className="pf-circle">
        <Icon className="pf-icon" />
        <span className="pf-value">{formatGWfromMW(node.valueMW)}</span>
        <span className="pf-unit">GW</span>
      </div>
      <span className="pf-label">{node.label}</span>
    </div>
  );
};

export const PowerFlowCard = ({
  generationMix,
  interconnectors,
  totalDemandMW,
  totalGenerationMW,
  carbonIntensity,
  settlementPeriod,
  sourceTimestamp,
}: PowerFlowCardProps) => {
  const [open, setOpen] = useState(false);

  const { nodes, lowCarbonShare, transferMW, transferLabel, maxMW, demandSources } = useMemo(() => {
    const wind = getGenerationValue(generationMix, ['Wind']);
    const solar = getGenerationValue(generationMix, ['Solar']);
    const gas = getGenerationValue(generationMix, ['Gas']);
    const nuclear = getGenerationValue(generationMix, ['Nuclear']);
    const hydro = getGenerationValue(generationMix, ['Hydro', 'PSH', 'Pumped Storage']);
    const biomass = getGenerationValue(generationMix, ['Biomass']);
    const named = wind + solar + gas + nuclear + hydro + biomass;
    const other = Math.max(0, totalGenerationMW - named);
    const netTransfer = interconnectors.reduce((sum, item) => sum + (item.flow || 0), 0);
    const importing = netTransfer >= 0;
    const transfer = Math.abs(netTransfer);
    const lowCarbon = wind + solar + nuclear + hydro + biomass;
    const max = Math.max(wind, solar, gas, nuclear, hydro, biomass, other, transfer, totalDemandMW, 1);

    const sourceNodes: SourceNode[] = [
      {
        key: 'wind',
        label: 'Wind',
        valueMW: wind,
        color: '#5dd6c0',
        icon: Wind,
        className: 'pf-wind',
        pathId: 'pf-wind-flow',
        path: 'M 78 116 C 134 116, 150 148, 202 190',
      },
      {
        key: 'solar',
        label: 'Solar',
        valueMW: solar,
        color: '#f5bd41',
        icon: Sun,
        className: 'pf-solar',
        pathId: 'pf-solar-flow',
        path: 'M 235 76 C 235 124, 220 154, 202 190',
      },
      {
        key: 'transfer',
        label: importing ? 'Imports' : 'Exports',
        valueMW: transfer,
        color: importing ? '#67e8f9' : '#fb7185',
        icon: ArrowLeftRight,
        className: 'pf-grid',
        pathId: 'pf-grid-flow',
        path: 'M 70 225 H 178',
        direction: importing ? 'forward' as const : 'reverse' as const,
      },
      {
        key: 'nuclear',
        label: 'Nuclear',
        valueMW: nuclear,
        color: '#aa86ff',
        icon: RadioTower,
        className: 'pf-nuclear',
        pathId: 'pf-nuclear-flow',
        path: 'M 392 116 C 334 116, 312 150, 266 190',
      },
      {
        key: 'hydro',
        label: 'Hydro',
        valueMW: hydro,
        color: '#7ca7d8',
        icon: Waves,
        className: 'pf-hydro',
        pathId: 'pf-hydro-flow',
        path: 'M 395 252 C 340 252, 312 236, 286 225',
      },
      {
        key: 'gas',
        label: 'Gas',
        valueMW: gas,
        color: '#f45b69',
        icon: Flame,
        className: 'pf-gas',
        pathId: 'pf-gas-flow',
        path: 'M 235 371 C 235 316, 220 286, 202 260',
      },
      {
        key: 'biomass',
        label: 'Biomass',
        valueMW: biomass,
        color: '#8fe3b0',
        icon: Leaf,
        className: 'pf-biomass',
        pathId: 'pf-biomass-flow',
        path: 'M 78 342 C 132 332, 154 294, 184 260',
      },
      {
        key: 'other',
        label: 'Other',
        valueMW: other,
        color: '#c8d0dc',
        icon: Factory,
        className: 'pf-other',
        pathId: 'pf-other-flow',
        path: 'M 392 342 C 338 332, 316 294, 286 260',
      },
    ].filter((node) => node.valueMW > 1);

    return {
      nodes: sourceNodes,
      lowCarbonShare: totalGenerationMW ? (lowCarbon / totalGenerationMW) * 100 : 0,
      transferMW: transfer,
      transferLabel: importing ? 'importing' : 'exporting',
      maxMW: max,
      demandSources: { wind, solar, gas, nuclear, hydro, biomass, other },
    };
  }, [generationMix, interconnectors, totalDemandMW, totalGenerationMW]);

  const sourceTime = formatTime(sourceTimestamp);
  const circumference = 238.76;
  const slices = [
    { key: 'wind', value: demandSources.wind, color: '#5dd6c0' },
    { key: 'solar', value: demandSources.solar, color: '#f5bd41' },
    { key: 'nuclear', value: demandSources.nuclear, color: '#aa86ff' },
    { key: 'gas', value: demandSources.gas, color: '#f45b69' },
    { key: 'other', value: demandSources.hydro + demandSources.biomass + demandSources.other, color: '#c8d0dc' },
  ];
  let ringOffset = 0;

  return (
    <Card id="power-flow" className="relative scroll-mt-28 overflow-hidden border-primary/30 bg-card/70 shadow-2xl shadow-primary/10">
      <div className="absolute inset-0 bg-gradient-glow opacity-50" />
      <CardHeader className="relative z-10 pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary">Live power flow</Badge>
              {carbonIntensity && <Badge className={cn('border-0', carbonClass(carbonIntensity.index))}>{carbonIntensity.index}</Badge>}
            </div>
            <CardTitle className="text-2xl md:text-3xl text-glow">GB Power Flow</CardTitle>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              A Home Assistant-style flow card rebuilt for Great Britain’s live electricity mix.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="self-start text-cosmic-cyan hover:text-primary">
            <Info className="mr-2 h-4 w-4" /> How it works
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative z-10">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="pf-shell">
            <svg className="pf-lines" viewBox="0 0 470 410" role="img" aria-label="Live GB power flow lines">
              {nodes.map((node) => <FlowPath key={node.key} node={node} maxMW={maxMW} />)}
            </svg>

            {nodes.map((node) => <NodeCircle key={node.key} node={node} />)}

            <div className="pf-home">
              <div className="pf-home-circle">
                <svg className="pf-home-ring" viewBox="0 0 84 84">
                  {slices.map((slice) => {
                    const len = totalGenerationMW ? Math.max(0, (slice.value / totalGenerationMW) * circumference) : 0;
                    const dashOffset = -ringOffset;
                    ringOffset += len;
                    return (
                      <circle
                        key={slice.key}
                        cx="42"
                        cy="42"
                        r="38"
                        stroke={slice.color}
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${len} ${circumference - len}`}
                        strokeDashoffset={dashOffset}
                        opacity="0.9"
                      />
                    );
                  })}
                </svg>
                <Zap className="pf-home-icon" />
                <span className="pf-home-value">{formatGWfromMW(totalDemandMW)}</span>
                <span className="pf-home-unit">GW</span>
              </div>
              <span className="pf-home-label">GB demand</span>
              <span className="pf-home-sub">generation {formatGWfromMW(totalGenerationMW)} GW</span>
            </div>
          </div>

          <aside className="space-y-3 rounded-2xl border border-primary/15 bg-background/35 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Snapshot</p>
              <h3 className="mt-1 text-lg font-semibold">{sourceTime || 'Latest update'}</h3>
              {settlementPeriod && <p className="text-xs text-muted-foreground">Settlement period {settlementPeriod}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-muted-foreground">Low-carbon</p>
                <p className="font-mono text-xl font-bold text-green-300">{lowCarbonShare.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-muted-foreground">Transfers</p>
                <p className="font-mono text-xl font-bold text-cosmic-cyan">{formatGWfromMW(transferMW)} GW</p>
                <p className="text-[11px] text-muted-foreground">net {transferLabel}</p>
              </div>
            </div>
            <div className="space-y-2">
              {nodes
                .slice()
                .sort((a, b) => b.valueMW - a.valueMW)
                .slice(0, 7)
                .map((node) => (
                  <div key={node.key} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: node.color }} />
                      <span className="text-sm">{node.label}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold">{formatGWfromMW(node.valueMW)} GW</span>
                  </div>
                ))}
            </div>
            <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Dots follow the same pattern as Power Flow Card Plus: active lines animate towards demand; export flow reverses direction.
            </p>
          </aside>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-primary/20 bg-card text-card-foreground sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>How this Power Flow card works</DialogTitle>
            <DialogDescription className="text-left leading-relaxed text-foreground/75">
              This version follows the structure of flixlix’s public Power Flow Card Plus: circular entities, labelled values, animated dots on SVG flow paths and a segmented demand circle. It is rebuilt natively in React for EnergyMix.info and mapped to GB grid categories rather than Home Assistant entities.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-foreground/80">
            <p>
              Mapped data: home = GB demand, grid = net interconnector imports/exports, solar = GB solar, and additional source circles represent wind, gas, nuclear, hydro, biomass and other generation.
            </p>
            <p>
              Supported by National Energy SO Open Data. Contains BMRS data © Elexon Limited copyright and database right 2026. Visual pattern inspired by flixlix/power-flow-card-plus.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
