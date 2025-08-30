import { Wifi, WifiOff, Activity, Database } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

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

  // Show offline indicator for stub data
  if (variant?.includes("stub")) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-destructive/20 text-destructive">
        <WifiOff className="w-3 h-3" />
        <span className="text-xs font-medium">Service unavailable</span>
      </div>
    );
  }

  if (!isRealtime) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted text-muted-foreground">
        <Database className="w-3 h-3" />
        <span className="text-xs font-medium">Delayed</span>
      </div>
    );
  }

  // Show dataset badge with tooltip
  if (variant === "dataset-fuelhh-stream") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-blue-500/20 text-blue-600">
              <Database className="w-3 h-3" />
              <span className="text-xs font-medium">Live</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Source: BMRS (dataset)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Show variant and status
  const variantLabel = variant?.replace(/insights-|@.+$/g, '') || 'live';
  const isInsights = variant?.includes('insights-');
  
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-primary/20 text-primary">
      <Wifi className="w-3 h-3" />
      <span className="text-xs font-medium">
        {isInsights ? 'Live' : variantLabel}
      </span>
      {variant && !isInsights && (
        <span className="text-xs opacity-75">({variant})</span>
      )}
    </div>
  );
};