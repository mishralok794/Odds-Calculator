// ──────────────────────────────────────────────
// LocalStorage Utilities
// ──────────────────────────────────────────────

import type { SavedCalculation, UserPreferences } from '../types';
import { DEFAULT_PREFERENCES } from '../types';

const STORAGE_KEYS = {
  PREFERENCES: 'oddspilot_preferences',
  CALCULATIONS: 'oddspilot_calculations',
} as const;

// ── Preferences ──

export function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch {
    // Return defaults on parse error
  }
  return { ...DEFAULT_PREFERENCES };
}

export function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
  } catch {
    console.warn('Failed to save preferences to localStorage');
  }
}

// ── Saved Calculations ──

export function loadCalculations(): SavedCalculation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CALCULATIONS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Return empty on parse error
  }
  return [];
}

export function saveCalculations(calcs: SavedCalculation[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CALCULATIONS, JSON.stringify(calcs));
  } catch {
    console.warn('Failed to save calculations to localStorage');
  }
}

export function addCalculation(calc: SavedCalculation): void {
  const calcs = loadCalculations();
  calcs.unshift(calc);
  saveCalculations(calcs);
}

export function updateCalculation(calc: SavedCalculation): void {
  const calcs = loadCalculations();
  const idx = calcs.findIndex((c) => c.id === calc.id);
  if (idx >= 0) {
    calcs[idx] = calc;
    saveCalculations(calcs);
  }
}

export function deleteCalculation(id: string): void {
  const calcs = loadCalculations().filter((c) => c.id !== id);
  saveCalculations(calcs);
}

export function exportCalculationsJSON(): string {
  return JSON.stringify(loadCalculations(), null, 2);
}

export function exportCalculationsCSV(): string {
  const calcs = loadCalculations();
  if (calcs.length === 0) return '';

  const headers = ['id', 'name', 'type', 'sport', 'event', 'createdAt', 'updatedAt', 'notes'];
  const rows = calcs.map((c) =>
    headers.map((h) => {
      const val = c[h as keyof SavedCalculation];
      if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
      return String(val ?? '');
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function importCalculations(json: string): SavedCalculation[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Invalid JSON
  }
  return [];
}

// ── Utility ──

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format a number as currency with the given symbol.
 */
export function formatCurrency(amount: number, symbol: string = '$'): string {
  const formatted = Math.abs(amount).toFixed(2);
  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${formatted}`;
}

/**
 * Format probability as percentage.
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
