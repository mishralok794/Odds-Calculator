import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  RotateCcw,
  Save,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calcHedge, roundStake, calcRoundedHedgeResults, isValidDecimalOdds, isValidStake } from '../utils/hedgeCalc';
import { generateId, formatCurrency, formatPercent } from '../utils/storage';
import {
  NumberInput,
  SelectField,
  ResultRow,
  SectionDivider,
  Tooltip,
  ConfirmDialog,
  Collapsible,
  CopyButton,
} from '../components/ui';
import type { ExistingBet, MarketType, Sport } from '../types';
import { SPORTS, MARKET_TYPES } from '../types';

interface BetRowData {
  id: string;
  selectionName: string;
  stake: string;
  decimalOdds: string;
  bookmaker: string;
  betDate: string;
}

function emptyBetRow(): BetRowData {
  return {
    id: generateId(),
    selectionName: '',
    stake: '',
    decimalOdds: '',
    bookmaker: '',
    betDate: '',
  };
}

export default function HedgeCalculatorPage() {
  const { preferences, addCalculation, currencySymbol } = useApp();

  // ── State ──
  const [sport, setSport] = useState<Sport>(preferences.defaultSport);
  const [marketType, setMarketType] = useState<MarketType>(preferences.defaultMarketType);
  const [selectionName, setSelectionName] = useState('Team A');
  const [bets, setBets] = useState<BetRowData[]>([
    { ...emptyBetRow(), selectionName: 'Team A', stake: '15', decimalOdds: '2.80' },
    { ...emptyBetRow(), selectionName: 'Team A', stake: '4', decimalOdds: '3.45' },
  ]);
  const [oppositeSelectionName, setOppositeSelectionName] = useState('Team B');
  const [oppositeOdds, setOppositeOdds] = useState('1.35');
  const [commission, setCommission] = useState(String(preferences.defaultCommission));
  const [customHedgeStake, setCustomHedgeStake] = useState('');
  const [stakeIncrement, setStakeIncrement] = useState(String(preferences.stakeIncrement));
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Third outcome for 3-way
  const [drawOdds, setDrawOdds] = useState('');
  const [drawName, setDrawName] = useState('Draw');

  // ── Convert bet rows to ExistingBet[] ──
  const existingBets: ExistingBet[] = useMemo(() => {
    return bets
      .map((b) => ({
        id: b.id,
        selectionName: b.selectionName || selectionName,
        stake: parseFloat(b.stake) || 0,
        decimalOdds: parseFloat(b.decimalOdds) || 0,
        bookmaker: b.bookmaker,
        betDate: b.betDate,
      }))
      .filter((b) => b.stake > 0 && b.decimalOdds >= 1.01);
  }, [bets, selectionName]);

  // ── Calculate hedge ──
  const hedgeResult = useMemo(() => {
    const oppOdds = parseFloat(oppositeOdds);
    const comm = parseFloat(commission) / 100 || 0;
    const customStake = customHedgeStake ? parseFloat(customHedgeStake) : undefined;
    return calcHedge(existingBets, oppOdds, comm, customStake);
  }, [existingBets, oppositeOdds, commission, customHedgeStake]);

  // ── Rounded stake ──
  const roundedStake = useMemo(() => {
    if (!hedgeResult) return null;
    const inc = parseFloat(stakeIncrement) || 0.01;
    return roundStake(hedgeResult.suggestedHedgeStake, inc);
  }, [hedgeResult, stakeIncrement]);

  const roundedResults = useMemo(() => {
    if (!hedgeResult || roundedStake === null) return null;
    const oppOdds = parseFloat(oppositeOdds);
    const comm = parseFloat(commission) / 100 || 0;
    return calcRoundedHedgeResults(
      hedgeResult.totalStake,
      hedgeResult.totalGrossReturn,
      roundedStake,
      oppOdds,
      comm
    );
  }, [hedgeResult, roundedStake, oppositeOdds, commission]);

  // ── 3-way hedge (simplified) ──
  const threeWayResult = useMemo(() => {
    if (marketType !== 'three-way' || !hedgeResult) return null;
    const dOdds = parseFloat(drawOdds);
    if (!isValidDecimalOdds(dOdds)) return null;
    const comm = parseFloat(commission) / 100 || 0;

    // For 3-way: calculate separate hedge for draw
    const R = hedgeResult.totalGrossReturn;
    const S = hedgeResult.totalStake;
    const O1 = parseFloat(oppositeOdds);
    const O2 = dOdds;
    const eff1 = (O1 - 1) * (1 - comm);
    const eff2 = (O2 - 1) * (1 - comm);

    // Solve: R - S - H1 - H2 = H1 * eff1 - S = H2 * eff2 - S
    // From eq 2&3: H1 * eff1 = H2 * eff2 => H2 = H1 * eff1 / eff2
    // From eq 1&2: R - S - H1 - H2 = H1 * eff1 - S
    //              R - H1 - H2 = H1 * eff1
    //              R = H1(1 + eff1) + H2
    //              R = H1(1 + eff1) + H1 * eff1 / eff2
    //              R = H1(1 + eff1 + eff1/eff2)
    const H1 = R / (1 + eff1 + eff1 / eff2);
    const H2 = H1 * eff1 / eff2;

    const netIfOriginalWins = R - S - H1 - H2;
    const netIfOppositeWins = H1 * eff1 - S;
    const netIfDraw = H2 * eff2 - S;

    return {
      hedgeStakeOpposite: H1,
      hedgeStakeDraw: H2,
      netIfOriginalWins,
      netIfOppositeWins,
      netIfDraw,
      totalHedgeStake: H1 + H2,
      allOutcomesCovered: true,
    };
  }, [marketType, hedgeResult, drawOdds, oppositeOdds, commission]);

  // ── Bet row handlers ──
  const updateBet = useCallback(
    (id: string, field: keyof BetRowData, value: string) => {
      setBets((prev) =>
        prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
      );
    },
    []
  );

  const addBet = useCallback(() => {
    setBets((prev) => [...prev, { ...emptyBetRow(), selectionName }]);
  }, [selectionName]);

  const duplicateBet = useCallback((bet: BetRowData) => {
    setBets((prev) => [...prev, { ...bet, id: generateId() }]);
  }, []);

  const removeBet = useCallback(
    (id: string) => {
      if (bets.length <= 1) return;
      setBets((prev) => prev.filter((b) => b.id !== id));
    },
    [bets.length]
  );

  const resetAll = () => {
    setBets([emptyBetRow()]);
    setOppositeOdds('');
    setCommission('0');
    setCustomHedgeStake('');
    setSelectionName('Team A');
    setOppositeSelectionName('Team B');
    setDrawOdds('');
    setShowResetConfirm(false);
  };

  const useSuggestedStake = () => {
    if (hedgeResult) {
      setCustomHedgeStake(hedgeResult.suggestedHedgeStake.toFixed(2));
    }
  };

  const handleSave = () => {
    if (!hedgeResult) return;
    const calc = {
      id: generateId(),
      name: `${selectionName} vs ${oppositeSelectionName}`,
      type: 'hedge' as const,
      sport,
      event: `${selectionName} vs ${oppositeSelectionName}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: '',
      data: {
        bets: bets.map((b) => ({ ...b })),
        oppositeOdds,
        oppositeSelectionName,
        commission,
        marketType,
        result: hedgeResult,
      },
    };
    addCalculation(calc);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // ── Build copy text ──
  const buildCopyText = (): string => {
    if (!hedgeResult) return '';
    const lines = [
      `Hedge Calculation — ${selectionName} vs ${oppositeSelectionName}`,
      ``,
      `Existing Bets (${selectionName}):`,
      ...bets.map(
        (b, i) =>
          `  Bet ${i + 1}: ${currencySymbol}${b.stake} @ ${b.decimalOdds}${b.bookmaker ? ` (${b.bookmaker})` : ''}`
      ),
      ``,
      `Total Staked: ${formatCurrency(hedgeResult.totalStake, currencySymbol)}`,
      `Total Gross Return (if ${selectionName} wins): ${formatCurrency(hedgeResult.totalGrossReturn, currencySymbol)}`,
      `Unhedged Profit (if win): ${formatCurrency(hedgeResult.unhedgedProfitIfWin, currencySymbol)}`,
      ``,
      `Opposite: ${oppositeSelectionName} @ ${oppositeOdds}`,
      `Commission: ${commission}%`,
      ``,
      `Suggested Hedge Stake: ${formatCurrency(hedgeResult.suggestedHedgeStake, currencySymbol)}`,
      `Net if ${selectionName} wins: ${formatCurrency(hedgeResult.netIfOriginalWins, currencySymbol)}`,
      `Net if ${oppositeSelectionName} wins: ${formatCurrency(hedgeResult.netIfOppositeWins, currencySymbol)}`,
      `Equalized Result: ${formatCurrency(hedgeResult.equalizedResult, currencySymbol)}`,
    ];
    return lines.join('\n');
  };

  // ── Result type indicator ──
  const resultType = hedgeResult
    ? hedgeResult.isGuaranteedProfit
      ? 'positive'
      : hedgeResult.isBreakEven
      ? 'neutral'
      : 'negative'
    : 'neutral';

  const resultTypeLabel = hedgeResult
    ? hedgeResult.isGuaranteedProfit
      ? 'Guaranteed Modeled Profit'
      : hedgeResult.isBreakEven
      ? 'Break-Even Hedge'
      : 'Guaranteed Modeled Loss'
    : '';

  const is3Way = marketType === 'three-way';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Hedge Calculator</h1>
          <p className="text-sm text-gray-500 mt-1">
            Calculate optimal hedge stakes for equal-outcome positions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowResetConfirm(true)} className="btn-ghost">
            <RotateCcw size={16} /> Reset
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={!hedgeResult}>
            {saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saveSuccess ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Config row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SelectField
          label="Sport"
          value={sport}
          options={SPORTS.map((s) => ({ value: s.value, label: `${s.icon} ${s.label}` }))}
          onChange={(v) => setSport(v as Sport)}
          id="hedge-sport"
        />
        <SelectField
          label="Market Type"
          value={marketType}
          options={MARKET_TYPES.map((m) => ({ value: m.value, label: m.label }))}
          onChange={(v) => setMarketType(v as MarketType)}
          id="hedge-market"
        />
        <NumberInput
          label="Commission %"
          value={commission}
          onChange={setCommission}
          placeholder="0"
          id="hedge-commission"
          tooltip="Commission rate applied to the opposite selection's winnings only. Enter as percentage (e.g. 5 for 5%)."
          min={0}
          step="0.1"
        />
      </div>

      {/* Disclaimer for 3-way */}
      {is3Way && (
        <div className="card p-3 border-yellow-500/20 bg-yellow-500/5">
          <div className="flex gap-2 text-xs text-yellow-400">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              Three-way market: you must model all three outcomes (Win/Draw/Lose). If any outcome is uncovered, the hedge is incomplete.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── LEFT: Inputs ── */}
        <div className="lg:col-span-3 space-y-5">
          {/* Existing bets */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="section-title">Existing Bets</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  All bets on the same selection that settle consistently
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip content="All listed bets must be on the same winning selection. If bets have different settlement rules or markets, results may be inaccurate." />
              </div>
            </div>

            {/* Selection name */}
            <div className="mb-4">
              <label className="label" htmlFor="selection-name">Selection Name</label>
              <input
                id="selection-name"
                type="text"
                value={selectionName}
                onChange={(e) => setSelectionName(e.target.value)}
                className="input-field"
                placeholder="e.g. Team A, India, Djokovic"
              />
            </div>

            {/* Bet rows */}
            <div className="space-y-3">
              {bets.map((bet, index) => (
                <div
                  key={bet.id}
                  className="group rounded-lg border border-white/[0.04] bg-navy-800/50 p-3 animate-fade-in"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      Bet {index + 1}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => duplicateBet(bet)}
                        className="btn-icon"
                        title="Duplicate bet"
                        aria-label="Duplicate bet"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => removeBet(bet.id)}
                        className="btn-icon text-red-400/60 hover:text-red-400"
                        title="Remove bet"
                        aria-label="Remove bet"
                        disabled={bets.length <= 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <NumberInput
                      label="Stake"
                      value={bet.stake}
                      onChange={(v) => updateBet(bet.id, 'stake', v)}
                      prefix={currencySymbol}
                      placeholder="0.00"
                      id={`bet-stake-${index}`}
                      min={0}
                      step="0.01"
                      error={
                        bet.stake && !isValidStake(parseFloat(bet.stake))
                          ? 'Must be > 0'
                          : undefined
                      }
                    />
                    <NumberInput
                      label="Decimal Odds"
                      value={bet.decimalOdds}
                      onChange={(v) => updateBet(bet.id, 'decimalOdds', v)}
                      placeholder="1.01+"
                      id={`bet-odds-${index}`}
                      min={1.01}
                      step="0.01"
                      error={
                        bet.decimalOdds && !isValidDecimalOdds(parseFloat(bet.decimalOdds))
                          ? 'Must be ≥ 1.01'
                          : undefined
                      }
                    />
                    <div>
                      <label className="label" htmlFor={`bet-bookie-${index}`}>Bookmaker</label>
                      <input
                        type="text"
                        id={`bet-bookie-${index}`}
                        value={bet.bookmaker}
                        onChange={(e) => updateBet(bet.id, 'bookmaker', e.target.value)}
                        className="input-field"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor={`bet-date-${index}`}>Date</label>
                      <input
                        type="date"
                        id={`bet-date-${index}`}
                        value={bet.betDate}
                        onChange={(e) => updateBet(bet.id, 'betDate', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>
                  {bet.stake && bet.decimalOdds && isValidStake(parseFloat(bet.stake)) && isValidDecimalOdds(parseFloat(bet.decimalOdds)) && (
                    <div className="mt-2 text-xs text-gray-500">
                      Gross return: <span className="text-gray-300 font-mono">{formatCurrency(parseFloat(bet.stake) * parseFloat(bet.decimalOdds), currencySymbol)}</span>
                      {' · '}
                      Net profit: <span className="text-emerald-400/80 font-mono">{formatCurrency(parseFloat(bet.stake) * (parseFloat(bet.decimalOdds) - 1), currencySymbol)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={addBet} className="btn-secondary mt-3 w-full sm:w-auto">
              <Plus size={16} /> Add Bet
            </button>
          </div>

          {/* Opposite selection */}
          <div className="card p-5">
            <h2 className="section-title mb-4">
              {is3Way ? 'Opposite Outcomes' : 'Opposite Selection'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="opposite-name">
                  {is3Way ? 'Away/Opponent Name' : 'Opposite Selection Name'}
                </label>
                <input
                  type="text"
                  id="opposite-name"
                  value={oppositeSelectionName}
                  onChange={(e) => setOppositeSelectionName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Team B"
                />
              </div>
              <NumberInput
                label={`${oppositeSelectionName || 'Opposite'} Decimal Odds`}
                value={oppositeOdds}
                onChange={setOppositeOdds}
                placeholder="1.01+"
                id="opposite-odds"
                min={1.01}
                step="0.01"
                error={
                  oppositeOdds && !isValidDecimalOdds(parseFloat(oppositeOdds))
                    ? 'Must be ≥ 1.01'
                    : undefined
                }
              />
            </div>

            {is3Way && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label" htmlFor="draw-name">Draw / Third Outcome Name</label>
                  <input
                    type="text"
                    id="draw-name"
                    value={drawName}
                    onChange={(e) => setDrawName(e.target.value)}
                    className="input-field"
                    placeholder="e.g. Draw"
                  />
                </div>
                <NumberInput
                  label={`${drawName || 'Draw'} Decimal Odds`}
                  value={drawOdds}
                  onChange={setDrawOdds}
                  placeholder="1.01+"
                  id="draw-odds"
                  min={1.01}
                  step="0.01"
                />
              </div>
            )}
          </div>

          {/* Custom Hedge Stake */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Custom Hedge Stake</h2>
              {hedgeResult && (
                <button onClick={useSuggestedStake} className="btn-ghost text-xs text-blue-400">
                  Use Suggested Stake
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberInput
                label="Your Hedge Stake"
                value={customHedgeStake}
                onChange={setCustomHedgeStake}
                prefix={currencySymbol}
                placeholder="Leave empty for suggested"
                id="custom-hedge"
                min={0}
                step="0.01"
                tooltip="Enter your own proposed hedge stake to compare against the mathematically optimal amount."
              />
              <SelectField
                label="Stake Increment"
                value={stakeIncrement}
                options={[
                  { value: '0.01', label: `${currencySymbol}0.01` },
                  { value: '0.10', label: `${currencySymbol}0.10` },
                  { value: '0.50', label: `${currencySymbol}0.50` },
                  { value: '1.00', label: `${currencySymbol}1.00` },
                  { value: '5.00', label: `${currencySymbol}5.00` },
                ]}
                onChange={setStakeIncrement}
                id="stake-increment"
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="lg:col-span-2 space-y-5">
          {hedgeResult ? (
            <>
              {/* Classification badge */}
              <div
                className={`card p-4 border-l-4 ${
                  resultType === 'positive'
                    ? 'border-l-emerald-500 bg-emerald-500/5'
                    : resultType === 'negative'
                    ? 'border-l-red-500 bg-red-500/5'
                    : 'border-l-blue-500 bg-blue-500/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {resultType === 'positive' && <CheckCircle2 size={16} className="text-emerald-400" />}
                  {resultType === 'negative' && <MinusCircle size={16} className="text-red-400" />}
                  {resultType === 'neutral' && <Info size={16} className="text-blue-400" />}
                  <span className={`text-sm font-semibold ${
                    resultType === 'positive' ? 'text-emerald-400' :
                    resultType === 'negative' ? 'text-red-400' : 'text-blue-400'
                  }`}>
                    {resultTypeLabel}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {hedgeResult.isGuaranteedProfit
                    ? 'The equalized hedge produces a positive net result regardless of which selection wins (in this simplified two-outcome model).'
                    : hedgeResult.isBreakEven
                    ? 'The equalized hedge produces zero net result within rounding tolerance.'
                    : 'The equalized hedge produces a net loss regardless of which selection wins. This is common when opposite odds are low relative to existing positions.'}
                </p>
              </div>

              {/* Position Summary */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-300">Position Summary</h3>
                  <CopyButton text={buildCopyText()} />
                </div>

                <ResultRow
                  label="Total Staked"
                  value={formatCurrency(hedgeResult.totalStake, currencySymbol)}
                  type="neutral"
                  tooltip="Sum of all existing bet stakes."
                />
                <ResultRow
                  label={`Gross Return (if ${selectionName} wins)`}
                  value={formatCurrency(hedgeResult.totalGrossReturn, currencySymbol)}
                  type="highlight"
                  tooltip="Total amount returned if all existing bets win. Includes original stakes."
                />
                <SectionDivider />
                <ResultRow
                  label="Unhedged Profit (if win)"
                  value={formatCurrency(hedgeResult.unhedgedProfitIfWin, currencySymbol)}
                  type="positive"
                  tooltip="Net profit without any hedge, if original selection wins."
                />
                <ResultRow
                  label="Unhedged Loss (if lose)"
                  value={formatCurrency(hedgeResult.unhedgedLossIfLose, currencySymbol)}
                  type="negative"
                  tooltip="Net loss without any hedge, if original selection loses."
                />
              </div>

              {/* Equalized Hedge */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Equal-Outcome Hedge
                </h3>

                <ResultRow
                  label={`Hedge ${oppositeSelectionName} — Suggested Stake`}
                  value={formatCurrency(hedgeResult.suggestedHedgeStake, currencySymbol)}
                  type="highlight"
                  large
                  tooltip="The stake on the opposite selection that equalizes net results across both outcomes."
                />

                {roundedStake !== null && Math.abs(roundedStake - hedgeResult.suggestedHedgeStake) > 0.001 && (
                  <>
                    <ResultRow
                      label={`Rounded Stake (${currencySymbol}${stakeIncrement})`}
                      value={formatCurrency(roundedStake, currencySymbol)}
                      type="neutral"
                    />
                    {roundedResults && (
                      <div className="text-xs text-gray-500 mb-1">
                        With rounded stake: {selectionName} wins {formatCurrency(roundedResults.netIfOriginalWins, currencySymbol)}
                        {' · '}{oppositeSelectionName} wins {formatCurrency(roundedResults.netIfOppositeWins, currencySymbol)}
                      </div>
                    )}
                  </>
                )}

                <SectionDivider />

                <ResultRow
                  label="Total Exposure"
                  value={formatCurrency(hedgeResult.totalExposure, currencySymbol)}
                  type="neutral"
                  tooltip="Total money at risk: existing stakes + hedge stake."
                />
                <ResultRow
                  label={`Net if ${selectionName} wins`}
                  value={formatCurrency(hedgeResult.netIfOriginalWins, currencySymbol)}
                  type={hedgeResult.netIfOriginalWins >= 0 ? 'positive' : 'negative'}
                />
                <ResultRow
                  label={`Net if ${oppositeSelectionName} wins`}
                  value={formatCurrency(hedgeResult.netIfOppositeWins, currencySymbol)}
                  type={hedgeResult.netIfOppositeWins >= 0 ? 'positive' : 'negative'}
                />
                <SectionDivider />
                <ResultRow
                  label="Equalized Result"
                  value={formatCurrency(hedgeResult.equalizedResult, currencySymbol)}
                  type={
                    hedgeResult.equalizedResult > 0.005
                      ? 'positive'
                      : hedgeResult.equalizedResult < -0.005
                      ? 'negative'
                      : 'neutral'
                  }
                  large
                  tooltip="The net result that is the same regardless of outcome. A negative value means a guaranteed modeled loss."
                />
                <ResultRow
                  label="Outcome Difference"
                  value={formatCurrency(
                    Math.abs(hedgeResult.netIfOriginalWins - hedgeResult.netIfOppositeWins),
                    currencySymbol
                  )}
                  type="neutral"
                  tooltip="Difference between the two outcome results. Should be near zero for the equalized hedge."
                />
              </div>

              {/* 3-Way Results */}
              {is3Way && threeWayResult && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">
                    Three-Way Hedge Results
                  </h3>
                  <ResultRow
                    label={`Hedge ${oppositeSelectionName}`}
                    value={formatCurrency(threeWayResult.hedgeStakeOpposite, currencySymbol)}
                    type="highlight"
                  />
                  <ResultRow
                    label={`Hedge ${drawName}`}
                    value={formatCurrency(threeWayResult.hedgeStakeDraw, currencySymbol)}
                    type="highlight"
                  />
                  <ResultRow
                    label="Total Hedge Stake"
                    value={formatCurrency(threeWayResult.totalHedgeStake, currencySymbol)}
                    type="neutral"
                  />
                  <SectionDivider />
                  <ResultRow
                    label={`Net if ${selectionName} wins`}
                    value={formatCurrency(threeWayResult.netIfOriginalWins, currencySymbol)}
                    type={threeWayResult.netIfOriginalWins >= 0 ? 'positive' : 'negative'}
                  />
                  <ResultRow
                    label={`Net if ${oppositeSelectionName} wins`}
                    value={formatCurrency(threeWayResult.netIfOppositeWins, currencySymbol)}
                    type={threeWayResult.netIfOppositeWins >= 0 ? 'positive' : 'negative'}
                  />
                  <ResultRow
                    label={`Net if ${drawName}`}
                    value={formatCurrency(threeWayResult.netIfDraw, currencySymbol)}
                    type={threeWayResult.netIfDraw >= 0 ? 'positive' : 'negative'}
                  />
                </div>
              )}

              {is3Way && !threeWayResult && parseFloat(drawOdds) === 0 && (
                <div className="card p-4 border-yellow-500/20 bg-yellow-500/5">
                  <div className="flex gap-2 text-xs text-yellow-400">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>Enter draw odds to see the three-way hedge results. Without modeling the draw, your hedge is incomplete.</span>
                  </div>
                </div>
              )}

              {/* Custom Stake Comparison */}
              {hedgeResult.customHedgeStake !== undefined &&
                hedgeResult.customNetIfOriginalWins !== undefined &&
                hedgeResult.customNetIfOppositeWins !== undefined && (
                  <div className="card p-5">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">
                      Custom Stake Comparison
                    </h3>
                    <ResultRow
                      label="Your Hedge Stake"
                      value={formatCurrency(hedgeResult.customHedgeStake, currencySymbol)}
                      type="highlight"
                    />
                    <ResultRow
                      label="vs. Suggested Stake"
                      value={formatCurrency(
                        hedgeResult.customHedgeStake - hedgeResult.suggestedHedgeStake,
                        currencySymbol
                      )}
                      type="neutral"
                    />
                    <SectionDivider />
                    <ResultRow
                      label={`Net if ${selectionName} wins`}
                      value={formatCurrency(hedgeResult.customNetIfOriginalWins, currencySymbol)}
                      type={hedgeResult.customNetIfOriginalWins >= 0 ? 'positive' : 'negative'}
                    />
                    <ResultRow
                      label={`Net if ${oppositeSelectionName} wins`}
                      value={formatCurrency(hedgeResult.customNetIfOppositeWins, currencySymbol)}
                      type={hedgeResult.customNetIfOppositeWins >= 0 ? 'positive' : 'negative'}
                    />
                    <ResultRow
                      label="Outcome Difference"
                      value={formatCurrency(
                        Math.abs(
                          hedgeResult.customNetIfOriginalWins - hedgeResult.customNetIfOppositeWins
                        ),
                        currencySymbol
                      )}
                      type="neutral"
                    />
                  </div>
                )}

              {/* Per-bet returns */}
              {hedgeResult.individualReturns.length > 1 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">
                    Individual Bet Returns
                  </h3>
                  <div className="table-responsive">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-xs border-b border-white/[0.04]">
                          <th className="text-left py-2 font-medium">#</th>
                          <th className="text-right py-2 font-medium">Stake</th>
                          <th className="text-right py-2 font-medium">Odds</th>
                          <th className="text-right py-2 font-medium">Gross Return</th>
                          <th className="text-right py-2 font-medium">Net Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hedgeResult.individualReturns.map((ret, i) => {
                          const bet = bets[i];
                          return (
                            <tr key={ret.betId} className="border-b border-white/[0.02]">
                              <td className="py-2 text-gray-400">{i + 1}</td>
                              <td className="py-2 text-right font-mono text-gray-300">
                                {formatCurrency(parseFloat(bet?.stake || '0'), currencySymbol)}
                              </td>
                              <td className="py-2 text-right font-mono text-blue-400">
                                {bet?.decimalOdds || '-'}
                              </td>
                              <td className="py-2 text-right font-mono text-gray-200">
                                {formatCurrency(ret.grossReturn, currencySymbol)}
                              </td>
                              <td className="py-2 text-right font-mono text-emerald-400">
                                {formatCurrency(ret.netProfit, currencySymbol)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center mb-4">
                <Shield size={24} className="text-blue-400/60" />
              </div>
              <h3 className="text-sm font-medium text-gray-300 mb-1">
                Enter your bets to see results
              </h3>
              <p className="text-xs text-gray-500 max-w-xs">
                Add at least one valid bet with stake and odds, plus opposite selection odds, to calculate the hedge.
              </p>
            </div>
          )}

          {/* Risk Notice */}
          <div className="card p-4 border-orange-500/10 bg-orange-500/[0.03]">
            <div className="flex gap-2">
              <AlertTriangle size={14} className="text-orange-400/60 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 leading-relaxed">
                This is a calculator tool, not a betting recommendation. Actual results may differ due to odds changes, stake limits, commission, fees, settlement rules, and execution differences. This model assumes a simplified{' '}
                {is3Way ? 'three' : 'two'}-outcome market.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Educational Section */}
      <Collapsible title="📚 How this calculation works">
        <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
          <div>
            <h4 className="font-semibold text-gray-300 mb-1">Stake vs Gross Return vs Net Profit</h4>
            <p>
              <strong>Stake</strong> is the amount you bet. <strong>Gross return</strong> is the total you receive if you win (stake × odds).
              <strong> Net profit</strong> is gross return minus stake — the actual profit.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Example: {currencySymbol}10 at odds 2.50 → Gross return = {currencySymbol}25.00, Net profit = {currencySymbol}15.00
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-300 mb-1">Decimal Odds</h4>
            <p>
              Decimal odds represent the total return per unit staked. Odds of 2.50 mean you receive {currencySymbol}2.50 for every {currencySymbol}1 staked (including your stake back).
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-300 mb-1">Equal-Outcome Hedge</h4>
            <p>
              An equal-outcome hedge places a specific stake on the opposite selection so that you receive the same net result
              regardless of which team wins. The formula is: <code className="text-blue-400">H = R / [1 + (O−1)(1−c)]</code> where
              R is total gross return, O is opposite decimal odds, and c is commission.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-300 mb-1">Break-Even vs Guaranteed Loss</h4>
            <p>
              A break-even hedge means the equalized result is {currencySymbol}0.00. This is rare — it only happens when the sum of your existing average odds
              and the opposite odds perfectly offset. More commonly, the equalized result is a small loss, especially when opposite odds are low.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-300 mb-1">Why Equal Outcomes Can Still Mean a Loss</h4>
            <p>
              If the bookmaker margin is high or opposite odds are very low, the cost of hedging exceeds the expected value.
              The equalized result being negative simply means you locked in a known modeled loss — but this may still be preferable to the unhedged downside.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-300 mb-1">Commission</h4>
            <p>
              Some exchanges charge commission on net winnings. The hedge formula accounts for this: the effective payout on the opposite
              selection becomes <code className="text-blue-400">(O−1)×(1−c)</code> instead of <code className="text-blue-400">(O−1)</code>.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-300 mb-1">Draw, Tie, Void, and Settlement</h4>
            <p>
              In three-way markets (e.g., football), a draw is a separate outcome not covered by a two-way hedge. If this can happen,
              switch to "Three-Way" market type above. Voided bets, dead heats, and partial settlements are not modeled — treat those as special cases.
            </p>
          </div>
        </div>
      </Collapsible>

      {/* Dialogs */}
      <ConfirmDialog
        open={showResetConfirm}
        title="Reset Calculator"
        message="This will clear all entered bets and odds. This action cannot be undone."
        confirmLabel="Reset"
        onConfirm={resetAll}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
