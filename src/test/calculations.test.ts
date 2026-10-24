// ──────────────────────────────────────────────
// Comprehensive Unit Tests for Calculation Engine
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  isValidDecimalOdds,
  isValidStake,
  calcGrossReturn,
  calcNetProfit,
  calcAggregates,
  calcHedge,
  roundStake,
  calcRoundedHedgeResults,
} from '../utils/hedgeCalc';
import {
  convertOdds,
  decimalToImpliedProbability,
  decimalToFractional,
  decimalToAmerican,
  fractionalToDecimal,
  americanToDecimal,
} from '../utils/oddsConverter';
import { calcArbitrage } from '../utils/arbitrageCalc';
import { calcProbability } from '../utils/probabilityCalc';
import type { ExistingBet } from '../types';

// ── Helper ──
function makeBet(
  id: string,
  stake: number,
  odds: number,
  name = 'Team A'
): ExistingBet {
  return { id, selectionName: name, stake, decimalOdds: odds };
}

// ══════════════════════════════════════════════
// 1. VALIDATION
// ══════════════════════════════════════════════

describe('Validation', () => {
  it('accepts valid decimal odds', () => {
    expect(isValidDecimalOdds(1.01)).toBe(true);
    expect(isValidDecimalOdds(2.5)).toBe(true);
    expect(isValidDecimalOdds(100)).toBe(true);
  });

  it('rejects invalid decimal odds', () => {
    expect(isValidDecimalOdds(1.0)).toBe(false);
    expect(isValidDecimalOdds(0.5)).toBe(false);
    expect(isValidDecimalOdds(0)).toBe(false);
    expect(isValidDecimalOdds(-1)).toBe(false);
    expect(isValidDecimalOdds(NaN)).toBe(false);
    expect(isValidDecimalOdds(Infinity)).toBe(false);
  });

  it('validates stakes correctly', () => {
    expect(isValidStake(1)).toBe(true);
    expect(isValidStake(0.01)).toBe(true);
    expect(isValidStake(0)).toBe(false);
    expect(isValidStake(-5)).toBe(false);
    expect(isValidStake(NaN)).toBe(false);
  });
});

// ══════════════════════════════════════════════
// 2. SINGLE BET CALCULATIONS
// ══════════════════════════════════════════════

describe('Single bet calculations', () => {
  it('calculates gross return', () => {
    expect(calcGrossReturn(10, 2.5)).toBe(25);
    expect(calcGrossReturn(15, 2.8)).toBeCloseTo(42, 10);
  });

  it('calculates net profit', () => {
    expect(calcNetProfit(10, 2.5)).toBe(15);
    expect(calcNetProfit(15, 2.8)).toBeCloseTo(27, 10);
  });
});

// ══════════════════════════════════════════════
// 3. ONE EXISTING BET HEDGE
// ══════════════════════════════════════════════

describe('Single bet hedge', () => {
  it('calculates correct hedge for one bet', () => {
    const bets = [makeBet('1', 100, 3.0)];
    const result = calcHedge(bets, 1.5, 0);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.totalStake).toBe(100);
    expect(result.totalGrossReturn).toBe(300);

    // H = 300 / (1 + 0.5) = 200
    expect(result.suggestedHedgeStake).toBeCloseTo(200, 10);

    // P_A = 300 - 100 - 200 = 0
    expect(result.netIfOriginalWins).toBeCloseTo(0, 10);

    // P_B = 200 × 0.5 - 100 = 0
    expect(result.netIfOppositeWins).toBeCloseTo(0, 10);

    expect(result.isBreakEven).toBe(true);
    expect(result.isGuaranteedProfit).toBe(false);
    expect(result.isGuaranteedLoss).toBe(false);
  });
});

// ══════════════════════════════════════════════
// 4. MULTIPLE BETS WITH DIFFERENT ODDS
// ══════════════════════════════════════════════

