import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface InterconnectorData {
  name: string;
  country: string;
  flow: number; // Positive = import, Negative = export
  capacity: number;
}

interface InterconnectorFlowsProps {
  data: InterconnectorData[];
}

export const InterconnectorFlows = ({ data }: InterconnectorFlowsProps) => {
  const totalImports = data.filter(item => item.flow > 0).reduce((sum, item) => sum + item.flow, 0);
  const totalExports = Math.abs(data.filter(item => item.flow < 0).reduce((sum, item) => sum + item.flow, 0));

  return (
    <Card className="p-6 bg-gradient-card border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-card-foreground">Interconnector Flows</h2>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-energy-imports/20 to-energy-imports/5 border border-energy-imports/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-5 h-5 text-energy-imports" />
            <span className="text-sm font-medium text-card-foreground">Total Imports</span>
          </div>
          <span className="text-2xl font-bold text-energy-imports">{totalImports.toFixed(1)} MW</span>
        </div>

        <div className="bg-gradient-to-br from-energy-exports/20 to-energy-exports/5 border border-energy-exports/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-energy-exports" />
            <span className="text-sm font-medium text-card-foreground">Total Exports</span>
          </div>
          <span className="text-2xl font-bold text-energy-exports">{totalExports.toFixed(1)} MW</span>
        </div>
      </div>

      {/* Interconnector List */}
      <div className="space-y-3">
        {data
          .sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow))
          .map((interconnector, index) => {
            const isImport = interconnector.flow > 0;
            const flowValue = Math.abs(interconnector.flow);
            const utilization = (flowValue / interconnector.capacity) * 100;
            
            return (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-secondary/30 border border-border rounded-lg hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isImport ? 'bg-energy-imports' : 'bg-energy-exports'}`} />
                  <div>
                    <div className="font-medium text-card-foreground">
                      {interconnector.country} ({interconnector.name})
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Capacity: {interconnector.capacity} MW
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2">
                    {isImport ? (
                      <ArrowDownLeft className="w-4 h-4 text-energy-imports" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-energy-exports" />
                    )}
                    <span className={`text-lg font-bold ${isImport ? 'text-energy-imports' : 'text-energy-exports'}`}>
                      {flowValue.toFixed(0)} MW
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {utilization.toFixed(1)}% utilization
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </Card>
  );
};