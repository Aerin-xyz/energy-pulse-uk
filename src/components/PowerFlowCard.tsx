import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, formatGWfromMW } from '@/lib/utils';
import { ArrowLeft, ArrowRight, CircleHelp, Factory, Flame, Home, Info, Leaf, RadioTower, Sun, Waves, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/*
  EnergyMix deterministic Power Flow layout

  Reference constants ported from Power Flow Card Plus:
  - shared/src/style/index.ts: --size-circle-entity: 79.99px, .circle 80x80, stroke 2px,
    .row max-width 500px, .card-content/.row max-width around 470-500px, line SVG behind nodes.
  - power-flow-card-plus.ts render tree: top row, middle row with grid/spacer/home, bottom row, then flowElement.
  - home.ts: home circle contains usage/ring; home label is hidden when surrounding entities crowd layout.
  - grid.ts: grid/transfer circle can display two-way consumption + return values.
  - flows/*.ts: animated dots follow the same SVG path as the visible line.

  This React component keeps those layout rules but maps them to EnergyMix data.
*/

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

const POWER_FLOW_LAYOUT = {
  viewBox: { width: 500, height: 430 },
  node: {
    diameter: 80,
    radius: 40,
    demandRadius: 46,
    strokeWidth: 2,
    iconSize: 22,
    valueFontSize: 17,
    unitFontSize: 10,
    labelFontSize: 13,
    labelGap: 14,
  },
  rows: {
    top: 70,
    middle: 215,
    bottom: 355,
  },
  cols: {
    left: 80,
    centre: 250,
    right: 420,
  },
  minLabelGap: 14,
  minNodeGap: 28,
} as const;

type Point = { x: number; y: number };
type Slot = 'wind' | 'solar' | 'nuclear' | 'transfers' | 'demand' | 'hydro' | 'gas' | 'biomass' | 'other';

type FlowNode = {
  id: Slot;
  label: string;
  valueMW: number;
  color: string;
  icon: LucideIcon;
  point: Point;
  muted?: boolean;
  importMW?: number;
  exportMW?: number;
  demand?: boolean;
};

type FlowLine = {
  id: string;
  from: Point;
  to: Point;
  valueMW: number;
  color: string;
  reverse?: boolean;
  muted?: boolean;
  curve?: number;
};

const isDebugFlowLayout = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugFlowLayout') === '1';

const valueFor = (mix: GenerationData[], names: string[]) =>
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

const nodePoint = (col: keyof typeof POWER_FLOW_LAYOUT.cols, row: keyof typeof POWER_FLOW_LAYOUT.rows): Point => ({
  x: POWER_FLOW_LAYOUT.cols[col],
  y: POWER_FLOW_LAYOUT.rows[row],
});

const edgePoint = (from: Point, to: Point, radius = POWER_FLOW_LAYOUT.node.radius + 2): Point => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: from.x + (dx / length) * radius,
    y: from.y + (dy / length) * radius,
  };
};

const flowPath = (from: Point, to: Point, curve = 0) => {
  const start = edgePoint(from, to);
  const end = edgePoint(to, from, POWER_FLOW_LAYOUT.node.demandRadius + 2);
  if (!curve) return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = midX + (-dy / len) * curve;
  const cy = midY + (dx / len) * curve;
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
};

const flowDuration = (valueMW: number, maxMW: number) => {
  const ratio = Math.min(1, valueMW / Math.max(maxMW, 1));
  return Math.max(1.8, 6 - ratio * 3.2);
};

const iconPathClass = 'pointer-events-none';

const SvgIcon = ({ icon: Icon, x, y, size, className }: { icon: LucideIcon; x: number; y: number; size: number; className?: string }) => (
  <g transform={`translate(${x - size / 2} ${y - size / 2})`} className={className}>
    <Icon width={size} height={size} strokeWidth={2.2} className={iconPathClass} />
  </g>
);

