import { Calculator, CheckCircle2 } from 'lucide-react';
import { formatGWfromMW } from '@/lib/utils';

interface DemandReconciliationPanelProps {
  rawDemandMW: number;
  displayedDemandMW: number;
  generationMW: number;
  netTransfersMW: number;
  storageMW: number;
}

const signedGW = (mw: number) => `${mw >= 0 ? '+' : '−'}${formatGWfromMW(Math.abs(mw))} GW`;

export function DemandReconciliationPanel({
  rawDemandMW,
  displayedDemandMW,
  generationMW,
  netTransfersMW,
  storageMW,
}: DemandReconciliationPanelProps) {
  const residualMW = displayedDemandMW - generationMW - netTransfersMW - storageMW;
  const deltaMW = displayedDemandMW - rawDemandMW;

  return (
    <section className="rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4 md:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-amber-200/80">Internal QA</p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Calculator className="h-4 w-4 text-amber-200" /> Demand reconciliation
          </h2>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-xs text-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" /> balance view
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Metric label="Displayed demand" value={`${formatGWfromMW(displayedDemandMW)} GW`} tone="text-foreground" />
        <Metric label="GB production" value={`${formatGWfromMW(generationMW)} GW`} tone="text-cosmic-cyan" />
        <Metric label="Net transfers" value={signedGW(netTransfersMW)} tone={netTransfersMW >= 0 ? 'text-primary' : 'text-orange-300'} />
        <Metric label="Storage transfer" value={signedGW(storageMW)} tone={storageMW >= 0 ? 'text-emerald-300' : 'text-sky-300'} />
        <Metric label="Raw BMRS demand" value={`${formatGWfromMW(rawDemandMW)} GW`} tone="text-muted-foreground" />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Displayed demand uses the public power-balance definition: GB production + net interconnector transfers + pumped-storage transfer.
        Raw BMRS ITSDO can differ because it is a transmission-system demand outturn, not the same consumer-facing demand definition.
        Residual: {signedGW(residualMW)}. Displayed vs raw delta: {signedGW(deltaMW)}.
      </p>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-background/45 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}
