import { describe, expect, it } from 'vitest';
import { analyzeStrategy } from '../utils/strategyAnalyzer';
import { STRATEGY_SAMPLES } from '../utils/strategySamples';

describe('Betting strategy analyzer', () => {
  it('matches the required Player B example without counting recovery as a normal win', () => {
    const result = analyzeStrategy([1, 1, 0, 1, 0, 0, 2, 1]);
    expect(result.history.map((ball) => ball.playerB.status)).toEqual([
      'WIN', 'WIN', 'LOSS', 'RECOVERY', 'LOSS', 'HOLD', 'RECOVERY', 'WIN',
    ]);
    expect(result.playerB.wins).toBe(3);
    expect(result.playerB.losses).toBe(2);
    expect(result.playerB.recoveries).toBe(2);
    expect(result.playerB.holds).toBe(1);
    expect(result.playerB.pendingRecovery).toBe(0);
    expect(result.playerB.netProfitLoss).toBeCloseTo(9, 10);
  });

  it('holds on opposite outcomes without investing again and leaves pending recovery intact', () => {
    const result = analyzeStrategy([0, 0, 0]);
    expect(result.history.map((ball) => ball.playerB.status)).toEqual(['LOSS', 'HOLD', 'HOLD']);
    expect(result.playerB.lossInvestment).toBe(10);
    expect(result.playerB.totalInvestment).toBe(10);
    expect(result.playerB.pendingRecovery).toBe(10);
    expect(result.playerB.nextRequiredBet).toBeCloseTo(10 / 0.3, 10);
  });

  it('keeps each player recovery state independent and reconciles per-ball net', () => {
    const result = analyzeStrategy([0, 1, 0]);
    expect(result.history.map((ball) => ball.playerA.status)).toEqual(['WIN', 'LOSS', 'RECOVERY']);
    expect(result.history.map((ball) => ball.playerB.status)).toEqual(['LOSS', 'RECOVERY', 'LOSS']);
    for (const player of [result.playerA, result.playerB]) {
      const history = result.history.map((ball) => player.player === 'A' ? ball.playerA : ball.playerB);
      expect(history.reduce((sum, item) => sum + item.net, 0)).toBeCloseTo(player.netProfitLoss, 10);
      expect(player.totalReturn - player.totalInvestment).toBeCloseTo(player.netProfitLoss, 10);
    }
  });

  it('handles empty input and rejects invalid ball values', () => {
    const empty = analyzeStrategy([]);
    expect(empty.playerA.roi).toBe(0);
    expect(empty.playerB.roi).toBe(0);
    expect(() => analyzeStrategy([0, 7])).toThrow();
    expect(() => analyzeStrategy([1.5])).toThrow();
  });

  it('provides at least twenty complete 120-ball sample scenarios', () => {
    expect(STRATEGY_SAMPLES.length).toBeGreaterThanOrEqual(20);
    for (const sample of STRATEGY_SAMPLES) {
      expect(sample.outcomes).toHaveLength(120);
      expect(sample.outcomes.every((outcome) => Number.isInteger(outcome) && outcome >= 0 && outcome <= 6)).toBe(true);
    }
  });
});
