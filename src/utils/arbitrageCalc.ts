// ──────────────────────────────────────────────
// Arbitrage Calculator
// ──────────────────────────────────────────────

import type { ArbitrageResult } from '../types';
import { isValidDecimalOdds } from './hedgeCalc';

export interface ArbitrageOutcome {
  name: string;
  decimalOdds: number;
  bookmaker?: string;
}

/**
 * Calculate whether arbitrage exists and optimal stake allocation.
 *
 * For outcomes with odds o_1, o_2, ..., o_n:
 * Implied probability sum = Σ (1/o_i)
 * If sum < 1, arbitrage exists before costs.
 *
 * For a total investment of T:
 * Stake on outcome i = T / o_i / Σ(1/o_j)
 * Guaranteed return = T / Σ(1/o_j)
 */
export function calcArbitrage(
  outcomes: ArbitrageOutcome[],
  totalInvestment: number,
  commission: number = 0
): ArbitrageResult | null {
  // Validate
  const validOutcomes = outcomes.filter(
    (o) => o.name.trim() !== '' && isValidDecimalOdds(o.decimalOdds)
  );

  if (validOutcomes.length < 2 || totalInvestment <= 0) return null;

  // Calculate implied probability sum
  const impliedProbabilitySum = validOutcomes.reduce(
    (sum, o) => sum + 1 / o.decimalOdds,
    0
  );

  const isArbitrage = impliedProbabilitySum < 1;
  const margin = (impliedProbabilitySum - 1) * 100; // As percentage

  // Optimal stake allocation
  const stakes = validOutcomes.map((o) => {
    const stake = totalInvestment / (o.decimalOdds * impliedProbabilitySum);
    const potentialReturn = stake * o.decimalOdds;
    return {
      outcome: o.name,
      stake,
      potentialReturn,
    };
  });

  const totalStake = stakes.reduce((sum, s) => sum + s.stake, 0);
  const guaranteedReturn = totalInvestment / impliedProbabilitySum;
  const profit = guaranteedReturn - totalStake;
  const profitPercentage = (profit / totalStake) * 100;

  // After commission
  let afterCommission;
  if (commission > 0) {
    const commissionPerOutcome = stakes.map((s) => {
      const winnings = s.potentialReturn - s.stake;
      return winnings * commission;
    });
    const maxCommission = Math.max(...commissionPerOutcome);
    const adjustedProfit = profit - maxCommission;
    afterCommission = {
      profit: adjustedProfit,
      profitPercentage: (adjustedProfit / totalStake) * 100,
    };
  }

  return {
    impliedProbabilitySum,
    isArbitrage,
    margin,
    stakes,
    totalStake,
    guaranteedReturn,
    profit,
    profitPercentage,
    afterCommission,
  };
}
