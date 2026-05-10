import { Badge } from '@/components/ui/badge';
import { HelpTooltip } from '@/components/HelpTooltip';

type FreshnessItem = {
  label?: string;
  source?: string;
  timestamp?: string | null;
  cadenceMinutes?: number;
  status?: string;
};

interface SourceFreshnessBarProps {
  sourceFreshness?: Record<string, FreshnessItem>;
}

const preferredOrder = ['generation', 'solar', 'wind', 'interconnectors', 'demand', 'carbon'];

const formatTime = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  // Do not present future settlement-period fallbacks as source freshness.
  if (date.getTime() > Date.now() + 2 * 60 * 1000) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const statusClass = (status?: string) => {
  if (status === 'live') return 'bg-green-500';
  if (status === 'cached' || status === 'fallback' || status === 'bmrs-fallback') return 'bg-yellow-500';
  return 'bg-muted-foreground';
};

export const SourceFreshnessBar = ({ sourceFreshness }: SourceFreshnessBarProps) => {
  if (!sourceFreshness) return null;

  const entries = preferredOrder
    .map((key) => [key, sourceFreshness[key]] as const)
    .filter(([, item]) => item);

  if (!entries.length) return null;

  return (
    <div className="container mx-auto px-4 pb-2">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        {entries.map(([key, item]) => (
          <Badge key={key} variant="outline" className="gap-1.5 border-primary/20 bg-background/40 py-1">
            <span className={`w-1.5 h-1.5 rounded-full ${statusClass(item.status)}`} />
            <span className="text-muted-foreground">{item.label || key}:</span>
            <span className="font-semibold text-foreground">{formatTime(item.timestamp)}</span>
            <HelpTooltip
              content={`${item.source || 'Source'}${item.cadenceMinutes ? ` • native cadence about ${item.cadenceMinutes} min` : ''}${item.status ? ` • ${item.status}` : ''}`}
              className="w-3 h-3"
            />
          </Badge>
        ))}
      </div>
    </div>
  );
};
