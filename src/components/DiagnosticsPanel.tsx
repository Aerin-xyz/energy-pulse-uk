import { useState } from 'react';
import { ChevronDown, ChevronUp, TestTube, Zap, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const DiagnosticsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [healthResult, setHealthResult] = useState<any>(null);
  const [energyResult, setEnergyResult] = useState<any>(null);
  const [euResult, setEuResult] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingEnergy, setLoadingEnergy] = useState(false);
  const [loadingEu, setLoadingEu] = useState(false);
  const { toast } = useToast();

  const runHealthCheck = async () => {
    setLoadingHealth(true);
    try {
      const { data, error } = await supabase.functions.invoke('entsoe-health');
      if (error) throw error;
      setHealthResult(data);
      toast({
        title: "Health check completed",
        description: data.ok ? "ENTSO-E API is working" : "ENTSO-E API has issues",
        variant: data.ok ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthResult({ error: error.message });
      toast({
        title: "Health check failed",
        description: "Failed to run diagnostics",
        variant: "destructive",
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  const runEnergyDebug = async () => {
    setLoadingEnergy(true);
    try {
      const { data, error } = await supabase.functions.invoke('energy-data', {
        body: { debug: 1 }
      });
      if (error) throw error;
      setEnergyResult(data);
      toast({
        title: "Energy debug completed",
        description: "Debug data fetched",
      });
    } catch (error) {
      console.error('Energy debug failed:', error);
      setEnergyResult({ error: error.message });
      toast({
        title: "Energy debug failed",
        description: "Failed to fetch debug data",
        variant: "destructive",
      });
    } finally {
      setLoadingEnergy(false);
    }
  };

  const testEntsoeSEMQuarter = async () => {
    setLoadingHealth(true);
    try {
      const { data, error } = await supabase.functions.invoke('entsoe-health', {
        body: { 
          in_Domain: '10YIE-1001A00010', // Ireland (SEM)
          out_Domain: '10YGB----------A', // GB
          minutesBack: 180, // 3 hours back
          alignQuarter: true
        }
      });
      if (error) throw error;
      setHealthResult(data);
      toast({
        title: "ENTSO-E Ireland (SEM) quarter-aligned test completed",
        description: data.ok ? "SEM interconnector data available" : "Issues with SEM quarter-aligned data",
        variant: data.ok ? "default" : "destructive",
      });
    } catch (error) {
      console.error('ENTSO-E Ireland (SEM) quarter test failed:', error);
      setHealthResult({ error: error.message });
      toast({
        title: "ENTSO-E Ireland (SEM) quarter test failed",
        description: "Failed to test SEM border with quarter alignment",
        variant: "destructive",
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  const testEntsoeSEMHour = async () => {
    setLoadingHealth(true);
    try {
      const { data, error } = await supabase.functions.invoke('entsoe-health', {
        body: { 
          in_Domain: '10YIE-1001A00010', // Ireland (SEM)
          out_Domain: '10YGB----------A', // GB
          minutesBack: 180, // 3 hours back
          alignHour: true
        }
      });
      if (error) throw error;
      setHealthResult(data);
      toast({
        title: "ENTSO-E Ireland (SEM) hour-aligned test completed",
        description: data.ok ? "SEM interconnector data available" : "Issues with SEM hour-aligned data",
        variant: data.ok ? "default" : "destructive",
      });
    } catch (error) {
      console.error('ENTSO-E Ireland (SEM) hour test failed:', error);
      setHealthResult({ error: error.message });
      toast({
        title: "ENTSO-E Ireland (SEM) hour test failed",
        description: "Failed to test SEM border with hour alignment",
        variant: "destructive",
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  const runEuDataDebug = async () => {
    setLoadingEu(true);
    try {
      const { data, error } = await supabase.functions.invoke('energy-data', {
        body: { debug: 1 }
      });
      if (error) throw error;
      setEuResult(data);
      toast({
        title: "EU data debug completed",
        description: `EU mix: ${data.diagnostics?.euMix?.count || 0} countries, ${data.diagnostics?.euMix?.sampleCountries?.length || 0} with data`,
      });
    } catch (error) {
      console.error('EU data debug failed:', error);
      setEuResult({ error: error.message });
      toast({
        title: "EU data debug failed",
        description: "Failed to fetch EU debug data",
        variant: "destructive",
      });
    } finally {
      setLoadingEu(false);
    }
  };

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                Diagnostics Panel
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={runHealthCheck}
                  disabled={loadingHealth}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {loadingHealth ? 'Testing...' : 'Run ENTSO-E Health Check'}
                </Button>
                
                <Button
                  onClick={runEnergyDebug}
                  disabled={loadingEnergy}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <TestTube className="w-4 h-4" />
                  {loadingEnergy ? 'Fetching...' : 'Fetch Energy-Data (Debug)'}
                </Button>
                
                <Button
                  onClick={runEuDataDebug}
                  disabled={loadingEu}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  {loadingEu ? 'Fetching...' : 'Fetch EU Data (Debug)'}
                </Button>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={testEntsoeSEMQuarter}
                  disabled={loadingHealth}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {loadingHealth ? 'Testing...' : 'Test ENTSO-E: Ireland (SEM) Quarter'}
                </Button>
                
                <Button
                  onClick={testEntsoeSEMHour}
                  disabled={loadingHealth}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {loadingHealth ? 'Testing...' : 'Test ENTSO-E: Ireland (SEM) Hour'}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Note: "Invalid time interval" errors occur when the requested time window is not available. 
                "Invalid business dimension" errors indicate the EIC codes or flow direction are not supported for that interconnector.
              </p>
            </div>

            {healthResult && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">ENTSO-E Health Check Result:</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(healthResult, null, 2)}
                </pre>
              </div>
            )}

            {energyResult && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Energy-Data Debug Result:</h4>
                
                {energyResult.diagnostics?.icAttempts && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium">Interconnector Test Results:</h5>
                    <div className="border rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2 border-b">Border</th>
                            <th className="text-left p-2 border-b">Status</th>
                            <th className="text-left p-2 border-b">Time</th>
                            <th className="text-left p-2 border-b">Issue</th>
                            <th className="text-left p-2 border-b">URLs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {energyResult.diagnostics.icAttempts.map((attempt: any, idx: number) => (
                            <tr key={idx} className="border-b last:border-b-0">
                              <td className="p-2 font-medium">{attempt.border}</td>
                              <td className="p-2">
                                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${attempt.ok ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {attempt.ok ? 'OK' : 'Failed'}
                              </td>
                              <td className="p-2">{attempt.t ? new Date(attempt.t).toLocaleTimeString() : '—'}</td>
                              <td className="p-2 max-w-32 truncate" title={attempt.reasonText || ''}>{attempt.reasonText || '—'}</td>
                              <td className="p-2 space-x-1">
                                {attempt.intoGB?.url && (
                                  <a href={attempt.intoGB.url} target="_blank" rel="noopener noreferrer" 
                                     className="text-blue-600 hover:underline text-xs">→GB</a>
                                )}
                                {attempt.fromGB?.url && (
                                  <a href={attempt.fromGB.url} target="_blank" rel="noopener noreferrer" 
                                     className="text-blue-600 hover:underline text-xs">GB→</a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(energyResult, null, 2)}
                </pre>
              </div>
            )}

            {euResult && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">EU Data Debug Result:</h4>
                
                {euResult.diagnostics?.euMix && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium">EU Generation Mix Status:</h5>
                    <div className="text-xs bg-muted/50 p-2 rounded">
                      <p><strong>Countries Tried:</strong> {euResult.diagnostics.euMix.count || 0}</p>
                      <p><strong>Countries with Data:</strong> {euResult.diagnostics.euMix.sampleCountries?.length || 0}</p>
                      <p><strong>Sample Countries:</strong> {euResult.diagnostics.euMix.sampleCountries?.join(', ') || 'None'}</p>
                    </div>
                  </div>
                )}
                
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(euResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};