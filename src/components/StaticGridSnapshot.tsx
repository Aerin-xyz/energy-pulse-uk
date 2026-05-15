import snapshot from '@/data/staticGridSnapshot.json';

const items = [
  ['Demand', snapshot.display?.demand],
  ['Generation', snapshot.display?.generation],
  ['Carbon', snapshot.display?.carbonIntensity],
  ['Renewables', snapshot.display?.renewableShare],
  ['Gas', snapshot.display?.gasShare],
  ['Wind', snapshot.display?.wind],
  ['Solar', snapshot.display?.solar],
  ['Nuclear', snapshot.display?.nuclear],
  ['Flows', snapshot.display?.importsExports],
].filter(([, value]) => Boolean(value));

const formatTimestamp = (timestamp?: string | null) => {
  if (!timestamp) return 'latest available build-time snapshot';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(new Date(timestamp));
};

interface StaticGridSnapshotProps {
  compact?: boolean;
}

export const StaticGridSnapshot = ({ compact = false }: StaticGridSnapshotProps) => {
  return (
    <section className="rounded-2xl border border-primary/20 bg-card/50 p-5 md:p-6 shadow-lg shadow-primary/5" aria-labelledby="latest-grid-snapshot">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-primary/80">Latest grid snapshot</p>
          <h2 id="latest-grid-snapshot" className="mt-1 text-xl md:text-2xl font-semibold text-foreground">GB electricity right now</h2>
        </div>
        <p className="text-xs text-foreground/55">
          {formatTimestamp(snapshot.timestamp)} · {snapshot.source || 'public grid data'}
        </p>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'}`}>
        {items.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-primary/10 bg-background/35 px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-foreground/50">{label}</div>
            <div className="mt-1 font-mono text-sm md:text-base font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-foreground/55 leading-relaxed">
        Cached at build time for a fast, crawlable summary. The interactive dashboard refreshes from public grid and carbon-intensity sources in the browser.
      </p>
    </section>
  );
};
