import { useState, useEffect } from 'react';

export type UnitPreference = 'GW' | 'MW' | 'MWh';

export interface UserPreferences {
  unit: UnitPreference;
  showHistoricalChart: boolean;
  showInterconnectors: boolean;
  showEUData: boolean;
  refreshFrequency: number; // in minutes
}

const DEFAULT_PREFERENCES: UserPreferences = {
  unit: 'GW',
  showHistoricalChart: true,
  showInterconnectors: true,
  showEUData: true,
  refreshFrequency: 5,
};

const STORAGE_KEY = 'energy-dashboard-preferences';

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [preferences]);

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  return {
    preferences,
    updatePreference,
    resetPreferences,
  };
};
