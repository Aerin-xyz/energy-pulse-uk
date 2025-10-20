import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserPreferences, UnitPreference } from '@/hooks/useUserPreferences';

export const UserPreferencesDialog = () => {
  const { preferences, updatePreference, resetPreferences } = useUserPreferences();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          <span className="hidden md:inline">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dashboard Preferences</DialogTitle>
          <DialogDescription>
            Customize how you view your energy data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Unit Preference */}
          <div className="space-y-2">
            <Label htmlFor="unit-select">Display Units</Label>
            <Select
              value={preferences.unit}
              onValueChange={(value) => updatePreference('unit', value as UnitPreference)}
            >
              <SelectTrigger id="unit-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GW">Gigawatts (GW)</SelectItem>
                <SelectItem value="MW">Megawatts (MW)</SelectItem>
                <SelectItem value="MWh">Megawatt-hours (MWh)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose how power values are displayed across the dashboard
            </p>
          </div>

          {/* Chart Visibility */}
          <div className="space-y-3">
            <Label>Visible Components</Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="historical-chart" className="font-normal cursor-pointer">
                Historical Generation Chart
              </Label>
              <Switch
                id="historical-chart"
                checked={preferences.showHistoricalChart}
                onCheckedChange={(checked) => updatePreference('showHistoricalChart', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="interconnectors" className="font-normal cursor-pointer">
                Interconnector Flows
              </Label>
              <Switch
                id="interconnectors"
                checked={preferences.showInterconnectors}
                onCheckedChange={(checked) => updatePreference('showInterconnectors', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="eu-data" className="font-normal cursor-pointer">
                EU Generation Data
              </Label>
              <Switch
                id="eu-data"
                checked={preferences.showEUData}
                onCheckedChange={(checked) => updatePreference('showEUData', checked)}
              />
            </div>
          </div>

          {/* Refresh Frequency */}
          <div className="space-y-2">
            <Label htmlFor="refresh-select">Data Refresh Frequency</Label>
            <Select
              value={preferences.refreshFrequency.toString()}
              onValueChange={(value) => updatePreference('refreshFrequency', parseInt(value))}
            >
              <SelectTrigger id="refresh-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every minute</SelectItem>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="10">Every 10 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often the dashboard should check for new data
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetPreferences}>
            Reset to Defaults
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
