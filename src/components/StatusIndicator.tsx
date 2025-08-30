import { Wifi, WifiOff, Activity, Database } from 'lucide-react';

interface StatusIndicatorProps {
  isRealtime?: boolean;
  variant?: string;
  isOnline?: boolean;
}

export const StatusIndicator = ({ isRealtime = true, variant, isOnline = true }: StatusIndicatorProps) => {
  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-destructive/20 text-destructive">
        <WifiOff className="w-3 h-3" />
        <span className="text-xs font-medium">Offline</span>
      </div>
    );
  }

  if (!isRealtime) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted text-muted-foreground">
        <Database className="w-3 h-3" />
        <span className="text-xs font-medium">Delayed (LKG)</span>
      </div>
    );
  }

  // Show fallback badge for Carbon Intensity
  if (variant === "carbonintensity-fallback") {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-amber-500/20 text-amber-600">
        <Activity className="w-3 h-3" />
        <span className="text-xs font-medium">Fallback source active</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-primary/20 text-primary">
      <Activity className="w-3 h-3" />
      <span className="text-xs font-medium">Realtime</span>
      {variant && (
        <span className="text-xs opacity-75">({variant})</span>
      )}
    </div>
  );
};