import { type FormEvent, useEffect, useMemo, useState } from 'react';

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
};

function cleanPostcode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function RegionalCarbonPanel() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [postcode, setPostcode] = useState('');
  const [postcodeResult, setPostcodeResult] = useState<PostcodeResult | null>(null);
  const [postcodeError, setPostcodeError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('https://api.carbonintensity.org.uk/regional')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`Carbon API ${res.status}`)))
      .then((json) => {
        if (cancelled) return;
        const latest = json?.data?.[0]?.regions || [];
        setRegions(latest.filter((region: Region) => Number.isFinite(region?.intensity?.forecast)));
      })
      .catch(() => {
        if (!cancelled) setRegions([]);
      });
    return () => { cancelled = true; };
  }, []);

  const ranked = useMemo(() => {
    return [...regions].sort((a, b) => Number(a.intensity.forecast) - Number(b.intensity.forecast));
  }, [regions]);

  async function lookupPostcode(event: FormEvent) {
    event.preventDefault();
    setPostcodeError('');
    setPostcodeResult(null);

    const value = cleanPostcode(postcode);
    if (!value || value.length < 5) {
      setPostcodeError('Enter a full UK postcode to check its regional carbon forecast.');
      return;
    }

    try {
      const res = await fetch(`https://api.carbonintensity.org.uk/regional/postcode/${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error(`Carbon API ${res.status}`);
      const json = await res.json();
      const item = json?.data?.[0];
      if (!item?.intensity) throw new Error('No regional result');
      setPostcodeResult(item);
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
          National carbon intensity is useful, but the cleanest part of Britain can vary by region. This panel uses NESO’s regional Carbon Intensity API so the page answers location-specific searches too.
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
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-primary/15 bg-background/60 p-4">
          <h3 className="font-semibold mb-3">Cleanest regions now</h3>
          <ol className="space-y-2 text-sm">
            {ranked.slice(0, 5).map((region) => (
              <li key={region.regionid} className="flex justify-between gap-3">
                <span>{region.shortname}</span>
                <span className="text-cosmic-cyan">{region.intensity.forecast} gCO₂/kWh</span>
              </li>
            ))}
            {!ranked.length && <li className="text-foreground/60">Loading regional data…</li>}
          </ol>
        </div>
        <div className="rounded-lg border border-primary/15 bg-background/60 p-4">
          <h3 className="font-semibold mb-3">Higher-carbon regions now</h3>
          <ol className="space-y-2 text-sm">
            {ranked.slice(-5).reverse().map((region) => (
              <li key={region.regionid} className="flex justify-between gap-3">
                <span>{region.shortname}</span>
                <span className="text-amber-300">{region.intensity.forecast} gCO₂/kWh</span>
              </li>
            ))}
            {!ranked.length && <li className="text-foreground/60">Loading regional data…</li>}
          </ol>
        </div>
      </div>

      <p className="text-xs text-foreground/50 mt-4">
        Regional figures are forecasts from the Carbon Intensity API and should be read as practical guidance, not billing-grade measurement.
      </p>
    </section>
  );
}
