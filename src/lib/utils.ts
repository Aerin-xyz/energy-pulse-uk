import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGWfromMW(mw: number, dp = 1): string {
  if (!Number.isFinite(mw)) return "—";
  return (mw / 1000).toFixed(dp);
}

export function formatPower(mw: number, unit: 'GW' | 'MW' | 'MWh' = 'GW', dp = 1): string {
  if (!Number.isFinite(mw)) return "—";
  
  switch (unit) {
    case 'MW':
    case 'MWh':
      return mw.toFixed(dp);
    case 'GW':
    default:
      return (mw / 1000).toFixed(dp);
  }
}

export function formatGWh(value: number, dp = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(dp)} GWh`;
}
