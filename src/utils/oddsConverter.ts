// ──────────────────────────────────────────────
// Odds Conversion Engine
// ──────────────────────────────────────────────

import type { OddsConversion } from '../types';

/**
 * Convert decimal odds to implied probability.
 * impliedProbability = 1 / decimalOdds
 */
export function decimalToImpliedProbability(decimal: number): number {
  if (decimal < 1.01) return NaN;
  return 1 / decimal;
}

/**
 * Convert decimal odds to fractional string.
 * fractional = (decimal - 1) expressed as a fraction
 */
export function decimalToFractional(decimal: number): string {
  if (decimal < 1.01) return 'Invalid';
  const numerator = decimal - 1;

  // Try to find a clean fraction
  // Multiply by powers of 10 to handle decimals
  const precision = 10000;
  let num = Math.round(numerator * precision);
  let den = precision;

  // GCD to simplify
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.abs(num), den);
  num = num / divisor;
  den = den / divisor;

  if (den === 1) return `${num}/1`;
  return `${num}/${den}`;
}

/**
 * Convert decimal odds to American odds.
 * If decimal >= 2.0: American = (decimal - 1) × 100 → positive
 * If decimal < 2.0: American = -100 / (decimal - 1) → negative
 */
export function decimalToAmerican(decimal: number): string {
  if (decimal < 1.01) return 'Invalid';
  if (decimal >= 2.0) {
    const american = (decimal - 1) * 100;
    return `+${Math.round(american)}`;
  } else {
    const american = -100 / (decimal - 1);
    return `${Math.round(american)}`;
  }
}

/**
 * Convert fractional odds string to decimal.
 * decimal = (numerator / denominator) + 1
 */
export function fractionalToDecimal(fractional: string): number {
  const parts = fractional.split('/');
  if (parts.length !== 2) return NaN;
  const num = parseFloat(parts[0]);
  const den = parseFloat(parts[1]);
  if (isNaN(num) || isNaN(den) || den === 0) return NaN;
  const decimal = num / den + 1;
  if (decimal < 1.01) return NaN;
  return decimal;
}

/**
 * Convert American odds string to decimal.
 * If positive: decimal = (american / 100) + 1
 * If negative: decimal = (100 / |american|) + 1
 */
export function americanToDecimal(american: string): number {
  const cleaned = american.replace(/\+/g, '').trim();
  const value = parseFloat(cleaned);
  if (isNaN(value) || value === 0) return NaN;

  let decimal: number;
  if (value > 0) {
    decimal = value / 100 + 1;
  } else {
    decimal = 100 / Math.abs(value) + 1;
  }

  if (decimal < 1.01) return NaN;
  return decimal;
}

/**
 * Full odds conversion from decimal odds.
 */
export function convertFromDecimal(decimal: number): OddsConversion | null {
  if (decimal < 1.01 || !isFinite(decimal)) return null;
  return {
    decimal,
    fractional: decimalToFractional(decimal),
    american: decimalToAmerican(decimal),
    impliedProbability: decimalToImpliedProbability(decimal),
  };
}

/**
 * Convert from any format to all formats.
 */
export function convertOdds(
  value: string,
  fromFormat: 'decimal' | 'fractional' | 'american'
): OddsConversion | null {
  let decimal: number;

  switch (fromFormat) {
    case 'decimal':
      decimal = parseFloat(value);
      break;
    case 'fractional':
      decimal = fractionalToDecimal(value);
      break;
    case 'american':
      decimal = americanToDecimal(value);
      break;
    default:
      return null;
  }

  if (isNaN(decimal) || decimal < 1.01) return null;
  return convertFromDecimal(decimal);
}
