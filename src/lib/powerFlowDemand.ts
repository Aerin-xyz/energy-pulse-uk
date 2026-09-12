import { supplyBalance } from "./gridMetrics.mjs";
type DemandInput = {
  totalGenerationMW?: number | null;
  totalDemandMW?: number | null;
  interconnectors?: { flow?: number | null; status?: string }[] | null;
  storage?: { netMW?: number | null } | null;
};
/** Estimated supply-balance demand, never silently substituted for transmission demand. */
export function calculateDisplayedDemandMW(input: DemandInput): number {
  return (
    supplyBalance(
      input.totalGenerationMW,
      input.interconnectors,
      input.storage?.netMW,
    ) ?? NaN
  );
}
