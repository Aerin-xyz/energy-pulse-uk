import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEUGeneration } from '@/hooks/useEUGeneration';
import { useEnergyData } from '@/contexts/EnergyDataContext';
import { Loader2 } from 'lucide-react';

type CountryView = {
  code: string;
  asOf?: Date | null;
  totalMW: number;
  mix: Array<{ label: string; mw: number }>;
  ok: boolean;
};

function formatMW(mw: number) {
  if (mw >= 1000) return `${(mw/1000).toFixed(1)} GW`;
  return `${Math.round(mw)} MW`;
}

export const EUGenerationCard: React.FC = () => {
  // Reuse your existing energy-data fetcher without touching API code.
  const energy = useEnergyData(); // has data + refetch; returns the server payload already
  const fetcher = React.useCallback(() => {
    // Return the raw data for EU processing instead of processed data
    return energy?.rawData ?? {};
  }, [energy?.rawData]);

  const { countries, loading, error, debug } = useEUGeneration(async () => fetcher());
  
  // Debug logging when EU data is missing
  const isDebugMode = new URLSearchParams(window.location.search).has('debug');
  
  React.useEffect(() => {
    if (isDebugMode && energy?.rawData) {
      console.log('🇪🇺 EU Generation Debug:', {
        rawApiData: energy.rawData,
        euGenerationMix: energy.rawData?.euGenerationMix,
        diagnosticsEuMix: energy.rawData?.diagnostics?.euMix,
        extractedCountries: countries,
        debugInfo: debug,
        error: error
      });
    }
  }, [energy?.rawData, countries, debug, error, isDebugMode]);

  const [selected, setSelected] = React.useState<string | null>(null);
  const countryCodes = countries.map(c => c.code);
  const current: CountryView | undefined = React.useMemo(() => {
    if (!countries.length) return undefined;
    const code = selected && countryCodes.includes(selected) ? selected : (countryCodes.includes('GB') ? 'GB' : countries[0].code);
    return countries.find(c => c.code === code);
  }, [countries, selected, countryCodes]);

  const asOfText = current?.asOf ? current.asOf.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <Card className="glass-background">
      <CardHeader className="flex items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">EU Generation Mix</CardTitle>
        {loading ? <Loader2 className="h-4 w-4 animate-spin opacity-70" /> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {(!countries.length || !current) && !loading ? (
          <div className="text-sm text-muted-foreground glass-foreground p-4 rounded-lg border border-white/10">
            <div className="mb-2">EU data not available from the current response.</div>
            {isDebugMode && (
              <div className="text-xs space-y-2 mt-3 p-3 bg-black/20 rounded border">
                <div><strong>Debug Info:</strong></div>
                <div>Countries found: {countries.length}</div>
                <div>Raw EU data: {JSON.stringify(energy?.rawData?.euGenerationMix || 'missing')}</div>
                <div>EU diagnostics: {JSON.stringify(energy?.rawData?.diagnostics?.euMix || 'missing')}</div>
                <div>Debug reason: {debug?.reason || 'unknown'}</div>
                <div>Available keys: {debug?.keys ? debug.keys.join(', ') : 'none'}</div>
                {error && <div className="text-red-400">Error: {error}</div>}
              </div>
            )}
          </div>
        ) : null}

        {countries.length > 0 && current ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Select value={current.code} onValueChange={setSelected}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="text-xs text-muted-foreground ml-auto">
                As of: <span className="font-medium">{asOfText}</span> · Total: <span className="font-medium">{formatMW(current.totalMW)}</span>
              </div>
            </div>

            {/* Donut */}
            <div className="relative mx-auto" style={{ width: 280, height: 280 }}>
              <svg viewBox="0 0 100 100" className="drop-shadow-sm">
                <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                {current.mix.map((seg, idx) => {
                  const total = current.totalMW || 1;
                  const frac = Math.max(0, seg.mw) / total;
                  const len = 2 * Math.PI * 38;
                  const dash = Math.max(0.5, frac * len);
                  const gap = Math.max(0.5, len - dash);
                  
                  // Calculate cumulative rotation
                  const prevFrac = current.mix.slice(0, idx).reduce((sum, s) => sum + (s.mw / total), 0);
                  const rotate = (prevFrac * 360) - 90;
                  
                  const stroke = `hsla(${(idx*47)%360}, 70%, 55%, 0.9)`;
                  
                  return (
                    <circle
                      key={seg.label + idx}
                      cx="50" cy="50" r="38"
                      fill="none"
                      stroke={stroke}
                      strokeWidth="12"
                      strokeDasharray={`${dash} ${gap}`}
                      transform={`rotate(${rotate} 50 50)`}
                      style={{ transition: 'stroke-dasharray 300ms ease' }}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {current.mix.slice(0, 9).map((m, i) => (
                <div key={m.label + i} className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ background: `hsla(${(i*47)%360}, 70%, 55%, 0.9)` }}
                  />
                  <span className="truncate">{m.label}</span>
                  <span className="ml-auto tabular-nums">{formatMW(m.mw)}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {error ? (
          <div className="text-xs text-red-400/90 border border-red-400/20 rounded-md p-2">
            {error}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};