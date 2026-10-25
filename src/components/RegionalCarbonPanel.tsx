import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { partitionCarbonRegions, postcodeDistrict } from '@/lib/evidence/regionalCarbon.mjs';
import { londonTimestamp } from '@/lib/evidence/timeLabels.mjs';

type Region = {
  regionid: number;
  shortname: string;
  dnoregion: string;
  intensity: { forecast?: number; index?: string };
};

type PostcodeResult = {
  shortname?: string;
  dnoregion?: string;
  intensity?: { forecast?: number; index?: string };
  from?: string;
  to?: string;
};

export function RegionalCarbonPanel() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [postcode, setPostcode] = useState('');
  const [postcodeResult, setPostcodeResult] = useState<PostcodeResult | null>(null);
  const [postcodeError, setPostcodeError] = useState('');
  const [countryId, setCountryId] = useState('15');
  const [regionState, setRegionState] = useState<'loading' | 'available' | 'unavailable'>('loading');
  const [period, setPeriod] = useState<{from?:string;to?:string}>({});
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setRegionState('loading');
    fetch('https://api.carbonintensity.org.uk/regional')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`Carbon API ${res.status}`)))
      .then((json) => {
        if (cancelled) return;
        const latest = json?.data?.[0]?.regions || [];
        setRegions(latest.filter((region: Region) => Number.isFinite(region?.intensity?.forecast)));
        setPeriod({from:json?.data?.[0]?.from,to:json?.data?.[0]?.to});
        setRegionState(latest.length ? 'available' : 'unavailable');
      })
      .catch(() => {
        if (!cancelled) { setRegions([]); setRegionState('unavailable'); }
      });
    return () => { cancelled = true; };
  }, [retry]);

  const { ranked, countries } = useMemo(() => partitionCarbonRegions(regions), [regions]);
  const country = countries.find((region: Region) => String(region.regionid) === countryId) || countries[0];

  async function lookupPostcode(event: FormEvent) {
    event.preventDefault();
    setPostcodeError('');
    setPostcodeResult(null);

    const value = postcodeDistrict(postcode);
    if (!value) {
      setPostcodeError('Enter a GB postcode or postcode district to check its regional carbon forecast.');
      return;
    }

    try {
      const res = await fetch(`https://api.carbonintensity.org.uk/regional/postcode/${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error(`Carbon API ${res.status}`);
      const json = await res.json();
      const region = json?.data?.[0];
      const reading = region?.data?.[0];
      if (!Number.isFinite(reading?.intensity?.forecast)) throw new Error('No regional result');
      setPostcodeResult({shortname:region.shortname,dnoregion:region.dnoregion,...reading});
    } catch {
      setPostcodeError('Could not find that postcode region. Check the postcode and try again.');
    }
  }

  return (
    <section className="rounded-xl border border-primary/20 bg-background/40 p-5 md:p-6">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-cosmic-cyan/80">Regional carbon</p>
        <h2 className="text-2xl font-semibold text-primary mt-1">Check local carbon intensity</h2>
        <p className="text-foreground/80 mt-2">
          Carbon forecasts vary across Britain. Compare the 14 non-overlapping electricity distribution sub-regions below; country aggregates are shown separately.
        </p>
      </div>

      <form onSubmit={lookupPostcode} className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          value={postcode}
          onChange={(event) => setPostcode(event.target.value)}
          placeholder="Enter postcode, e.g. SW1A 1AA"
          className="flex-1 rounded-md border border-primary/20 bg-background/70 px-3 py-2 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-cosmic-cyan/50"
          aria-label="UK postcode"
        />
        <button type="submit" className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          Check region
        </button>
      </form>

      {postcodeError && <p className="text-sm text-amber-300 mb-4">{postcodeError}</p>}
      {postcodeResult && (
        <div className="rounded-lg border border-cosmic-cyan/25 bg-cosmic-cyan/5 p-4 mb-5">
          <p className="text-sm text-foreground/60">Your regional forecast</p>
          <p className="text-xl font-semibold text-foreground mt-1">{postcodeResult.shortname || postcodeResult.dnoregion}</p>
          <p className="text-2xl font-bold text-primary mt-1">{postcodeResult.intensity?.forecast} gCO₂/kWh</p>
          <p className="text-sm text-foreground/60 capitalize">{postcodeResult.intensity?.index || 'latest forecast'}</p>
          <p className="text-sm mt-2">{londonTimestamp(postcodeResult.from)}–{londonTimestamp(postcodeResult.to)}</p>
        </div>
      )}

      <p className="text-sm mb-4">{period.from && period.to ? `Forecast interval: ${londonTimestamp(period.from)}–${londonTimestamp(period.to)}. ${Date.parse(period.to) <= Date.now() ? 'This retained interval has ended.' : ''}` : 'Forecast interval unavailable.'}</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-primary/15 bg-background/60 p-4">
          <h3 className="font-semibold mb-3">Lowest-carbon sub-regions</h3>
          <ol className="space-y-2 text-sm">
            {ranked.slice(0, 5).map((region) => (
              <li key={region.regionid} className="flex justify-between gap-3">
                <span>{region.shortname}</span>
                <span className="text-cosmic-cyan">{region.intensity.forecast} gCO₂/kWh</span>
              </li>
            ))}
            {!ranked.length && <li className="text-foreground/60">{regionState === 'loading' ? 'Loading regional data…' : 'Regional forecasts unavailable.'}</li>}
          </ol>
        </div>
        <div className="rounded-lg border border-primary/15 bg-background/60 p-4">
          <h3 className="font-semibold mb-3">Higher-carbon sub-regions</h3>
          <ol className="space-y-2 text-sm">
            {ranked.slice(-5).reverse().map((region) => (
              <li key={region.regionid} className="flex justify-between gap-3">
                <span>{region.shortname}</span>
                <span className="text-amber-300">{region.intensity.forecast} gCO₂/kWh</span>
              </li>
            ))}
            {!ranked.length && <li className="text-foreground/60">{regionState === 'loading' ? 'Loading regional data…' : 'Regional forecasts unavailable.'}</li>}
          </ol>
        </div>
      </div>

      {regionState === 'unavailable' && <button type="button" className="mt-4 rounded-md border border-primary/30 px-4 py-3" onClick={() => setRetry(v => v + 1)}>Retry regional forecasts</button>}
      <div className="rounded-lg border border-primary/15 bg-background/60 p-4 mt-4">
        <h3 className="font-semibold mb-3">Country aggregate forecast</h3>
        {country ? <><label>Country<select aria-label="Country aggregate" className="ml-3 rounded-md border border-primary/30 bg-background px-3 py-3" value={String(country.regionid)} onChange={e => setCountryId(e.target.value)}>{countries.map((region: Region) => <option key={region.regionid} value={region.regionid}>{region.shortname}</option>)}</select></label><p className="mt-3">{country.shortname}: <strong>{country.intensity.forecast} gCO₂/kWh</strong> · forecast</p></> : <p>{regionState === 'loading' ? 'Loading country forecasts…' : 'Country forecasts unavailable.'}</p>}
        <p className="text-sm text-foreground/70 mt-2">England, Scotland and Wales overlap the sub-regions, so they are not included in either ranking.</p>
      </div>

      <p className="text-sm text-foreground/70 mt-4">
        Regional figures are forecasts from the <a href="https://api.carbonintensity.org.uk/" className="underline">Carbon Intensity API</a>, not billing-grade measurement. {ranked.length} of 14 comparable sub-regions available. Equal values are ordered by region ID.
      </p>
    </section>
  );
}
