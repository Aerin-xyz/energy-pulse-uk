import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface NextUpdateCountdownProps {
  nextUpdateAt: Date | null;
}

export const NextUpdateCountdown = ({ nextUpdateAt }: NextUpdateCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!nextUpdateAt) {
      setTimeLeft('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = nextUpdateAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Updating...');
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextUpdateAt]);

  if (!nextUpdateAt || !timeLeft) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="w-3 h-3" />
      <span>Next settlement period: {timeLeft}</span>
    </div>
  );
};