describe('Multiple bets with different odds', () => {
  it('matches the spec example: $15 @ 2.80, $4 @ 3.45, opposite 1.35, 0% comm', () => {
    const bets = [
      makeBet('1', 15, 2.8),
      makeBet('2', 4, 3.45),
    ];
    const result = calcHedge(bets, 1.35, 0);
    expect(result).not.toBeNull();
    if (!result) return;

    // S = 15 + 4 = 19
    expect(result.totalStake).toBeCloseTo(19, 10);

    // R = 15 × 2.80 + 4 × 3.45 = 42 + 13.80 = 55.80
    expect(result.totalGrossReturn).toBeCloseTo(55.8, 10);

    // H = 55.80 / (1 + 0.35) = 55.80 / 1.35 ≈ 41.3333...
    expect(result.suggestedHedgeStake).toBeCloseTo(41.3333, 3);

    // P_A = 55.80 - 19 - 41.3333 ≈ -4.5333
    expect(result.netIfOriginalWins).toBeCloseTo(-4.5333, 3);

    // P_B = 41.3333 × 0.35 - 19 ≈ 14.4667 - 19 ≈ -4.5333
    expect(result.netIfOppositeWins).toBeCloseTo(-4.5333, 3);

    // Equalized result ≈ -4.53
    expect(result.equalizedResult).toBeCloseTo(-4.5333, 3);

    expect(result.isBreakEven).toBe(false);
    expect(result.isGuaranteedLoss).toBe(true);
    expect(result.isGuaranteedProfit).toBe(false);
  });

  it('handles three existing bets: $15 @ 2.80, $4 @ 3.45, $10 @ 2.10', () => {
    const bets = [
      makeBet('1', 15, 2.8),
      makeBet('2', 4, 3.45),
      makeBet('3', 10, 2.1),
    ];
    const result = calcHedge(bets, 1.35, 0);
    expect(result).not.toBeNull();
    if (!result) return;

    // S = 29
    expect(result.totalStake).toBeCloseTo(29, 10);

    // R = 42 + 13.80 + 21 = 76.80
    expect(result.totalGrossReturn).toBeCloseTo(76.8, 10);

    // H = 76.80 / 1.35 ≈ 56.8889
    expect(result.suggestedHedgeStake).toBeCloseTo(56.8889, 3);
  });
});

// ══════════════════════════════════════════════
// 5. LOW OPPOSITE-SIDE ODDS
// ══════════════════════════════════════════════

describe('Low opposite-side odds', () => {
  it('handles very low opposite odds (1.05)', () => {
    const bets = [makeBet('1', 50, 4.0)];
    const result = calcHedge(bets, 1.05, 0);
    expect(result).not.toBeNull();
    if (!result) return;

    // H = 200 / (1 + 0.05) = 200 / 1.05 ≈ 190.476
    expect(result.suggestedHedgeStake).toBeCloseTo(190.476, 2);

    // Large hedge stake required, likely a loss
    expect(result.equalizedResult).toBeLessThan(0);
  });
});

// ══════════════════════════════════════════════
// 6. HIGH OPPOSITE-SIDE ODDS
// ══════════════════════════════════════════════

describe('High opposite-side odds', () => {
  it('handles high opposite odds (5.0) — potential profit', () => {
    const bets = [makeBet('1', 50, 4.0)];
    const result = calcHedge(bets, 5.0, 0);
    expect(result).not.toBeNull();
    if (!result) return;

    // H = 200 / (1 + 4) = 40
    expect(result.suggestedHedgeStake).toBeCloseTo(40, 10);

    // P_A = 200 - 50 - 40 = 110
    expect(result.netIfOriginalWins).toBeCloseTo(110, 10);

    // P_B = 40 × 4 - 50 = 110
    expect(result.netIfOppositeWins).toBeCloseTo(110, 10);

    expect(result.isGuaranteedProfit).toBe(true);
  });
});

