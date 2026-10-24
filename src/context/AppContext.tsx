import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserPreferences, SavedCalculation } from '../types';
import { DEFAULT_PREFERENCES } from '../types';
import {
  loadPreferences,
  savePreferences,
  loadCalculations,
  saveCalculations,
  addCalculation as addCalcToStorage,
  deleteCalculation as deleteCalcFromStorage,
  updateCalculation as updateCalcInStorage,
} from '../utils/storage';

interface AppContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  calculations: SavedCalculation[];
  addCalculation: (calc: SavedCalculation) => void;
  updateCalculation: (calc: SavedCalculation) => void;
  deleteCalculation: (id: string) => void;
  refreshCalculations: () => void;
  currencySymbol: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    loadPreferences()
  );
  const [calculations, setCalculations] = useState<SavedCalculation[]>(() =>
    loadCalculations()
  );

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  const updatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      setPreferences((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const addCalculation = useCallback((calc: SavedCalculation) => {
    addCalcToStorage(calc);
    setCalculations(loadCalculations());
  }, []);

  const updateCalculation = useCallback((calc: SavedCalculation) => {
    updateCalcInStorage(calc);
    setCalculations(loadCalculations());
  }, []);

  const deleteCalculation = useCallback((id: string) => {
    deleteCalcFromStorage(id);
    setCalculations(loadCalculations());
  }, []);

  const refreshCalculations = useCallback(() => {
    setCalculations(loadCalculations());
  }, []);

  return (
    <AppContext.Provider
      value={{
        preferences,
        updatePreferences,
        calculations,
        addCalculation,
        updateCalculation,
        deleteCalculation,
        refreshCalculations,
        currencySymbol: preferences.currencySymbol,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
