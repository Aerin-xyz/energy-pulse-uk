type FlowLike = {
  flow?: number | null;
};

type StorageLike = {
  netMW?: number | null;
} | null | undefined;

type DemandInput = {
  totalGenerationMW?: number | null;
  totalDemandMW?: number | null;
  interconnectors?: FlowLike[] | null;
  storage?: StorageLike;
};

export function calculateDisplayedDemandMW({
  totalGenerationMW,
  totalDemandMW,
  interconnectors,
  storage,
}: DemandInput): number {
  const generationMW = totalGenerationMW || 0;
  const rawDemandMW = totalDemandMW || 0;
  const netInterconnectorFlowMW = (interconnectors || []).reduce((sum, item) => sum + (item.flow || 0), 0);
  const storageTransferMW = storage?.netMW || 0;
  const derivedDemandMW = Math.max(0, generationMW + netInterconnectorFlowMW + storageTransferMW);

  if (derivedDemandMW > 0 && Math.abs(derivedDemandMW - rawDemandMW) > 2500) {
    return derivedDemandMW;
  }

  return rawDemandMW;
}

