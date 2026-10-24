import React, { useState, useMemo } from 'react';
import { TrendingUp, Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calcArbitrage, ArbitrageOutcome } from '../utils/arbitrageCalc';
import { NumberInput, ResultRow, SectionDivider, Collapsible, SelectField } from '../components/ui';
import { formatCurrency, formatPercent, generateId } from '../utils/storage';
import { MARKET_TYPES } from '../types';

interface OutcomeRow {
  id: string;
  name: string;
  decimalOdds: string;
  bookmaker: string;
}

function emptyOutcome(name = ''): OutcomeRow {
  return { id: generateId(), name, decimalOdds: '', bookmaker: '' };
}

export default function ArbitrageAnalyzerPage() {
  const { currencySymbol } = useApp();
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([
    emptyOutcome('Home'),
    emptyOutcome('Away'),
  ]);
  const [totalInvestment, setTotalInvestment] = useState('100');
  const [commission, setCommission] = useState('0');
  const [marketType, setMarketType] = useState('two-way');

  const arbOutcomes: ArbitrageOutcome[] = useMemo(
    () =>
      outcomes.map((o) => ({
        name: o.name,
        decimalOdds: parseFloat(o.decimalOdds) || 0,
        bookmaker: o.bookmaker,
      })),
    [outcomes]
  );

  const result = useMemo(() => {
    const inv = parseFloat(totalInvestment) || 0;
    const comm = parseFloat(commission) / 100 || 0;
    return calcArbitrage(arbOutcomes, inv, comm);
  }, [arbOutcomes, totalInvestment, commission]);

  const updateOutcome = (id: string, field: keyof OutcomeRow, value: string) => {
    setOutcomes((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  const addOutcome = () => {
    setOutcomes((prev) => [...prev, emptyOutcome(`Outcome ${prev.length + 1}`)]);
  };

  const removeOutcome = (id: string) => {
    if (outcomes.length <= 2) return;
    setOutcomes((prev) => prev.filter((o) => o.id !== id));
  };

  const handleMarketTypeChange = (type: string) => {
    setMarketType(type);
    if (type === 'three-way' && outcomes.length < 3) {
      setOutcomes([
        emptyOutcome('Home'),
        emptyOutcome('Draw'),
        emptyOutcome('Away'),
      ]);
    } else if (type === 'two-way' && outcomes.length > 2) {
      setOutcomes([emptyOutcome('Team A'), emptyOutcome('Team B')]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Arbitrage Analyzer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Check if user-entered odds satisfy the mathematical arbitrage condition
        </p>
      </div>

      {/* Warning */}
      <div className="card p-3 border-yellow-500/20 bg-yellow-500/5">
        <div className="flex gap-2 text-xs text-yellow-400">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            Enter odds manually from your own sources. Ensure all odds refer to the same market and same settlement rules.
            Different markets, incompatible outcomes, or stale odds will produce invalid results.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Market Outcomes</h2>
              <SelectField
                label=""
                value={marketType}
                options={[
                  { value: 'two-way', label: 'Two-Way' },
                  { value: 'three-way', label: 'Three-Way' },
                  { value: 'custom', label: 'Custom' },
                ]}
                onChange={handleMarketTypeChange}
                id="arb-market"
              />
            </div>

            <div className="space-y-3">
              {outcomes.map((outcome, index) => (
                <div
                  key={outcome.id}
                  className="group rounded-lg border border-white/[0.04] bg-navy-800/50 p-3 animate-fade-in"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      Outcome {index + 1}
                    </span>
                    {outcomes.length > 2 && (
                      <button
                        onClick={() => removeOutcome(outcome.id)}
                        className="btn-icon text-red-400/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove outcome"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label" htmlFor={`arb-name-${index}`}>Name</label>
                      <input
                        type="text"
                        id={`arb-name-${index}`}
                        value={outcome.name}
                        onChange={(e) => updateOutcome(outcome.id, 'name', e.target.value)}
                        className="input-field"
                        placeholder="e.g. Home"
                      />
                    </div>
                    <NumberInput
                      label="Decimal Odds"
                      value={outcome.decimalOdds}
                      onChange={(v) => updateOutcome(outcome.id, 'decimalOdds', v)}
                      placeholder="1.01+"
                      id={`arb-odds-${index}`}
                      min={1.01}
                      step="0.01"
                    />
                    <div>
                      <label className="label" htmlFor={`arb-bookie-${index}`}>Bookmaker</label>
                      <input
                        type="text"
                        id={`arb-bookie-${index}`}
                        value={outcome.bookmaker}
                        onChange={(e) => updateOutcome(outcome.id, 'bookmaker', e.target.value)}
                        className="input-field"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addOutcome} className="btn-secondary mt-3">
              <Plus size={16} /> Add Outcome
            </button>
          </div>

          <div className="card p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberInput
                label="Total Investment"
                value={totalInvestment}
                onChange={setTotalInvestment}
                prefix={currencySymbol}
                placeholder="100"
                id="arb-investment"
                min={0}
                step="1"
                tooltip="The total amount to distribute across all outcomes."
              />
              <NumberInput
                label="Commission %"
                value={commission}
                onChange={setCommission}
                placeholder="0"
                id="arb-commission"
                min={0}
                step="0.1"
                tooltip="Commission applied to winnings."
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-5">
          {result ? (
            <>
              {/* Status */}
              <div
                className={`card p-4 border-l-4 ${
                  result.isArbitrage
                    ? 'border-l-emerald-500 bg-emerald-500/5'
                    : 'border-l-red-500 bg-red-500/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {result.isArbitrage ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : (
                    <AlertTriangle size={16} className="text-red-400" />
                  )}
                  <span
                    className={`text-sm font-semibold ${
                      result.isArbitrage ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {result.isArbitrage
                      ? 'Arbitrage Condition Met (Before Costs)'
                      : 'No Arbitrage (Negative Margin)'}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {result.isArbitrage
                    ? 'The implied probability sum is below 100%. This satisfies the mathematical arbitrage condition before accounting for fees, limits, and execution.'
                    : 'The implied probability sum exceeds 100%, indicating the bookmaker margin eliminates arbitrage.'}
                </p>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Analysis</h3>
                <ResultRow
                  label="Implied Probability Sum"
                  value={formatPercent(result.impliedProbabilitySum)}
                  type={result.impliedProbabilitySum < 1 ? 'positive' : 'negative'}
                  tooltip="Sum of 1/odds for each outcome. Must be < 100% for arbitrage."
                />
                <ResultRow
                  label="Bookmaker Margin"
                  value={`${result.margin >= 0 ? '+' : ''}${result.margin.toFixed(2)}%`}
                  type={result.margin < 0 ? 'positive' : 'negative'}
                />
                <SectionDivider />
                <ResultRow
                  label="Total Stake"
                  value={formatCurrency(result.totalStake, currencySymbol)}
                  type="neutral"
                />
                <ResultRow
                  label="Guaranteed Return"
                  value={formatCurrency(result.guaranteedReturn, currencySymbol)}
                  type="highlight"
                />
                <ResultRow
                  label="Gross Profit"
                  value={formatCurrency(result.profit, currencySymbol)}
                  type={result.profit >= 0 ? 'positive' : 'negative'}
                  large
                />
                <ResultRow
                  label="Profit %"
                  value={`${result.profitPercentage.toFixed(2)}%`}
                  type={result.profitPercentage >= 0 ? 'positive' : 'negative'}
                />

                {result.afterCommission && (
                  <>
                    <SectionDivider />
                    <ResultRow
                      label="Profit After Commission"
                      value={formatCurrency(result.afterCommission.profit, currencySymbol)}
                      type={result.afterCommission.profit >= 0 ? 'positive' : 'negative'}
                    />
                  </>
                )}
              </div>

              {/* Stake allocation */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Optimal Stake Allocation
                </h3>
                <div className="space-y-2">
                  {result.stakes.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0"
                    >
                      <div>
                        <span className="text-sm text-gray-300">{s.outcome}</span>
                        <span className="text-xs text-gray-500 block">
                          Return: {formatCurrency(s.potentialReturn, currencySymbol)}
                        </span>
                      </div>
                      <span className="text-sm font-semibold font-mono text-blue-400">
                        {formatCurrency(s.stake, currencySymbol)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 flex items-center justify-center mb-4">
                <TrendingUp size={24} className="text-emerald-400/60" />
              </div>
              <h3 className="text-sm font-medium text-gray-300 mb-1">
                Enter odds to analyze
              </h3>
              <p className="text-xs text-gray-500 max-w-xs">
                Enter at least two outcomes with valid odds and an investment amount.
              </p>
            </div>
          )}
        </div>
      </div>

      <Collapsible title="📚 How arbitrage analysis works">
        <div className="text-sm text-gray-400 space-y-3 leading-relaxed">
          <p>
            <strong className="text-gray-300">Arbitrage</strong> exists when the sum of implied probabilities across all outcomes
            is less than 100%. This can occur when different bookmakers offer different odds.
          </p>
          <p>
            Formula: <code className="text-blue-400">Σ(1/odds_i) &lt; 1</code>
          </p>
          <p>
            When this condition is met, you can distribute stakes to guarantee a return greater than your total investment,
            regardless of outcome. However, real-world factors like stake limits, odds changes, commission, and execution
            delays may prevent you from capturing the theoretical profit.
          </p>
          <p className="text-xs text-yellow-400/60">
            ⚠️ This tool does not verify that entered odds are from compatible markets. Always ensure odds refer to the
            exact same event and settlement rules.
          </p>
        </div>
      </Collapsible>
    </div>
  );
}