// ══════════════════════════════════════════════
// 7. ZERO COMMISSION
// ══════════════════════════════════════════════

describe('Commission = 0', () => {
  it('produces symmetric results with zero commission', () => {
    const bets = [makeBet('1', 100, 2.0)];
    const result = calcHedge(bets, 2.0, 0);
    expect(result).not.toBeNull();
    if (!result) return;

    // H = 200 / (1 + 1) = 100
    expect(result.suggestedHedgeStake).toBeCloseTo(100, 10);

    // Both outcomes = 0
    expect(result.netIfOriginalWins).toBeCloseTo(0, 10);
    expect(result.netIfOppositeWins).toBeCloseTo(0, 10);
    expect(result.isBreakEven).toBe(true);
  });
});

// ══════════════════════════════════════════════
// 8. NONZERO COMMISSION
// ══════════════════════════════════════════════

describe('Nonzero commission', () => {
  it('adjusts hedge for 5% commission', () => {
    const bets = [makeBet('1', 100, 3.0)];
    const result = calcHedge(bets, 2.0, 0.05);
    expect(result).not.toBeNull();
    if (!result) return;

    // effectiveMultiplier = (2-1) × (1-0.05) = 0.95
    // H = 300 / (1 + 0.95) = 300 / 1.95 ≈ 153.846
    expect(result.suggestedHedgeStake).toBeCloseTo(153.846, 2);

    // P_A = 300 - 100 - 153.846 ≈ 46.154
    expect(result.netIfOriginalWins).toBeCloseTo(46.154, 2);

    // P_B = 153.846 × 0.95 - 100 ≈ 146.154 - 100 ≈ 46.154
    expect(result.netIfOppositeWins).toBeCloseTo(46.154, 2);

    // Both outcomes should be equal
    expect(result.netIfOriginalWins).toBeCloseTo(
      result.netIfOppositeWins,
      10
    );
  });

  it('commission reduces equalized profit', () => {
    const bets = [makeBet('1', 100, 3.0)];
    const noComm = calcHedge(bets, 2.0, 0);
    const withComm = calcHedge(bets, 2.0, 0.05);
    expect(noComm).not.toBeNull();
    expect(withComm).not.toBeNull();
    if (!noComm || !withComm) return;

    // With commission, hedge stake is higher and profit may be lower
    expect(withComm.suggestedHedgeStake).toBeGreaterThan(
      noComm.suggestedHedgeStake
    );
  });
});

// ══════════════════════════════════════════════
// 9. INVALID ODDS
// ══════════════════════════════════════════════

describe('Invalid odds below 1.01', () => {
  it('returns null for invalid opposite odds', () => {
    const bets = [makeBet('1', 100, 2.0)];
    expect(calcHedge(bets, 0.5, 0)).toBeNull();
    expect(calcHedge(bets, 1.0, 0)).toBeNull();
    expect(calcHedge(bets, -1, 0)).toBeNull();
  });

  it('ignores bets with invalid odds in aggregate', () => {
    const bets = [
      makeBet('1', 100, 2.0),
      makeBet('2', 50, 0.5), // Invalid — should be skipped
    ];
    const result = calcHedge(bets, 2.0, 0);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.totalStake).toBe(100);
    expect(result.totalGrossReturn).toBe(200);
  });
});

// ══════════════════════════════════════════════
// 10. ZERO STAKE
// ══════════════════════════════════════════════

describe('Zero stake', () => {
  it('returns null for zero-stake bets only', () => {
    const bets = [makeBet('1', 0, 2.0)];
    const result = calcHedge(bets, 2.0, 0);
    expect(result).toBeNull();
  });

  it('ignores zero-stake bets among valid ones', () => {
    const bets = [
      makeBet('1', 100, 2.0),
      makeBet('2', 0, 3.0), // Should be skipped
    ];
    const result = calcHedge(bets, 2.0, 0);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.totalStake).toBe(100);
  });
});

