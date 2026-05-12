import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, formatGWfromMW } from '@/lib/utils';
import { ArrowDownUp, Factory, Flame, Info, Leaf, PlugZap, RadioTower, Sun, Wind, Zap } from 'lucide-react';

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

type FlowNode = {
  key: string;
  label: string;
  valueMW: number;
  color: string;
  icon: typeof Wind;
  x: number;
  y: number;
  path: string;
  description: string;
};

const sourceMeta: Record<string, { color: string; icon: typeof Wind; label: string; description: string }> = {
  Wind: { color: '#5dd6c0', icon: Wind, label: 'Wind', description: 'Onshore and offshore wind generation.' },
  Solar: { color: '#f7bf3f', icon: Sun, label: 'Solar', description: 'Embedded and grid-connected solar generation.' },
  Gas: { color: '#f45b69', icon: Flame, label: 'Gas', description: 'Flexible gas-fired generation balancing the system.' },
  Nuclear: { color: '#b692ff', icon: RadioTower, label: 'Nuclear', description: 'Low-carbon nuclear generation.' },
  Biomass: { color: '#8fe3b0', icon: Leaf, label: 'Biomass', description: 'Biomass and other bioenergy generation.' },
  Hydro: { color: '#7ca7d8', icon: PlugZap, label: 'Hydro', description: 'Hydro and pumped-storage output.' },
  Other: { color: '#c8d0dc', icon: Factory, label: 'Other', description: 'Other measured generation and storage.' },
};

const formatTime = (iso?: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getGenerationValue = (mix: GenerationData[], names: string[]) =>
  mix
    .filter((item) => names.some((name) => item.name.toLowerCase().includes(name.toLowerCase())))
    .reduce((sum, item) => sum + Math.max(0, item.value || 0), 0);

const FlowLine = ({ node, maxMW }: { node: FlowNode; maxMW: number }) => {
  const width = Math.max(2.5, Math.min(11, 2.5 + (node.valueMW / Math.max(maxMW, 1)) * 8));
  const duration = Math.max(1.8, 5.8 - (node.valueMW / Math.max(maxMW, 1)) * 3.2);

  return (
    <g className={node.valueMW <= 1 ? 'opacity-25' : undefined}>
      <path d={node.path} fill="none" stroke="rgba(148, 163, 184, 0.16)" strokeWidth={width + 5} strokeLinecap="round" />
      <path d={node.path} fill="none" stroke={node.color} strokeWidth={width} strokeLinecap="round" opacity="0.62" />
      <path
        d={node.path}
        fill="none"
        stroke={node.color}
        strokeWidth={Math.max(2, width * 0.45)}
        strokeLinecap="round"
        strokeDasharray="1 24"
        className="power-flow-pulse"
        style={{ animationDuration: `${duration}s` }}
      />
    </g>
  );
};

const FlowNodeBadge = ({ node, maxMW }: { node: FlowNode; maxMW: number }) => {
  const Icon = node.icon;
  const scale = 0.92 + Math.min(0.18, node.valueMW / Math.max(maxMW, 1) * 0.18);

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${node.x}%`, top: `${node.y}%`, transform: `translate(-50%, -50%) scale(${scale})` }}
      title={`${node.label}: ${formatGWfromMW(node.valueMW)} GW`}
    >
      <div className="relative rounded-2xl border border-white/10 bg-background/80 px-3 py-2 shadow-xl backdrop-blur-md min-w-[88px]">
        <div className="absolute inset-0 rounded-2xl opacity-20 blur-lg" style={{ backgroundColor: node.color }} />
        <div className="relative flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${node.color}22`, color: node.color }}>
            <Icon className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-xs font-medium text-foreground/90">{node.label}</span>
            <span className="block font-mono text-sm font-bold" style={{ color: node.color }}>{formatGWfromMW(node.valueMW)} GW</span>
          </span>
        </div>
      </div>
    </div>
  );
};

