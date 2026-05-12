import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, formatGWfromMW } from '@/lib/utils';
import { ArrowLeft, ArrowRight, CircleHelp, Factory, Flame, Home, Info, Leaf, RadioTower, Sun, Waves, Wind } from 'lucide-react';

/*
  EnergyMix Power Flow Card

  Reference files inspected and used as the design authority:
  - flixlix-cards/packages/flixlix-cards/power-flow-card-plus/src/power-flow-card-plus.ts
    Defines the card render tree: ha-card > card-content, top/middle/bottom rows, circular entity components and flowElement.
  - flixlix-cards/packages/shared/src/components/{solar,grid,battery,home,non-fossil}.ts
    Defines entity circle markup, labels, icons, values and the segmented home/demand ring.
  - flixlix-cards/packages/shared/src/components/flows/*.ts
    Defines SVG flow paths plus animateMotion dots.
  - flixlix-cards/packages/shared/src/style/index.ts and style/all.ts
    Defines circle sizing, row layout, line positioning, colours and dynamic CSS variables.
  - flixlix-cards/packages/shared/src/utils/{compute-power-distribution,compute-flow-rate,show-line,style-line}.ts
    Defines source-to-home flow calculations, animation speed and zero-line behaviour.

  This is a production-safe React port, not a direct import: the original depends on Lit,
  Home Assistant custom elements, Lovelace config, hass state objects and ha-icon/ha-ripple.
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

type FlowNode = {
  id: string;
  label: string;
  valueMW: number;
  color: string;
  icon: typeof Wind;
  row: 'top' | 'middle' | 'bottom';
  slot: 'left' | 'centre' | 'right';
  flowPath: string;
  reverse?: boolean;
  muted?: boolean;
  importMW?: number;
  exportMW?: number;
};

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

const flowDuration = (valueMW: number, maxMW: number) => {
  const ratio = Math.min(1, valueMW / Math.max(maxMW, 1));
  return Math.max(1.25, 5.5 - ratio * 3.5);
};

const EnergyCircle = ({ node }: { node: FlowNode }) => {
  const Icon = node.icon;
  return (
    <div className={cn('em-pfc-circle-container', node.muted && 'opacity-45')} style={{ '--em-pfc-color': node.color } as React.CSSProperties}>
      <div className="em-pfc-circle">
        <Icon className="em-pfc-icon" />
        {node.id === 'transfers' ? (
          <span className="em-pfc-transfer-values">
            <span className="em-pfc-transfer-line em-pfc-import"><ArrowRight className="em-pfc-mini-arrow" />{formatGWfromMW(node.importMW || 0)}</span>
            <span className="em-pfc-transfer-line em-pfc-export"><ArrowLeft className="em-pfc-mini-arrow" />{formatGWfromMW(node.exportMW || 0)}</span>
          </span>
        ) : (
          <>
            <span className="em-pfc-value">{formatGWfromMW(node.valueMW)}</span>
            <span className="em-pfc-unit">GW</span>
          </>
        )}
      </div>
      <span className="em-pfc-label">{node.label}</span>
    </div>
  );
};

const Spacer = () => <div className="em-pfc-spacer" aria-hidden="true" />;

const FlowSvg = ({ nodes, maxMW }: { nodes: FlowNode[]; maxMW: number }) => (
  <svg className="em-pfc-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {nodes.map((node) => {
      const width = Math.max(1.1, Math.min(3.8, 1.1 + (node.valueMW / Math.max(maxMW, 1)) * 3));
      const duration = flowDuration(node.valueMW, maxMW);
      return (
        <g key={node.id} opacity={node.muted ? 0.28 : 1}>
          <path d={node.flowPath} stroke="rgba(148,163,184,0.28)" strokeWidth={width + 1.8} strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
          <path id={`em-pfc-flow-${node.id}`} d={node.flowPath} stroke={node.color} strokeWidth={width} strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
          {!node.muted && node.valueMW > 1 && (
            <circle r="1.4" fill={node.color} className="em-pfc-dot" vectorEffect="non-scaling-stroke">
              <animateMotion dur={`${duration}s`} repeatCount="indefinite" calcMode="paced" keyPoints={node.reverse ? '1;0' : undefined} keyTimes={node.reverse ? '0;1' : undefined}>
                <mpath href={`#em-pfc-flow-${node.id}`} />
              </animateMotion>
            </circle>
          )}
        </g>
      );
    })}
  </svg>
);

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
    const netTransfer = importMW - exportMW;
    const transferMW = Math.max(importMW, exportMW, Math.abs(netTransfer));
    const exporting = exportMW > importMW;
    const named = wind + solar + gas + nuclear + hydro + biomass + importsCategory;
    const other = Math.max(0, totalGenerationMW - named);
    const lowCarbon = wind + solar + nuclear + hydro + biomass;
    const maxMW = Math.max(wind, solar, gas, nuclear, hydro, biomass, other, transferMW, totalDemandMW, 1);

    const baseNodes: Omit<FlowNode, 'muted'>[] = [
      { id: 'wind', label: 'Wind', valueMW: wind, color: '#5dd6c0', icon: Wind, row: 'top', slot: 'left', flowPath: 'M 17 25 C 30 25, 36 43, 50 50' },
      { id: 'solar', label: 'Solar', valueMW: solar, color: '#f5bd41', icon: Sun, row: 'top', slot: 'centre', flowPath: 'M 50 16 C 50 30, 50 40, 50 50' },
      { id: 'nuclear', label: 'Nuclear', valueMW: nuclear, color: '#aa86ff', icon: RadioTower, row: 'top', slot: 'right', flowPath: 'M 83 25 C 70 25, 64 43, 50 50' },
      { id: 'transfers', label: 'Transfers', valueMW: transferMW, color: exporting ? '#fb7185' : '#67e8f9', icon: exporting ? ArrowLeft : ArrowRight, row: 'middle', slot: 'left', flowPath: 'M 17 50 H 50', reverse: exporting, importMW, exportMW },
      { id: 'hydro', label: 'Hydro', valueMW: hydro, color: '#7ca7d8', icon: Waves, row: 'middle', slot: 'right', flowPath: 'M 83 50 H 50' },
      { id: 'gas', label: 'Gas', valueMW: gas, color: '#f45b69', icon: Flame, row: 'bottom', slot: 'centre', flowPath: 'M 50 84 C 50 70, 50 60, 50 50' },
      { id: 'biomass', label: 'Biomass', valueMW: biomass, color: '#8fe3b0', icon: Leaf, row: 'bottom', slot: 'left', flowPath: 'M 17 78 C 30 78, 36 57, 50 50' },
      { id: 'other', label: 'Other', valueMW: other, color: '#c8d0dc', icon: Factory, row: 'bottom', slot: 'right', flowPath: 'M 83 78 C 70 78, 64 57, 50 50' },
    ];
    const nodes: FlowNode[] = baseNodes.map((node) => ({ ...node, muted: node.valueMW <= 1 }));
    const flowNodes: FlowNode[] = [
      ...nodes.filter((node) => node.id !== 'transfers'),
      { ...nodes.find((node) => node.id === 'transfers')!, id: 'imports-flow', label: 'Imports', valueMW: importMW, color: '#67e8f9', flowPath: 'M 17 47.7 H 50', reverse: false, muted: importMW <= 1 },
      { ...nodes.find((node) => node.id === 'transfers')!, id: 'exports-flow', label: 'Exports', valueMW: exportMW, color: '#fb7185', flowPath: 'M 17 52.3 H 50', reverse: true, muted: exportMW <= 1 },
    ];

    return {
      nodes,
      flowNodes,
      maxMW,
      transferMW,
      importMW,
      exportMW,
      exporting,
      lowCarbonShare: totalGenerationMW ? (lowCarbon / totalGenerationMW) * 100 : 0,
      ring: [
        { id: 'wind', value: wind, color: '#5dd6c0' },
        { id: 'solar', value: solar, color: '#f5bd41' },
        { id: 'nuclear', value: nuclear, color: '#aa86ff' },
        { id: 'gas', value: gas, color: '#f45b69' },
        { id: 'other', value: hydro + biomass + other + importsCategory, color: '#c8d0dc' },
      ],
    };
  }, [generationMix, interconnectors, totalDemandMW, totalGenerationMW]);

  const top = model.nodes.filter((node) => node.row === 'top');
  const middle = model.nodes.filter((node) => node.row === 'middle');
  const bottom = model.nodes.filter((node) => node.row === 'bottom');
  const sourceTime = formatTime(sourceTimestamp);
  const circumference = 238.76;
  let offset = 0;

  return (
    <Card id="power-flow" className="relative scroll-mt-28 overflow-hidden border-primary/30 bg-card/70 shadow-2xl shadow-primary/10">
      <div className="absolute inset-0 bg-gradient-glow opacity-50" />
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
            <div className="em-pfc-card-content">
              <FlowSvg nodes={model.flowNodes} maxMW={model.maxMW} />

              <div className="em-pfc-row em-pfc-row-top">
                {top.map((node) => <EnergyCircle key={node.id} node={node} />)}
              </div>

              <div className="em-pfc-row em-pfc-row-middle">
                <EnergyCircle node={middle[0]} />
                <Spacer />
                <div className="em-pfc-home-container" style={{ '--em-pfc-color': 'hsl(var(--primary))' } as React.CSSProperties}>
                  <div className="em-pfc-circle em-pfc-home-circle">
                    <svg className="em-pfc-home-ring" viewBox="0 0 84 84">
                      {model.ring.map((slice) => {
                        const length = totalGenerationMW ? Math.max(0, (slice.value / totalGenerationMW) * circumference) : 0;
                        const dashOffset = -offset;
                        offset += length;
                        return (
                          <circle key={slice.id} cx="42" cy="42" r="38" stroke={slice.color} strokeWidth="4" fill="none" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={dashOffset} />
                        );
                      })}
                    </svg>
                    <Home className="em-pfc-icon" />
                    <span className="em-pfc-value">{formatGWfromMW(totalDemandMW)}</span>
                    <span className="em-pfc-unit">GW</span>
                  </div>
                  <span className="em-pfc-label">GB demand</span>
                </div>
                <EnergyCircle node={middle[1]} />
              </div>

              <div className="em-pfc-row em-pfc-row-bottom">
                <EnergyCircle node={bottom[0]} />
                <EnergyCircle node={bottom[1]} />
                <EnergyCircle node={bottom[2]} />
              </div>
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
              Uses normal React data, not Home Assistant state objects. A local test fixture is available in <code>src/components/powerFlowDemoData.ts</code>.
            </p>
          </aside>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-primary/20 bg-card text-card-foreground sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Reference implementation used</DialogTitle>
            <DialogDescription className="text-left leading-relaxed text-foreground/75">
              The original card cannot be reused directly because it is a Lit Home Assistant custom card tied to Lovelace, hass state objects, ha-card, ha-icon, ha-ripple, templates and Home Assistant action handlers. This component ports the visual model and behaviour into a production-safe React component.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-foreground/80">
            <p>Design authority: <code>power-flow-card-plus.ts</code>, shared entity components, shared flow components, shared CSS and flow-rate/distribution utilities from <code>flixlix/flixlix-cards</code>.</p>
            <p>EnergyMix mapping: Home = GB demand, Grid = net imports/exports, Solar = solar, plus wind, nuclear, gas, hydro, biomass and other source circles.</p>
            <p>Supported by National Energy SO Open Data. Contains BMRS data © Elexon Limited copyright and database right 2026. Visual pattern inspired by flixlix/power-flow-card-plus.</p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