// ══════════════════════════════════════════════
// 11. EMPTY ROWS
// ══════════════════════════════════════════════

describe('Empty bet rows', () => {
  it('returns null for empty bet array', () => {
    expect(calcHedge([], 2.0, 0)).toBeNull();
  });
});

// ══════════════════════════════════════════════
// 12. CUSTOM HEDGE STAKE
// ══════════════════════════════════════════════

describe('Custom hedge stake', () => {
  it('calculates results for a user-specified hedge stake', () => {
    const bets = [makeBet('1', 100, 3.0)];
    const result = calcHedge(bets, 2.0, 0, 150);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.customHedgeStake).toBe(150);
    // P_A custom = 300 - 100 - 150 = 50
    expect(result.customNetIfOriginalWins).toBeCloseTo(50, 10);
    // P_B custom = 150 × 1 - 100 = 50
    expect(result.customNetIfOppositeWins).toBeCloseTo(50, 10);
  });

  it('custom stake differs from suggested', () => {
    const bets = [makeBet('1', 100, 3.0)];
    const result = calcHedge(bets, 2.0, 0, 100);
    expect(result).not.toBeNull();
    if (!result) return;

    // Suggested: H = 300 / (1+1) = 150, custom = 100
    expect(result.suggestedHedgeStake).toBeCloseTo(150, 10);
    expect(result.customHedgeStake).toBe(100);

    // Custom: P_A = 300-100-100 = 100, P_B = 100×1-100 = 0
    expect(result.customNetIfOriginalWins).toBeCloseTo(100, 10);
    expect(result.customNetIfOppositeWins).toBeCloseTo(0, 10);
  });
});

// ══════════════════════════════════════════════
// 13. DECIMAL ROUNDING
// ══════════════════════════════════════════════

describe('Stake rounding', () => {
  it('rounds to nearest $0.01', () => {
    expect(roundStake(41.3333, 0.01)).toBeCloseTo(41.33, 2);
  });

  it('rounds to nearest $0.10', () => {
    expect(roundStake(41.3333, 0.1)).toBeCloseTo(41.3, 1);
  });

  it('rounds to nearest $1.00', () => {
    expect(roundStake(41.3333, 1)).toBe(41);
  });

  it('shows effect of rounding on results', () => {
    const rounded = roundStake(41.3333, 1);
    const results = calcRoundedHedgeResults(19, 55.8, rounded, 1.35, 0);

    // With rounded stake of 41:
    // P_A = 55.8 - 19 - 41 = -4.2
    expect(results.netIfOriginalWins).toBeCloseTo(-4.2, 10);

    // P_B = 41 × 0.35 - 19 = 14.35 - 19 = -4.65
    expect(results.netIfOppositeWins).toBeCloseTo(-4.65, 10);

    // Not exactly equalized anymore
    expect(results.netIfOriginalWins).not.toBeCloseTo(
      results.netIfOppositeWins,
      1
    );
  });
});

// ══════════════════════════════════════════════
// 14. BREAK-EVEN CLASSIFICATION
// ══════════════════════════════════════════════

describe('Break-even classification', () => {
  it('correctly identifies break-even', () => {
    // When total return equals stake × opposite odds, break-even is exact
    const bets = [makeBet('1', 100, 2.0)];
    const result = calcHedge(bets, 2.0, 0);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.isBreakEven).toBe(true);
    expect(result.isGuaranteedProfit).toBe(false);
    expect(result.isGuaranteedLoss).toBe(false);
  });

  it('correctly identifies guaranteed profit', () => {
    const bets = [makeBet('1', 50, 4.0)];
    const result = calcHedge(bets, 5.0, 0);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.isBreakEven).toBe(false);
    expect(result.isGuaranteedProfit).toBe(true);
    expect(result.isGuaranteedLoss).toBe(false);
  });

  it('correctly identifies guaranteed loss', () => {
    const bets = [makeBet('1', 15, 2.8), makeBet('2', 4, 3.45)];
    const result = calcHedge(bets, 1.35, 0);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.isBreakEven).toBe(false);
    expect(result.isGuaranteedProfit).toBe(false);
    expect(result.isGuaranteedLoss).toBe(true);
  });
});