const carbonClass = (index?: string) => {
  const lower = index?.toLowerCase() || '';
  if (lower.includes('very low') || lower === 'low') return 'bg-carbon-low text-background';
  if (lower.includes('moderate')) return 'bg-carbon-moderate text-background';
  return 'bg-carbon-high text-white';
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

  const { nodes, transferMW, transferLabel, transferColor, maxMW, lowCarbonShare } = useMemo(() => {
    const wind = getGenerationValue(generationMix, ['Wind']);
    const solar = getGenerationValue(generationMix, ['Solar']);
    const gas = getGenerationValue(generationMix, ['Gas']);
    const nuclear = getGenerationValue(generationMix, ['Nuclear']);
    const biomass = getGenerationValue(generationMix, ['Biomass']);
    const hydro = getGenerationValue(generationMix, ['Hydro', 'PSH', 'Pumped Storage']);
    const named = wind + solar + gas + nuclear + biomass + hydro;
    const other = Math.max(0, totalGenerationMW - named);
    const netTransfer = interconnectors.reduce((sum, item) => sum + (item.flow || 0), 0);
    const importing = netTransfer >= 0;
    const transfer = Math.abs(netTransfer);
    const max = Math.max(wind, solar, gas, nuclear, biomass, hydro, other, transfer, totalDemandMW, 1);
    const lowCarbon = wind + solar + nuclear + biomass + hydro;

    const flowNodes: FlowNode[] = [
      { key: 'wind', label: sourceMeta.Wind.label, valueMW: wind, color: sourceMeta.Wind.color, icon: sourceMeta.Wind.icon, x: 17, y: 20, path: 'M 140 110 C 230 120, 300 180, 400 250', description: sourceMeta.Wind.description },
      { key: 'solar', label: sourceMeta.Solar.label, valueMW: solar, color: sourceMeta.Solar.color, icon: sourceMeta.Solar.icon, x: 83, y: 20, path: 'M 660 110 C 570 120, 500 180, 400 250', description: sourceMeta.Solar.description },
      { key: 'gas', label: sourceMeta.Gas.label, valueMW: gas, color: sourceMeta.Gas.color, icon: sourceMeta.Gas.icon, x: 15, y: 76, path: 'M 130 390 C 230 370, 300 320, 400 250', description: sourceMeta.Gas.description },
      { key: 'nuclear', label: sourceMeta.Nuclear.label, valueMW: nuclear, color: sourceMeta.Nuclear.color, icon: sourceMeta.Nuclear.icon, x: 85, y: 76, path: 'M 670 390 C 570 370, 500 320, 400 250', description: sourceMeta.Nuclear.description },
      { key: 'biomass', label: sourceMeta.Biomass.label, valueMW: biomass, color: sourceMeta.Biomass.color, icon: sourceMeta.Biomass.icon, x: 33, y: 88, path: 'M 265 450 C 310 395, 355 320, 400 250', description: sourceMeta.Biomass.description },
      { key: 'hydro', label: sourceMeta.Hydro.label, valueMW: hydro, color: sourceMeta.Hydro.color, icon: sourceMeta.Hydro.icon, x: 67, y: 88, path: 'M 535 450 C 490 395, 445 320, 400 250', description: sourceMeta.Hydro.description },
      { key: 'other', label: sourceMeta.Other.label, valueMW: other, color: sourceMeta.Other.color, icon: sourceMeta.Other.icon, x: 50, y: 93, path: 'M 400 465 C 400 390, 400 320, 400 250', description: sourceMeta.Other.description },
    ];

    if (transfer > 1) {
      flowNodes.push({
        key: 'transfer',
        label: importing ? 'Imports' : 'Exports',
        valueMW: transfer,
        color: importing ? '#67e8f9' : '#fb7185',
        icon: ArrowDownUp,
        x: importing ? 50 : 50,
        y: importing ? 7 : 7,
        path: importing ? 'M 400 42 C 400 95, 400 155, 400 250' : 'M 400 250 C 400 180, 400 110, 400 42',
        description: importing ? 'Net electricity flowing into Great Britain via interconnectors.' : 'Net electricity flowing out of Great Britain via interconnectors.',
      });
    }

    return {
      nodes: flowNodes.filter((node) => node.valueMW > 1),
      transferMW: transfer,
      transferLabel: importing ? 'Net importing' : 'Net exporting',
      transferColor: importing ? 'text-cosmic-cyan' : 'text-energy-gas',
      maxMW: max,
      lowCarbonShare: totalGenerationMW ? (lowCarbon / totalGenerationMW) * 100 : 0,
    };
  }, [generationMix, interconnectors, totalDemandMW, totalGenerationMW]);

  const sourceTime = formatTime(sourceTimestamp);

  return (
    <Card id="power-flow" className="relative scroll-mt-28 overflow-hidden border-primary/30 bg-card/70 shadow-2xl shadow-primary/10">
      <div className="absolute inset-0 bg-gradient-glow opacity-60" />
      <CardHeader className="relative z-10 pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary">Experimental visual</Badge>
              {carbonIntensity && <Badge className={cn('border-0', carbonClass(carbonIntensity.index))}>{carbonIntensity.index}</Badge>}
            </div>
            <CardTitle className="text-2xl md:text-3xl text-glow">GB Power Flow</CardTitle>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              A live, simplified view of where Great Britain’s electricity is coming from and how it balances against demand.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="self-start text-cosmic-cyan hover:text-primary">
            <Info className="mr-2 h-4 w-4" /> How it works
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative z-10">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="relative min-h-[520px] overflow-hidden rounded-2xl border border-primary/15 bg-background/45 p-3 md:min-h-[560px]">
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
            <svg viewBox="0 0 800 500" className="absolute inset-0 h-full w-full" role="img" aria-label="Animated GB electricity power flow">
              <defs>
                <radialGradient id="demandGlow" cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor="rgba(28,222,228,0.32)" />
                  <stop offset="100%" stopColor="rgba(28,222,228,0)" />
                </radialGradient>
              </defs>
              <circle cx="400" cy="250" r="122" fill="url(#demandGlow)" />
              {nodes.map((node) => <FlowLine key={node.key} node={node} maxMW={maxMW} />)}
            </svg>

            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <div className="rounded-[2rem] border border-primary/30 bg-background/85 px-6 py-5 text-center shadow-2xl shadow-primary/20 backdrop-blur-md min-w-[190px]">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">GB demand</p>
                <p className="mt-1 font-mono text-3xl font-bold text-primary text-glow">{formatGWfromMW(totalDemandMW)} GW</p>
                <p className="mt-1 text-xs text-muted-foreground">generation {formatGWfromMW(totalGenerationMW)} GW</p>
              </div>
            </div>

            {nodes.map((node) => <FlowNodeBadge key={node.key} node={node} maxMW={maxMW} />)}
          </div>

          <aside className="space-y-3 rounded-2xl border border-primary/15 bg-background/35 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Snapshot</p>
              <h3 className="mt-1 text-lg font-semibold">Today at {sourceTime || 'latest update'}</h3>
              {settlementPeriod && <p className="text-xs text-muted-foreground">Settlement period {settlementPeriod}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-muted-foreground">Low-carbon</p>
                <p className="font-mono text-xl font-bold text-green-300">{lowCarbonShare.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-muted-foreground">Transfers</p>
                <p className={cn('font-mono text-xl font-bold', transferColor)}>{formatGWfromMW(transferMW)} GW</p>
                <p className="text-[11px] text-muted-foreground">{transferLabel}</p>
              </div>
            </div>
            <div className="space-y-2">
              {nodes
                .slice()
                .sort((a, b) => b.valueMW - a.valueMW)
                .slice(0, 6)
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
            <p className="text-xs leading-relaxed text-muted-foreground">
              Line thickness and dot speed scale with live MW. This is a conceptual flow visualisation, not a physical map of the grid.
            </p>
          </aside>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-primary/20 bg-card text-card-foreground sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Power Flow</DialogTitle>
            <DialogDescription className="text-left leading-relaxed text-foreground/75">
              GB electricity Power Flow brings generation, demand and interconnector transfer data into a single live visualisation. It is not intended to be a schematic of the grid; it shows where generation is being sourced, where transfers in or out are taking place, and how this relates to resulting GB demand.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-foreground/80">
            <p>
              The chart uses the same public data feeds as the live dashboard. Individual flows are grouped into major categories and animated according to their current MW contribution.
            </p>
            <p>
              Supported by National Energy SO Open Data. Contains BMRS data © Elexon Limited copyright and database right 2026. Inspired by flixlix’s Power Flow Card Plus for Home Assistant.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