const FlowNodeSvg = ({ node }: { node: FlowNode }) => {
  const layout = POWER_FLOW_LAYOUT.node;
  const radius = node.demand ? layout.demandRadius : layout.radius;
  const value = formatGWfromMW(node.valueMW);
  const labelY = node.point.y + radius + layout.labelGap + layout.labelFontSize * 0.72;

  return (
    <g className={cn('flow-node-group', `flow-node-group-${node.id}`, node.muted && 'is-muted')} transform={`translate(${node.point.x} ${node.point.y})`}>
      <circle r={radius} className={cn('flow-node', `flow-node-${node.id}`, 'flow-node-circle')} data-node-id={node.id} style={{ stroke: node.color }} />
      {node.demand && (
        <circle r={layout.demandRadius - 4} className="flow-demand-ring" />
      )}
      <SvgIcon icon={node.icon} x={0} y={node.demand ? -18 : -20} size={node.demand ? 20 : layout.iconSize} className="flow-node-icon" />
      {node.id === 'transfers' ? (
        <g className="flow-transfer-values">
          <text y="-2" className="flow-transfer-import"><tspan>→ </tspan>{formatGWfromMW(node.importMW || 0)}</text>
          <text y="15" className="flow-transfer-export"><tspan>← </tspan>{formatGWfromMW(node.exportMW || 0)}</text>
        </g>
      ) : node.demand ? (
        <>
          <text y="3" className="flow-node-value flow-demand-value">{value}</text>
          <text y="20" className="flow-node-unit">GW</text>
          <text y="34" className="flow-demand-caption">Demand</text>
        </>
      ) : (
        <>
          <text y="7" className="flow-node-value">{value}</text>
          <text y="23" className="flow-node-unit">GW</text>
        </>
      )}
      {!node.demand && (
        <text className="flow-label" x="0" y={labelY - node.point.y}>{node.label}</text>
      )}
    </g>
  );
};

const FlowLines = ({ lines, maxMW }: { lines: FlowLine[]; maxMW: number }) => (
  <g className="flow-lines">
    {lines.map((line) => {
      const path = flowPath(line.from, line.to, line.curve || 0);
      const width = Math.max(1.25, Math.min(4, 1.25 + (line.valueMW / Math.max(maxMW, 1)) * 2.7));
      const duration = flowDuration(line.valueMW, maxMW);
      return (
        <g key={line.id} className={cn('flow-line-group', line.muted && 'is-muted')}>
          <path d={path} className="flow-line-track" strokeWidth={width + 2.2} />
          <path id={`flow-path-${line.id}`} d={path} className="flow-line" stroke={line.color} strokeWidth={width} />
          {!line.muted && line.valueMW > 1 && (
            <circle r="1.55" fill={line.color} className="flow-dot">
              <animateMotion dur={`${duration}s`} repeatCount="indefinite" calcMode="paced" keyPoints={line.reverse ? '1;0' : undefined} keyTimes={line.reverse ? '0;1' : undefined}>
                <mpath href={`#flow-path-${line.id}`} />
              </animateMotion>
            </circle>
          )}
        </g>
      );
    })}
  </g>
);

