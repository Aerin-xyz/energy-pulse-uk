import { INITIAL_EVIDENCE } from '@/lib/initialEvidence.mjs';

// Existing fallback API, without a frozen numerical snapshot competing with live data.
export const StaticGridSnapshot = ({ compact = false }: { compact?: boolean }) => (
  <section className={`rounded-2xl border border-primary/20 bg-card/50 ${compact ? 'p-5' : 'p-6'}`} data-evidence-status={INITIAL_EVIDENCE.status} data-evidence-schema={INITIAL_EVIDENCE.schemaVersion} aria-label="Current data availability">
    <h2 className="text-xl font-semibold text-foreground">{INITIAL_EVIDENCE.title}</h2>
    <p className="mt-3 text-sm text-foreground/75">{INITIAL_EVIDENCE.explanation}</p>
    <p className="mt-3 text-sm text-foreground/75">Great Britain covers England, Scotland and Wales; Northern Ireland operates in a separate electricity market.</p>
    <p className="mt-3 text-sm"><a href="/data/">Sources</a> · <a href="/methodology/">Definitions and limitations</a> · <a href="/reports/">Dated reports</a></p>
  </section>
);
