import React, { useState, useMemo } from 'react';
import { Percent, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calcProbability } from '../utils/probabilityCalc';
import { NumberInput, ResultRow, SectionDivider, Collapsible } from '../components/ui';
import { formatCurrency, formatPercent } from '../utils/storage';

export default function ProbabilityCalculatorPage() {
  const { currencySymbol } = useApp();
  const [decimalOdds, setDecimalOdds] = useState('');
  const [stake, setStake] = useState('');
  const [estimatedProb, setEstimatedProb] = useState('');

  const result = useMemo(() => {
    const odds = parseFloat(decimalOdds);
    const s = parseFloat(stake);
    const est = estimatedProb ? parseFloat(estimatedProb) / 100 : undefined;
    if (!odds || !s) return null;
    return calcProbability(odds, s, est);
  }, [decimalOdds, stake, estimatedProb]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Probability Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Calculate implied probability, expected value, and potential returns
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberInput
            label="Decimal Odds"
            value={decimalOdds}
            onChange={setDecimalOdds}
            placeholder="2.50"
            id="prob-odds"
            min={1.01}
            step="0.01"
          />
          <NumberInput
            label="Stake"
            value={stake}
            onChange={setStake}
            prefix={currencySymbol}
            placeholder="100"
            id="prob-stake"
            min={0}
            step="0.01"
          />
          <NumberInput
            label="Your Estimated Probability %"
            value={estimatedProb}
            onChange={setEstimatedProb}
            placeholder="Optional (e.g. 45)"
            id="prob-estimate"
            min={0}
            step="0.1"
            tooltip="Your personal estimate of the true probability. This is NOT the bookmaker's implied probability. Used to calculate expected value."
          />
        </div>
        {estimatedProb && (
          <div className="flex gap-2 text-xs text-yellow-400/80 bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-2.5">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              Your estimated probability is a personal assessment, not a verified prediction. 
              Expected value calculations depend entirely on this estimate's accuracy.
            </span>
          </div>
        )}
      </div>

      {result && (
        <div className="card p-5 animate-slide-up">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Percent size={16} className="text-blue-400" />
            Results
          </h3>

          <ResultRow
            label="Implied Probability"
            value={formatPercent(result.impliedProbability)}
            type="highlight"
            tooltip="Probability implied by the bookmaker's odds. Includes the bookmaker's margin."
          />
          <ResultRow
            label="Potential Gross Return"
            value={formatCurrency(result.grossReturn, currencySymbol)}
            type="neutral"
            tooltip="Total amount returned if the bet wins, including the original stake."
          />
          <ResultRow
            label="Potential Net Profit"
            value={formatCurrency(result.netProfit, currencySymbol)}
            type="positive"
            tooltip="Profit if the bet wins (gross return minus stake)."
          />

          {result.expectedValue !== undefined && result.probabilityDifference !== undefined && (
            <>
              <SectionDivider />
              <ResultRow
                label="Your Estimated Probability"
                value={formatPercent(parseFloat(estimatedProb) / 100)}
                type="neutral"
              />
              <ResultRow
                label="Probability Difference"
                value={`${result.probabilityDifference > 0 ? '+' : ''}${formatPercent(result.probabilityDifference)}`}
                type={result.probabilityDifference > 0 ? 'positive' : 'negative'}
                tooltip="Difference between your estimate and the implied probability. Positive means you think the outcome is more likely than the odds suggest."
              />
              <ResultRow
                label="Expected Value (EV)"
                value={formatCurrency(result.expectedValue, currencySymbol)}
                type={result.expectedValue >= 0 ? 'positive' : 'negative'}
                large
                tooltip="The average profit/loss per bet if placed repeatedly at these odds with your estimated probability. Positive EV suggests a theoretically profitable bet."
              />
              <div className="mt-2 p-3 rounded-lg bg-navy-800/50 border border-white/[0.04]">
                <p className="text-xs text-gray-500">
                  {result.expectedValue >= 0
                    ? `Based on your estimate, this bet has a positive expected value of ${formatCurrency(result.expectedValue, currencySymbol)} per bet. This means it could be theoretically profitable over many repetitions — assuming your probability estimate is accurate.`
                    : `Based on your estimate, this bet has a negative expected value of ${formatCurrency(result.expectedValue, currencySymbol)} per bet. This means it would likely result in losses over many repetitions — assuming your probability estimate is accurate.`}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <Collapsible title="📚 How Expected Value works">
        <div className="text-sm text-gray-400 space-y-3 leading-relaxed">
          <p>
            <strong className="text-gray-300">Expected Value (EV)</strong> measures the average outcome of a bet if repeated many times.
          </p>
          <p>
            Formula: <code className="text-blue-400">EV = (probability × net_profit) − ((1 − probability) × stake)</code>
          </p>
          <p>
            Example: {currencySymbol}100 at odds 2.50, estimated 45% chance:
          </p>
          <p className="pl-4 text-xs text-gray-500">
            EV = (0.45 × {currencySymbol}150) − (0.55 × {currencySymbol}100) = {currencySymbol}67.50 − {currencySymbol}55.00 = <span className="text-emerald-400">+{currencySymbol}12.50</span>
          </p>
          <p>
            A positive EV means the bet is theoretically profitable over time, but only if your probability estimate is correct.
            No single bet outcome is guaranteed.
          </p>
        </div>
      </Collapsible>
    </div>
  );
}
