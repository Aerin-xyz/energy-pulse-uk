import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEnergyData } from '@/hooks/useEnergyData';

export const EUDebugPanel: React.FC = () => {
  const energy = useEnergyData();
  const isDebugMode = new URLSearchParams(window.location.search).has('debug');
  
  if (!isDebugMode) return null;
  
  return (
    <Card className="glass-background border-yellow-500/20">
      <CardHeader>
        <CardTitle className="text-yellow-400 text-sm flex items-center gap-2">
          🔍 EU Data Debug Panel
          <Badge variant="outline" className="text-xs">Debug Mode</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs space-y-2">
          <div>
            <strong>API Response Status:</strong> {energy?.loading ? 'Loading...' : energy?.error ? 'Error' : 'Success'}
          </div>
          
          {energy?.rawData && (
            <>
              <div>
                <strong>Raw EU Generation Mix:</strong>
                <pre className="mt-1 p-2 bg-black/30 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(energy.rawData.euGenerationMix, null, 2)}
                </pre>
              </div>
              
              <div>
                <strong>EU Mix Diagnostics:</strong>
                <pre className="mt-1 p-2 bg-black/30 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(energy.rawData?.diagnostics?.euMix, null, 2)}
                </pre>
              </div>
              
              <div>
                <strong>ENTSO-E Interconnector Attempts:</strong>
                <pre className="mt-1 p-2 bg-black/30 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(energy.rawData?.diagnostics?.icAttempts, null, 2)}
                </pre>
              </div>
              
              <div>
                <strong>Full Diagnostics Object:</strong>
                <pre className="mt-1 p-2 bg-black/30 rounded text-xs overflow-auto max-h-48">
                  {JSON.stringify(energy.rawData?.diagnostics, null, 2)}
                </pre>
              </div>
              
              <div>
                <strong>Raw API Keys Available:</strong>
                <div className="mt-1 text-xs text-muted-foreground">
                  {Object.keys(energy.rawData).join(', ')}
                </div>
              </div>
            </>
          )}
          
          {energy?.error && (
            <div className="text-red-400">
              <strong>API Error:</strong> {energy.error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};