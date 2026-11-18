export type PlayerId = 'A' | 'B';
export type BetStatus = 'WIN' | 'LOSS' | 'HOLD' | 'RECOVERY';

export interface PlayerBallResult {
  status: BetStatus;
  bet: number;
  returned: number;
  net: number;
  previousPending: number;
  pending: number;
  recoveringBefore: boolean;
  recoveringAfter: boolean;
  reason: string;
  cumulativeInvestment: number;
  cumulativeReturn: number;
  cumulativeNet: number;
}

export interface BallHistoryRow {
  ballNo: number;
  outcome: number;
  playerA: PlayerBallResult;
  playerB: PlayerBallResult;
}

export interface PlayerReport {
  player: PlayerId;
  odds: number;
  normalBet: number;
  targetDescription: string;
  balls: number;
  wins: number;
  losses: number;
  recoveries: number;
  holds: number;
  lossCycles: number;
  normalInvestment: number;
  recoveryInvestment: number;
  lossInvestment: number;
  totalInvestment: number;
  normalWinReturns: number;
  recoveryReturns: number;
  totalReturn: number;
  totalLostAmount: number;
  netProfitLoss: number;
  roi: number;
  winningPercentage: number;
  recoverySuccessPercentage: number;
  pendingRecovery: number;
  nextRequiredBet: number;
}

export interface StrategyAnalysis {
  history: BallHistoryRow[];
  playerA: PlayerReport;
  playerB: PlayerReport;
}

export const STRATEGY_RULES = {
  A: { targetDescription: '0 run', odds: 2.3, normalBet: 10 },
  B: { targetDescription: '1–6 runs', odds: 1.3, normalBet: 10 },
} as const;

interface RecoveryState {
  pending: number;
  recovering: boolean;
  wins: number;
  losses: number;
  recoveries: number;
  holds: number;
  lossCycles: number;
  normalInvestment: number;
  recoveryInvestment: number;
  lossInvestment: number;
  normalWinReturns: number;
  recoveryReturns: number;
  totalLostAmount: number;
  totalReturn: number;
  totalInvestment: number;
  net: number;
}

function emptyState(): RecoveryState {
  return {
    pending: 0, recovering: false, wins: 0, losses: 0, recoveries: 0, holds: 0,
    lossCycles: 0, normalInvestment: 0, recoveryInvestment: 0, lossInvestment: 0,
    normalWinReturns: 0, recoveryReturns: 0, totalLostAmount: 0, totalReturn: 0, totalInvestment: 0, net: 0,
  };
}

function processPlayerBall(outcome: number, player: PlayerId, state: RecoveryState): PlayerBallResult {
  const rules = STRATEGY_RULES[player];
  const previousPending = state.pending;
  const recoveringBefore = state.recovering;
  const isTarget = player === 'A' ? outcome === 0 : outcome >= 1 && outcome <= 6;
  let status: BetStatus;
  let bet = 0;
  let returned = 0;
  let reason: string;

  if (state.recovering && !isTarget) {
    status = 'HOLD';
    state.holds += 1;
    reason = `Recovery active hai aur ${outcome} target (${rules.targetDescription}) nahi hai, isliye naya bet nahi laga.`;
  } else if (state.recovering && isTarget) {
    status = 'RECOVERY';
    bet = state.pending / (rules.odds - 1);
    returned = bet * rules.odds;
    state.recoveries += 1;
    state.recoveryInvestment += bet;
    state.recoveryReturns += returned;
    state.totalInvestment += bet;
    state.totalReturn += returned;
    state.net += returned - bet;
    reason = `Target ${rules.targetDescription} aaya; pending ${previousPending.toFixed(2)} recover karne ke liye recovery bet laga.`;
    state.pending = 0;
    state.recovering = false;
  } else if (isTarget) {
    status = 'WIN';
    bet = rules.normalBet;
    returned = bet * rules.odds;
    state.wins += 1;
    state.normalInvestment += bet;
    state.normalWinReturns += returned;
    state.totalInvestment += bet;
    state.totalReturn += returned;
    state.net += returned - bet;
    reason = `Target ${rules.targetDescription} aaya aur recovery active nahi thi; normal bet jeeta.`;
  } else {
    status = 'LOSS';
    bet = rules.normalBet;
    state.losses += 1;
    state.lossCycles += 1;
    state.lossInvestment += bet;
    state.totalLostAmount += bet;
    state.totalInvestment += bet;
    state.net -= bet;
    state.pending += bet;
    state.recovering = true;
    reason = `Target ${rules.targetDescription} nahi aaya; normal bet haara aur recovery shuru hui.`;
  }

  return {
    status, bet, returned, net: returned - bet, previousPending, pending: state.pending,
    recoveringBefore, recoveringAfter: state.recovering, reason,
    cumulativeInvestment: state.totalInvestment, cumulativeReturn: state.totalReturn, cumulativeNet: state.net,
  };
}

function makeReport(player: PlayerId, state: RecoveryState, balls: number): PlayerReport {
  const rules = STRATEGY_RULES[player];
  return {
    player, odds: rules.odds, normalBet: rules.normalBet, targetDescription: rules.targetDescription,
    balls, wins: state.wins, losses: state.losses, recoveries: state.recoveries, holds: state.holds,
    lossCycles: state.lossCycles, normalInvestment: state.normalInvestment,
    recoveryInvestment: state.recoveryInvestment, lossInvestment: state.lossInvestment,
    totalInvestment: state.totalInvestment, normalWinReturns: state.normalWinReturns,
    recoveryReturns: state.recoveryReturns, totalReturn: state.totalReturn,
    totalLostAmount: state.totalLostAmount, netProfitLoss: state.net, roi: state.totalInvestment ? state.net / state.totalInvestment * 100 : 0,
    winningPercentage: balls ? state.wins / balls * 100 : 0,
    recoverySuccessPercentage: state.lossCycles ? state.recoveries / state.lossCycles * 100 : 0,
    pendingRecovery: state.pending,
    nextRequiredBet: state.pending > 0 ? state.pending / (rules.odds - 1) : 0,
  };
}

export function analyzeStrategy(outcomes: number[]): StrategyAnalysis {
  if (outcomes.some((value) => !Number.isInteger(value) || value < 0 || value > 6)) {
    throw new Error('Har ball outcome 0 se 6 ke beech integer hona chahiye.');
  }
  const stateA = emptyState();
  const stateB = emptyState();
  const history = outcomes.map((outcome, index): BallHistoryRow => ({
    ballNo: index + 1,
    outcome,
    playerA: processPlayerBall(outcome, 'A', stateA),
    playerB: processPlayerBall(outcome, 'B', stateB),
  }));
  return { history, playerA: makeReport('A', stateA, outcomes.length), playerB: makeReport('B', stateB, outcomes.length) };
}
