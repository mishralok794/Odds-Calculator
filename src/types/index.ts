// ──────────────────────────────────────────────
// Core Types for OddsPilot
// ──────────────────────────────────────────────

export type OddsFormat = 'decimal' | 'fractional' | 'american';

export type MarketType =
  | 'two-way'
  | 'three-way'
  | 'cricket-winner'
  | 'tennis-winner'
  | 'basketball-winner'
  | 'custom-multi';

export type Sport =
  | 'cricket'
  | 'football'
  | 'tennis'
  | 'basketball'
  | 'american-football'
  | 'esports'
  | 'other';

export interface ExistingBet {
  id: string;
  selectionName: string;
  stake: number;
  decimalOdds: number;
  bookmaker?: string;
  betDate?: string;
  notes?: string;
}

export interface OppositeOutcome {
  id: string;
  name: string;
  decimalOdds: number;
  bookmaker?: string;
}

export interface HedgeCalculation {
  // Inputs summary
  totalStake: number;
  totalGrossReturn: number;
  individualReturns: { betId: string; grossReturn: number; netProfit: number }[];

  // Unhedged
  unhedgedProfitIfWin: number;
  unhedgedLossIfLose: number;

  // Hedge results
  suggestedHedgeStake: number;
  netIfOriginalWins: number;
  netIfOppositeWins: number;
  equalizedResult: number;
  totalExposure: number;

  // Classification
  isBreakEven: boolean;
  isGuaranteedProfit: boolean;
  isGuaranteedLoss: boolean;

  // Custom hedge
  customHedgeStake?: number;
  customNetIfOriginalWins?: number;
  customNetIfOppositeWins?: number;
}

export interface ThreeWayHedgeCalculation extends HedgeCalculation {
  outcomes: {
    name: string;
    netResult: number;
    hedgeStake: number;
    isCovered: boolean;
  }[];
}

export interface ArbitrageResult {
  impliedProbabilitySum: number;
  isArbitrage: boolean;
  margin: number;
  stakes: { outcome: string; stake: number; potentialReturn: number }[];
  totalStake: number;
  guaranteedReturn: number;
  profit: number;
  profitPercentage: number;
  afterCommission?: {
    profit: number;
    profitPercentage: number;
  };
}

export interface OddsConversion {
  decimal: number;
  fractional: string;
  american: string;
  impliedProbability: number;
}

export interface ProbabilityCalcResult {
  impliedProbability: number;
  grossReturn: number;
  netProfit: number;
  expectedValue?: number;
  probabilityDifference?: number;
}

export interface SavedCalculation {
  id: string;
  name: string;
  type: 'hedge' | 'arbitrage' | 'odds' | 'probability';
  sport: Sport;
  event?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  data: Record<string, unknown>;
}

export interface UserPreferences {
  currency: string;
  currencySymbol: string;
  defaultOddsFormat: OddsFormat;
  stakeIncrement: number;
  theme: 'dark' | 'light';
  defaultSport: Sport;
  defaultMarketType: MarketType;
  defaultCommission: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  currency: 'USD',
  currencySymbol: '$',
  defaultOddsFormat: 'decimal',
  stakeIncrement: 0.01,
  theme: 'dark',
  defaultSport: 'football',
  defaultMarketType: 'two-way',
  defaultCommission: 0,
};

export const CURRENCIES: { code: string; symbol: string; name: string }[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

export const SPORTS: { value: Sport; label: string; icon: string }[] = [
  { value: 'cricket', label: 'Cricket', icon: '🏏' },
  { value: 'football', label: 'Football / Soccer', icon: '⚽' },
  { value: 'tennis', label: 'Tennis', icon: '🎾' },
  { value: 'basketball', label: 'Basketball', icon: '🏀' },
  { value: 'american-football', label: 'American Football', icon: '🏈' },
  { value: 'esports', label: 'Esports', icon: '🎮' },
  { value: 'other', label: 'Other / Custom', icon: '🏆' },
];

export const MARKET_TYPES: { value: MarketType; label: string; outcomes: number }[] = [
  { value: 'two-way', label: 'Two-Way Winner', outcomes: 2 },
  { value: 'three-way', label: 'Three-Way (Home/Draw/Away)', outcomes: 3 },
  { value: 'cricket-winner', label: 'Cricket Match Winner', outcomes: 2 },
  { value: 'tennis-winner', label: 'Tennis Match Winner', outcomes: 2 },
  { value: 'basketball-winner', label: 'Basketball Winner', outcomes: 2 },
  { value: 'custom-multi', label: 'Custom Multi-Outcome', outcomes: 0 },
];