// ══════════════════════════════════════════════
// 15. ODDS CONVERSION
// ══════════════════════════════════════════════

describe('Odds Converter', () => {
  it('converts decimal to implied probability', () => {
    expect(decimalToImpliedProbability(2.0)).toBeCloseTo(0.5, 10);
    expect(decimalToImpliedProbability(4.0)).toBeCloseTo(0.25, 10);
    expect(decimalToImpliedProbability(1.5)).toBeCloseTo(0.6667, 3);
  });

  it('converts decimal to fractional', () => {
    expect(decimalToFractional(2.0)).toBe('1/1');
    expect(decimalToFractional(3.0)).toBe('2/1');
    expect(decimalToFractional(1.5)).toBe('1/2');
  });

  it('converts decimal to American', () => {
    expect(decimalToAmerican(2.0)).toBe('+100');
    expect(decimalToAmerican(3.0)).toBe('+200');
    expect(decimalToAmerican(1.5)).toBe('-200');
  });

  it('converts fractional to decimal', () => {
    expect(fractionalToDecimal('1/1')).toBeCloseTo(2.0, 10);
    expect(fractionalToDecimal('5/1')).toBeCloseTo(6.0, 10);
    expect(fractionalToDecimal('1/4')).toBeCloseTo(1.25, 10);
  });

  it('converts American to decimal', () => {
    expect(americanToDecimal('+100')).toBeCloseTo(2.0, 10);
    expect(americanToDecimal('+200')).toBeCloseTo(3.0, 10);
    expect(americanToDecimal('-200')).toBeCloseTo(1.5, 10);
    expect(americanToDecimal('-100')).toBeCloseTo(2.0, 10);
  });

  it('round-trips conversions', () => {
    const result = convertOdds('2.5', 'decimal');
    expect(result).not.toBeNull();
    if (!result) return;

    const fromFrac = convertOdds(result.fractional, 'fractional');
    expect(fromFrac).not.toBeNull();
    if (!fromFrac) return;
    expect(fromFrac.decimal).toBeCloseTo(2.5, 5);

    const fromAmerican = convertOdds(result.american, 'american');
    expect(fromAmerican).not.toBeNull();
    if (!fromAmerican) return;
    expect(fromAmerican.decimal).toBeCloseTo(2.5, 0); // American rounds to integer
  });

  it('rejects invalid inputs', () => {
    expect(convertOdds('0.5', 'decimal')).toBeNull();
    expect(convertOdds('abc', 'decimal')).toBeNull();
    expect(convertOdds('invalid', 'fractional')).toBeNull();
    expect(convertOdds('0', 'american')).toBeNull();
  });
});

// ══════════════════════════════════════════════
// 16. ARBITRAGE
// ══════════════════════════════════════════════