const DebugOverlay = () => {
  const { width, height } = POWER_FLOW_LAYOUT.viewBox;
  const { left, centre, right } = POWER_FLOW_LAYOUT.cols;
  const { top, middle, bottom } = POWER_FLOW_LAYOUT.rows;
  return (
    <g className="flow-debug-overlay">
      <rect x="0" y="0" width={width} height={height} />
      {[left, centre, right].map((x) => <line key={`col-${x}`} x1={x} y1="0" x2={x} y2={height} />)}
      {[top, middle, bottom].map((y) => <line key={`row-${y}`} x1="0" y1={y} x2={width} y2={y} />)}
      {[left, centre, right].flatMap((x) => [top, middle, bottom].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />))}
    </g>
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
  const debug = isDebugFlowLayout();

  const model = useMemo(() => {
    const wind = valueFor(generationMix, ['Wind']);
    const solar = valueFor(generationMix, ['Solar']);
    const gas = valueFor(generationMix, ['Gas']);
    const nuclear = valueFor(generationMix, ['Nuclear']);
    const hydro = valueFor(generationMix, ['Hydro', 'PSH', 'Pumped Storage']);
    const biomass = valueFor(generationMix, ['Biomass']);
    const importsCategory = valueFor(generationMix, ['Imports']);
    const importMW = Math.max(
      importsCategory,
      interconnectors.filter((item) => (item.flow || 0) > 0).reduce((sum, item) => sum + (item.flow || 0), 0)
    );
    const exportMW = interconnectors.filter((item) => (item.flow || 0) < 0).reduce((sum, item) => sum + Math.abs(item.flow || 0), 0);
    const transferMW = Math.max(importMW, exportMW);
    const named = wind + solar + gas + nuclear + hydro + biomass + importsCategory;
    const other = Math.max(0, totalGenerationMW - named);
    const lowCarbon = wind + solar + nuclear + hydro + biomass;

    const points = {
      wind: nodePoint('left', 'top'),
      solar: nodePoint('centre', 'top'),
      nuclear: nodePoint('right', 'top'),
      transfers: nodePoint('left', 'middle'),
      demand: nodePoint('centre', 'middle'),
      hydro: nodePoint('right', 'middle'),
      gas: nodePoint('left', 'bottom'),
      biomass: nodePoint('centre', 'bottom'),
      other: nodePoint('right', 'bottom'),
    } satisfies Record<Slot, Point>;

    const baseNodes: FlowNode[] = [
      { id: 'wind', label: 'Wind', valueMW: wind, color: '#5dd6c0', icon: Wind, point: points.wind },
      { id: 'solar', label: 'Solar', valueMW: solar, color: '#f5bd41', icon: Sun, point: points.solar },
      { id: 'nuclear', label: 'Nuclear', valueMW: nuclear, color: '#aa86ff', icon: RadioTower, point: points.nuclear },
      { id: 'transfers', label: 'Transfers', valueMW: transferMW, color: transferMW === exportMW && exportMW > importMW ? '#fb7185' : '#67e8f9', icon: transferMW === exportMW && exportMW > importMW ? ArrowLeft : ArrowRight, point: points.transfers, importMW, exportMW },
      { id: 'demand', label: 'Demand', valueMW: totalDemandMW, color: '#1cdee4', icon: Home, point: points.demand, demand: true },
      { id: 'hydro', label: 'Hydro', valueMW: hydro, color: '#7ca7d8', icon: Waves, point: points.hydro },
      { id: 'gas', label: 'Gas', valueMW: gas, color: '#f45b69', icon: Flame, point: points.gas },
      { id: 'biomass', label: 'Biomass', valueMW: biomass, color: '#8fe3b0', icon: Leaf, point: points.biomass },
      { id: 'other', label: 'Other', valueMW: other, color: '#c8d0dc', icon: Factory, point: points.other },
    ];
    const nodes: FlowNode[] = baseNodes.map((node) => ({ ...node, muted: !node.demand && node.valueMW <= 1 }));

    const maxMW = Math.max(wind, solar, gas, nuclear, hydro, biomass, other, transferMW, totalDemandMW, 1);
    const demand = points.demand;
    const lines: FlowLine[] = [
      { id: 'wind-demand', from: points.wind, to: demand, valueMW: wind, color: '#5dd6c0', curve: -10 },
      { id: 'solar-demand', from: points.solar, to: demand, valueMW: solar, color: '#f5bd41' },
      { id: 'nuclear-demand', from: points.nuclear, to: demand, valueMW: nuclear, color: '#aa86ff', curve: 10 },
      { id: 'imports-demand', from: points.transfers, to: demand, valueMW: importMW, color: '#67e8f9', curve: -6 },
      { id: 'exports-demand', from: points.transfers, to: demand, valueMW: exportMW, color: '#fb7185', reverse: true, curve: 6 },
      { id: 'hydro-demand', from: points.hydro, to: demand, valueMW: hydro, color: '#7ca7d8' },
      { id: 'gas-demand', from: points.gas, to: demand, valueMW: gas, color: '#f45b69', curve: 10 },
      { id: 'biomass-demand', from: points.biomass, to: demand, valueMW: biomass, color: '#8fe3b0' },
      { id: 'other-demand', from: points.other, to: demand, valueMW: other, color: '#c8d0dc', curve: -10 },
    ].map((line) => ({ ...line, muted: line.valueMW <= 1 }));

    return {
      nodes,
      lines,
      maxMW,
      transferMW,
      importMW,
      exportMW,
      lowCarbonShare: totalGenerationMW ? (lowCarbon / totalGenerationMW) * 100 : 0,
    };
  }, [generationMix, interconnectors, totalDemandMW, totalGenerationMW]);

  const sourceTime = formatTime(sourceTimestamp);
  const { width, height } = POWER_FLOW_LAYOUT.viewBox;

  return (
    <Card id="power-flow" className="relative scroll-mt-28 overflow-hidden rounded-2xl border-primary/20 bg-card/65 shadow-xl shadow-primary/5">
      <div className="absolute inset-0 bg-gradient-glow opacity-35" />
      <CardHeader className="relative z-10 px-3 pb-2 pt-3 sm:px-6 sm:pb-3 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-primary">Live</Badge>
              {carbonIntensity && <Badge className={cn('border-0 px-2 py-0.5 text-[10px]', carbonClass(carbonIntensity.index))}>{carbonIntensity.index}</Badge>}
            </div>
            <CardTitle className="text-xl text-glow sm:text-2xl md:text-3xl">Live power flow</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="h-9 shrink-0 px-2 text-xs text-muted-foreground hover:text-primary sm:px-3">
            <Info className="mr-1.5 h-3.5 w-3.5" /> Notes
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 px-3 pb-4 pt-0 sm:px-6 sm:pb-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-5">
          <div className="em-pfc-card" data-reference="power-flow-card-plus">
            <svg className={cn('em-flow-stage', debug && 'is-debug')} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Live GB electricity power flow diagram">
              {debug && <DebugOverlay />}
              <FlowLines lines={model.lines} maxMW={model.maxMW} />
              <g className="flow-nodes">
                {model.nodes.map((node) => <FlowNodeSvg key={node.id} node={node} />)}
              </g>
            </svg>
          </div>

          <aside className="em-pfc-snapshot space-y-3 rounded-2xl border border-primary/15 bg-background/35 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Snapshot</p>
              <h3 className="mt-1 text-lg font-semibold">{sourceTime || 'Latest update'}</h3>
              {settlementPeriod && <p className="text-xs text-muted-foreground">Settlement period {settlementPeriod}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-muted-foreground">Low-carbon</p>
                <p className="font-mono text-xl font-bold text-green-300">{model.lowCarbonShare.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-muted-foreground">Transfers</p>
                <p className="font-mono text-xl font-bold text-cosmic-cyan">{formatGWfromMW(model.transferMW)} GW</p>
                <p className="text-[11px] text-muted-foreground">imports {formatGWfromMW(model.importMW)} · exports {formatGWfromMW(model.exportMW)}</p>
              </div>
            </div>
            <div className="space-y-2">
              {model.nodes
                .filter((node) => node.id !== 'demand')
                .slice()
                .sort((a, b) => b.valueMW - a.valueMW)
                .slice(0, 7)
                .map((node) => (
                  <div key={node.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
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
              Live generation, demand and interconnector flows are shown as a simplified system view, not a physical grid map.
            </p>
          </aside>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-primary/20 bg-card text-card-foreground sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Reference implementation used</DialogTitle>
            <DialogDescription className="text-left leading-relaxed text-foreground/75">
              The visual spacing is based on Power Flow Card Plus: fixed 80px circular nodes, 470–500px row width, lines behind nodes, and hidden centre/home labels when surrounding entities make the layout crowded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-foreground/80">
            <p>EnergyMix maps Home to GB demand, Grid to imports/exports, and surrounding nodes to wind, solar, nuclear, hydro, gas, biomass and other generation.</p>
            <p>Supported by National Energy SO Open Data. Contains BMRS data © Elexon Limited copyright and database right 2026.</p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
