import { useState } from 'react';
import { ChevronDown, ChevronUp, TestTube, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const DiagnosticsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [healthResult, setHealthResult] = useState<any>(null);
  const [energyResult, setEnergyResult] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingEnergy, setLoadingEnergy] = useState(false);
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
        body: { debug: true }
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

  const testEntsoeIreland = async () => {
    setLoadingHealth(true);
    try {
      const { data, error } = await supabase.functions.invoke('entsoe-health', {
        body: { 
          in_Domain: '10Y1001A1001A59C', // IE (Ireland)
          out_Domain: '10YGB----------A', // GB
          minutesBack: 180, // 3 hours back
          alignQuarter: true
        }
      });
      if (error) throw error;
      setHealthResult(data);
      toast({
        title: "ENTSO-E Ireland test completed",
        description: data.ok ? "EWIC interconnector data available" : "Issues with Ireland data",
        variant: data.ok ? "default" : "destructive",
      });
    } catch (error) {
      console.error('ENTSO-E Ireland test failed:', error);
      setHealthResult({ error: error.message });
      toast({
        title: "ENTSO-E Ireland test failed",
        description: "Failed to test Ireland border",
        variant: "destructive",
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  const testEntsoeNorthernIreland = async () => {
    setLoadingHealth(true);
    try {
      const { data, error } = await supabase.functions.invoke('entsoe-health', {
        body: { 
          in_Domain: '10Y1001A1001A016', // Northern Ireland
          out_Domain: '10YGB----------A', // GB
          minutesBack: 180, // 3 hours back
          alignQuarter: true
        }
      });
      if (error) throw error;
      setHealthResult(data);
      toast({
        title: "ENTSO-E Northern Ireland test completed",
        description: data.ok ? "Moyle interconnector data available" : "Issues with Northern Ireland data",
        variant: data.ok ? "default" : "destructive",
      });
    } catch (error) {
      console.error('ENTSO-E Northern Ireland test failed:', error);
      setHealthResult({ error: error.message });
      toast({
        title: "ENTSO-E Northern Ireland test failed",
        description: "Failed to test Northern Ireland border",
        variant: "destructive",
      });
    } finally {
      setLoadingHealth(false);
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
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={testEntsoeIreland}
                  disabled={loadingHealth}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {loadingHealth ? 'Testing...' : 'Test ENTSO-E: Ireland (EWIC)'}
                </Button>
                
                <Button
                  onClick={testEntsoeNorthernIreland}
                  disabled={loadingHealth}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {loadingHealth ? 'Testing...' : 'Test ENTSO-E: Northern Ireland (Moyle)'}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Note: "Invalid time interval" errors are common with ENTSO-E A11 data - this indicates the requested time window is not available yet.
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
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(energyResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};