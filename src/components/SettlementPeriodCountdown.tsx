import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettlementPeriodCountdownProps {
  lastUpdated: Date;
}

export const SettlementPeriodCountdown = ({ lastUpdated }: SettlementPeriodCountdownProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [progress, setProgress] = useState<number>(100);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const lastUpdateTime = new Date(lastUpdated);
      
      // Settlement periods are 30 minutes
      const SETTLEMENT_PERIOD_MS = 30 * 60 * 1000;
      
      // Calculate the next settlement period
      const timeSinceLastUpdate = now.getTime() - lastUpdateTime.getTime();
      const nextUpdate = lastUpdateTime.getTime() + SETTLEMENT_PERIOD_MS;
      const remaining = nextUpdate - now.getTime();
      
      // Calculate progress (0-100, where 100 is just updated, 0 is about to update)
      const progressPercent = Math.max(0, Math.min(100, (remaining / SETTLEMENT_PERIOD_MS) * 100));
      
      setTimeRemaining(Math.max(0, remaining));
      setProgress(progressPercent);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Color transitions based on progress
  const getColorClass = () => {
    if (progress > 66) return 'from-carbon-low to-carbon-very-low'; // Green
    if (progress > 33) return 'from-carbon-moderate to-carbon-low'; // Yellow to Green
    if (progress > 10) return 'from-carbon-high to-carbon-moderate'; // Orange to Yellow
    return 'from-carbon-very-high to-carbon-high'; // Red
  };

  const getTextColor = () => {
    if (progress > 66) return 'text-carbon-very-low';
    if (progress > 33) return 'text-carbon-moderate';
    if (progress > 10) return 'text-carbon-high';
    return 'text-carbon-very-high';
  };

  const getPulseClass = () => {
    if (progress <= 10) return 'animate-pulse';
    return '';
  };

  return (
    <div className="mb-6">
      <div className="bg-card/70 backdrop-blur-md border border-border rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className={cn("w-4 h-4", getTextColor(), getPulseClass())} />
            <span className="text-sm font-medium text-foreground">Next Settlement Period</span>
          </div>
          <div className={cn("text-2xl font-bold font-mono", getTextColor(), getPulseClass())}>
            {formatTime(timeRemaining)}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "absolute left-0 top-0 h-full bg-gradient-to-r transition-all duration-1000 ease-linear",
              getColorClass()
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          <span className={cn("font-medium", getTextColor())}>
            {progress > 66 ? 'Fresh' : progress > 33 ? 'Aging' : progress > 10 ? 'Stale' : 'Updating soon'}
          </span>
        </div>
      </div>
    </div>
  );
};
