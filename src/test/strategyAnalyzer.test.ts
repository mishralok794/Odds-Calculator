import { describe, expect, it } from 'vitest';
import { analyzeStrategy } from '../utils/strategyAnalyzer';
import { STRATEGY_SAMPLES } from '../utils/strategySamples';

describe('Betting strategy analyzer', () => {
  it('keeps both recovery bets active in the required Player B example and excludes them from normal wins', () => {
    const result = analyzeStrategy([1, 1, 0, 1, 0, 0, 2, 1]);
    expect(result.history.map((ball) => ball.playerB.status)).toEqual([
      'WIN', 'WIN', 'LOSS', 'RECOVERY', 'LOSS', 'LOSS', 'RECOVERY', 'WIN',
    ]);
    expect(result.playerB.wins).toBe(3);
    expect(result.playerB.losses).toBe(3);
    expect(result.playerB.recoveries).toBe(2);
    expect(result.playerB.pendingRecovery).toBe(0);
    expect(result.playerB.netProfitLoss).toBeCloseTo(9, 10);
  });

  it('places a calculated bet after each consecutive loss and accumulates the lost recovery stake', () => {
    const result = analyzeStrategy([0, 0, 0]);
    expect(result.history.map((ball) => ball.playerB.status)).toEqual(['LOSS', 'LOSS', 'LOSS']);
    const expectedSecondBet = 10 / (1.3 - 1);
    const expectedThirdBet = (10 + expectedSecondBet) / (1.3 - 1);
    expect(result.history[0].playerB.bet).toBe(10);
    expect(result.history[1].playerB.bet).toBeCloseTo(expectedSecondBet, 10);
    expect(result.history[2].playerB.bet).toBeCloseTo(expectedThirdBet, 10);
    expect(result.playerB.lossInvestment).toBe(10);
    expect(result.playerB.recoveryInvestment).toBeCloseTo(expectedSecondBet + expectedThirdBet, 10);
    expect(result.playerB.totalInvestment).toBeCloseTo(10 + expectedSecondBet + expectedThirdBet, 10);
    expect(result.playerB.pendingRecovery).toBeCloseTo(10 + expectedSecondBet + expectedThirdBet, 10);
    expect(result.playerB.nextRequiredBet).toBeCloseTo(result.playerB.pendingRecovery / (1.3 - 1), 10);
  });

  it('keeps each player recovery state independent and reconciles per-ball net', () => {
    const result = analyzeStrategy([0, 1, 0]);
    expect(result.history.map((ball) => ball.playerA.status)).toEqual(['WIN', 'LOSS', 'RECOVERY']);
    expect(result.history.map((ball) => ball.playerB.status)).toEqual(['LOSS', 'RECOVERY', 'LOSS']);
    expect(result.playerA.odds).toBe(2.5);
    expect(result.playerB.odds).toBe(1.3);
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
