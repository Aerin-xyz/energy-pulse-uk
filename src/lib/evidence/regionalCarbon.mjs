// Carbon Intensity API IDs 1–14 are non-overlapping DNO sub-regions.
// IDs 15–17 are England/Scotland/Wales; 18 is GB and must not be ranked with them.
export function partitionCarbonRegions(regions = []) {
  const valid = regions.filter(r => Number.isInteger(r?.regionid) && typeof r.intensity?.forecast === 'number' && Number.isFinite(r.intensity.forecast) && r.intensity.forecast >= 0);
  return {
    ranked: valid.filter(r => r.regionid >= 1 && r.regionid <= 14).sort((a, b) => a.intensity.forecast - b.intensity.forecast || a.regionid - b.regionid),
    countries: valid.filter(r => r.regionid >= 15 && r.regionid <= 17).sort((a, b) => a.regionid - b.regionid),
  };
}

// The provider accepts the outward district, not a full unit postcode.
export function postcodeDistrict(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '').match(/^([A-Z]{1,2}\d[A-Z\d]?)(?:\d[A-Z]{2})?$/)?.[1] || null;
}
