import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const OfflineOverlay = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOverlay(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOverlay(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also check if the initial state is offline
    if (!navigator.onLine) {
      setShowOverlay(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showOverlay) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg p-6 max-w-sm mx-4 text-center">
        <WifiOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Connection Lost</h3>
        <p className="text-muted-foreground mb-4">
          You're currently offline. The dashboard will reconnect automatically when your connection is restored.
        </p>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Connection
        </Button>
      </div>
    </div>
  );
};