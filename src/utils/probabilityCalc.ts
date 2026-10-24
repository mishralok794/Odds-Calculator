// ──────────────────────────────────────────────
// Probability Calculator
// ──────────────────────────────────────────────

import type { ProbabilityCalcResult } from '../types';
import { isValidDecimalOdds, isValidStake } from './hedgeCalc';
import { decimalToImpliedProbability } from './oddsConverter';

/**
 * Calculate probability-related metrics.
 *
 * @param decimalOdds - the decimal odds
 * @param stake - the stake amount
 * @param estimatedProbability - user-estimated probability (0–1), optional
 */
export function calcProbability(
  decimalOdds: number,
  stake: number,
  estimatedProbability?: number
): ProbabilityCalcResult | null {
  if (!isValidDecimalOdds(decimalOdds) || !isValidStake(stake)) return null;

  const impliedProbability = decimalToImpliedProbability(decimalOdds);
  const grossReturn = stake * decimalOdds;
  const netProfit = stake * (decimalOdds - 1);

  let expectedValue: number | undefined;
  let probabilityDifference: number | undefined;

  if (
    estimatedProbability !== undefined &&
    estimatedProbability > 0 &&
    estimatedProbability <= 1
  ) {
    // EV = (probability × netProfit) - ((1 - probability) × stake)
    expectedValue =
      estimatedProbability * netProfit - (1 - estimatedProbability) * stake;
    probabilityDifference = estimatedProbability - impliedProbability;
  }

  return {
    impliedProbability,
    grossReturn,
    netProfit,
    expectedValue,
    probabilityDifference,
  };
}
