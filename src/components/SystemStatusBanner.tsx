import { Clock, Database } from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';
import { SourceFreshnessBar } from '@/components/SourceFreshnessBar';

interface SystemStatusBannerProps {
  settlementPeriod?: number;
  timeUntilNextSP?: string;
  dataAge?: string;
  isRealtime?: boolean;
  nextUpdate?: string;
  sourceFreshness?: Record<string, {
    label?: string;
    source?: string;
    timestamp?: string | null;
    cadenceMinutes?: number;
    status?: string;
  }>;
}

export const SystemStatusBanner = ({
  settlementPeriod,
  timeUntilNextSP,
  dataAge,
  isRealtime = false,
  nextUpdate,
  sourceFreshness,
}: SystemStatusBannerProps) => {
  const statusColor = isRealtime 
    ? 'bg-green-500' 
    : dataAge && parseInt(dataAge) > 15 
    ? 'bg-destructive' 
    : 'bg-yellow-500';

  return (
    <div className="hidden md:block border-b border-primary/20 glass-morphism sticky top-[136px] z-40 shadow-lg">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs md:text-sm">
          {/* Settlement Period */}
          {settlementPeriod && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cosmic-cyan" />
              <span className="text-muted-foreground">Settlement Period:</span>
              <span className="font-bold text-foreground">{settlementPeriod}</span>
              {timeUntilNextSP && (
                <span className="text-muted-foreground">({timeUntilNextSP})</span>
              )}
              <HelpTooltip content="A Settlement Period (SP) is a 30-minute time window used to measure electricity supply and demand. There are 48 settlement periods per day." />
            </div>
          )}

          <div className="hidden md:block w-px h-6 bg-border" />

          {/* Data Freshness */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColor} animate-pulse glow-cyan`} />
            <Database className="w-4 h-4 text-cosmic-cyan" />
            <span className="text-muted-foreground">Data Status:</span>
            <span className="font-semibold text-foreground">
              {isRealtime ? 'Live' : dataAge ? `${dataAge} min old` : 'Unknown'}
            </span>
            <HelpTooltip content="Live dashboard refreshes every 2 minutes using Elexon's 5-minute FUELINST feed plus BMRS/ESO fallbacks. Some settlement-period datasets still have a 5-30 minute validation delay." />
          </div>

          {nextUpdate && (
            <>
              <div className="hidden md:block w-px h-6 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Next page refresh:</span>
                <span className="font-semibold text-foreground">{nextUpdate}</span>
              </div>
            </>
          )}
        </div>
      </div>
      <SourceFreshnessBar sourceFreshness={sourceFreshness} />
    </div>
  );
};
