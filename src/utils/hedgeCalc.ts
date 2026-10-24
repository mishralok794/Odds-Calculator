// ──────────────────────────────────────────────
// Hedge Calculation Engine
// ──────────────────────────────────────────────
// All calculations use full precision internally.
// Display formatting happens in the UI layer only.

import type {
  ExistingBet,
  HedgeCalculation,
} from '../types';

const BREAK_EVEN_TOLERANCE = 0.005; // $0.005

/**
 * Validates a decimal odds value.
 * Valid decimal odds must be > 1.0 (strictly).
 * Returns true if valid.
 */
export function isValidDecimalOdds(odds: number): boolean {
  return typeof odds === 'number' && isFinite(odds) && odds >= 1.01;
}

/**
 * Validates a stake value. Must be a positive finite number.
 */
export function isValidStake(stake: number): boolean {
  return typeof stake === 'number' && isFinite(stake) && stake > 0;
}

/**
 * Calculate the gross return for a single bet.
 * grossReturn = stake × odds
 */
export function calcGrossReturn(stake: number, decimalOdds: number): number {
  return stake * decimalOdds;
}

/**
 * Calculate the net profit for a single bet.
 * netProfit = stake × (odds - 1)
 */
export function calcNetProfit(stake: number, decimalOdds: number): number {
  return stake * (decimalOdds - 1);
}

/**
 * Calculate the aggregate totals from multiple existing bets.
 * S = sum of all stakes
 * R = sum of (stake_i × odds_i) — total gross return if all bets win
 */
export function calcAggregates(bets: ExistingBet[]): {
  totalStake: number;
  totalGrossReturn: number;
  individualReturns: { betId: string; grossReturn: number; netProfit: number }[];
} {
  const validBets = bets.filter(
    (b) => isValidStake(b.stake) && isValidDecimalOdds(b.decimalOdds)
  );

  const totalStake = validBets.reduce((sum, b) => sum + b.stake, 0);
  const totalGrossReturn = validBets.reduce(
    (sum, b) => sum + b.stake * b.decimalOdds,
    0
  );
  const individualReturns = validBets.map((b) => ({
    betId: b.id,
    grossReturn: calcGrossReturn(b.stake, b.decimalOdds),
    netProfit: calcNetProfit(b.stake, b.decimalOdds),
  }));

  return { totalStake, totalGrossReturn, individualReturns };
}

/**
 * Calculate the equal-outcome hedge stake and results.
 *
 * Given:
 *   S = total stake on existing bets
 *   R = total gross return if existing selection wins
 *   O = decimal odds on the opposite selection
 *   c = commission rate (0–1) on opposite selection winnings
 *
 * Net if original wins:   P_A = R - S - H
 * Net if opposite wins:   P_B = H × (O-1) × (1-c) - S
 *
 * Equalized hedge:        H = R / [1 + (O-1)(1-c)]
 * Equalized result:       P = R / [1 + (O-1)(1-c)] × (O-1)(1-c) - S
 *                           = R - S - R / [1 + (O-1)(1-c)]
 */
export function calcHedge(
  bets: ExistingBet[],
  oppositeOdds: number,
  commission: number = 0,
  customHedgeStake?: number
): HedgeCalculation | null {
  // Validate opposite odds
  if (!isValidDecimalOdds(oppositeOdds)) return null;

  const { totalStake, totalGrossReturn, individualReturns } =
    calcAggregates(bets);

  // Need at least one valid bet
  if (totalStake === 0 || totalGrossReturn === 0) return null;

  const S = totalStake;
  const R = totalGrossReturn;
  const O = oppositeOdds;
  const c = Math.max(0, Math.min(1, commission));

  // Effective multiplier for opposite selection
  const effectiveMultiplier = (O - 1) * (1 - c);

  // Equal-outcome hedge stake
  const H = R / (1 + effectiveMultiplier);

  // Net results with equalized hedge
  const netIfOriginalWins = R - S - H;
  const netIfOppositeWins = H * effectiveMultiplier - S;
  const equalizedResult = netIfOriginalWins; // Should equal netIfOppositeWins

  // Unhedged results
  const unhedgedProfitIfWin = R - S;
  const unhedgedLossIfLose = -S;

  // Classification
  const isBreakEven = Math.abs(equalizedResult) <= BREAK_EVEN_TOLERANCE;
  const isGuaranteedProfit = equalizedResult > BREAK_EVEN_TOLERANCE;
  const isGuaranteedLoss = equalizedResult < -BREAK_EVEN_TOLERANCE;

  const totalExposure = S + H;

  const result: HedgeCalculation = {
    totalStake: S,
    totalGrossReturn: R,
    individualReturns,
    unhedgedProfitIfWin,
    unhedgedLossIfLose,
    suggestedHedgeStake: H,
    netIfOriginalWins,
    netIfOppositeWins,
    equalizedResult,
    totalExposure,
    isBreakEven,
    isGuaranteedProfit,
    isGuaranteedLoss,
  };

  // Custom hedge stake calculations
  if (customHedgeStake !== undefined && isValidStake(customHedgeStake)) {
    result.customHedgeStake = customHedgeStake;
    result.customNetIfOriginalWins = R - S - customHedgeStake;
    result.customNetIfOppositeWins =
      customHedgeStake * effectiveMultiplier - S;
  }

  return result;
}

/**
 * Round a stake to the nearest increment.
 */
export function roundStake(stake: number, increment: number): number {
  if (increment <= 0) return stake;
  return Math.round(stake / increment) * increment;
}

/**
 * Calculate hedged results using a rounded stake.
 * Returns the net results for each outcome with the rounded stake.
 */
export function calcRoundedHedgeResults(
  totalStake: number,
  totalGrossReturn: number,
  roundedHedgeStake: number,
  oppositeOdds: number,
  commission: number = 0
): { netIfOriginalWins: number; netIfOppositeWins: number } {
  const effectiveMultiplier = (oppositeOdds - 1) * (1 - commission);
  return {
    netIfOriginalWins: totalGrossReturn - totalStake - roundedHedgeStake,
    netIfOppositeWins: roundedHedgeStake * effectiveMultiplier - totalStake,
  };
}
