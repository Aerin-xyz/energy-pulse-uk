import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGWfromMW(mw: number, dp = 1): string {
  if (!Number.isFinite(mw)) return "—";
  return (mw / 1000).toFixed(dp);
}

export function formatGWh(value: number, dp = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(dp)} GWh`;
}