describe('Arbitrage Calculator', () => {
  it('detects arbitrage when implied sum < 1', () => {
    const outcomes = [
      { name: 'Team A', decimalOdds: 2.2 },
      { name: 'Team B', decimalOdds: 2.2 },
    ];
    const result = calcArbitrage(outcomes, 100);
    expect(result).not.toBeNull();
    if (!result) return;

    // 1/2.2 + 1/2.2 ≈ 0.909 < 1
    expect(result.isArbitrage).toBe(true);
    expect(result.profit).toBeGreaterThan(0);
  });

  it('detects no arbitrage when implied sum > 1', () => {
    const outcomes = [
      { name: 'Team A', decimalOdds: 1.5 },
      { name: 'Team B', decimalOdds: 2.0 },
    ];
    const result = calcArbitrage(outcomes, 100);
    expect(result).not.toBeNull();
    if (!result) return;

    // 1/1.5 + 1/2.0 = 0.667 + 0.5 = 1.167 > 1
    expect(result.isArbitrage).toBe(false);
    expect(result.profit).toBeLessThan(0);
  });

  it('handles three-outcome arbitrage', () => {
    const outcomes = [
      { name: 'Home', decimalOdds: 3.5 },
      { name: 'Draw', decimalOdds: 4.0 },
      { name: 'Away', decimalOdds: 3.5 },
    ];
    const result = calcArbitrage(outcomes, 100);
    expect(result).not.toBeNull();
    if (!result) return;

    // 1/3.5 + 1/4 + 1/3.5 ≈ 0.286 + 0.25 + 0.286 = 0.821 < 1
    expect(result.isArbitrage).toBe(true);
  });

  it('returns null for insufficient outcomes', () => {
    expect(
      calcArbitrage([{ name: 'Only', decimalOdds: 2.0 }], 100)
    ).toBeNull();
  });
});

// ══════════════════════════════════════════════
// 17. PROBABILITY CALCULATOR
// ══════════════════════════════════════════════

describe('Probability Calculator', () => {
  it('calculates implied probability and returns', () => {
    const result = calcProbability(2.5, 100);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.impliedProbability).toBeCloseTo(0.4, 10);
    expect(result.grossReturn).toBe(250);
    expect(result.netProfit).toBe(150);
  });

  it('calculates expected value with user estimate', () => {
    const result = calcProbability(2.5, 100, 0.5);
    expect(result).not.toBeNull();
    if (!result) return;

    // EV = 0.5 × 150 - 0.5 × 100 = 75 - 50 = 25
    expect(result.expectedValue).toBeCloseTo(25, 10);
    expect(result.probabilityDifference).toBeCloseTo(0.1, 10);
  });

  it('handles negative EV', () => {
    const result = calcProbability(2.5, 100, 0.3);
    expect(result).not.toBeNull();
    if (!result) return;

    // EV = 0.3 × 150 - 0.7 × 100 = 45 - 70 = -25
    expect(result.expectedValue).toBeCloseTo(-25, 10);
  });

  it('returns null for invalid inputs', () => {
    expect(calcProbability(0.5, 100)).toBeNull();
    expect(calcProbability(2.0, 0)).toBeNull();
    expect(calcProbability(2.0, -10)).toBeNull();
  });
});

// ══════════════════════════════════════════════
// 18. TWO-WAY VS THREE-WAY HANDLING
// ══════════════════════════════════════════════

describe('Two-way vs three-way market', () => {
  it('two-way hedge fully covers both outcomes', () => {
    const bets = [makeBet('1', 100, 2.5)];
    const result = calcHedge(bets, 1.8, 0);
    expect(result).not.toBeNull();
    if (!result) return;

    // Both outcomes are modeled
    expect(result.netIfOriginalWins).toBeCloseTo(result.netIfOppositeWins, 5);
  });

  // Three-way markets need explicit handling by the UI layer
  // The calcHedge function operates on a single opposite outcome
  // The UI should warn about uncovered outcomes
});

// ══════════════════════════════════════════════
// 19. VOIDED / UNSUPPORTED SETTLEMENT
// ══════════════════════════════════════════════

describe('Voided / unsupported settlement', () => {
  // These are UI-layer concerns; the engine provides the math
  // Verify that the engine handles edge cases gracefully

  it('returns null for NaN odds', () => {
    const bets = [makeBet('1', 100, NaN)];
    expect(calcHedge(bets, 2.0, 0)).toBeNull();
  });

  it('returns null when all bets invalid', () => {
    const bets = [
      makeBet('1', 0, 2.0),
      makeBet('2', -10, 3.0),
    ];
    expect(calcHedge(bets, 2.0, 0)).toBeNull();
  });
});
