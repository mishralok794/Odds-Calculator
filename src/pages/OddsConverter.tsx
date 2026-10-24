import React, { useState, useMemo } from 'react';
import { ArrowLeftRight, ArrowRight, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { convertOdds } from '../utils/oddsConverter';
import { NumberInput, ResultRow, SectionDivider, Collapsible } from '../components/ui';
import type { OddsFormat } from '../types';
import { formatPercent } from '../utils/storage';

const FORMATS: { value: OddsFormat; label: string; placeholder: string }[] = [
  { value: 'decimal', label: 'Decimal', placeholder: '2.50' },
  { value: 'fractional', label: 'Fractional', placeholder: '3/2' },
  { value: 'american', label: 'American', placeholder: '+150' },
];

export default function OddsConverterPage() {
  const { preferences } = useApp();
  const [fromFormat, setFromFormat] = useState<OddsFormat>(preferences.defaultOddsFormat);
  const [inputValue, setInputValue] = useState('');

  const result = useMemo(() => {
    if (!inputValue.trim()) return null;
    return convertOdds(inputValue, fromFormat);
  }, [inputValue, fromFormat]);

  const currentPlaceholder = FORMATS.find((f) => f.value === fromFormat)?.placeholder || '';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Odds Converter</h1>
        <p className="text-sm text-gray-500 mt-1">
          Convert between decimal, fractional, and American odds formats
        </p>
      </div>

      <div className="card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {FORMATS.map((fmt) => (
            <button
              key={fmt.value}
              onClick={() => {
                setFromFormat(fmt.value);
                setInputValue('');
              }}
              className={`p-3 rounded-lg border text-center transition-all ${
                fromFormat === fmt.value
                  ? 'border-blue-500/30 bg-blue-600/10 text-blue-400'
                  : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-sm font-medium">{fmt.label}</span>
            </button>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="odds-input">
            Enter {FORMATS.find((f) => f.value === fromFormat)?.label} Odds
          </label>
          <input
            type="text"
            id="odds-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="input-field text-lg font-mono"
            placeholder={currentPlaceholder}
            autoFocus
          />
          {inputValue && !result && (
            <p className="text-xs text-red-400 mt-1.5">
              Invalid odds. {fromFormat === 'decimal' ? 'Must be ≥ 1.01' : fromFormat === 'fractional' ? 'Use format like 3/2' : 'Use format like +150 or -200'}
            </p>
          )}
        </div>
      </div>

      {result && (
        <div className="card p-5 animate-slide-up">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-blue-400" />
            Conversion Results
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-navy-800/50 border border-white/[0.04]">
              <span className="text-xs text-gray-500 block mb-1">Decimal</span>
              <span className="text-xl font-bold font-mono text-blue-400">
                {result.decimal.toFixed(2)}
              </span>
            </div>
            <div className="p-4 rounded-lg bg-navy-800/50 border border-white/[0.04]">
              <span className="text-xs text-gray-500 block mb-1">Fractional</span>
              <span className="text-xl font-bold font-mono text-purple-400">
                {result.fractional}
              </span>
            </div>
            <div className="p-4 rounded-lg bg-navy-800/50 border border-white/[0.04]">
              <span className="text-xs text-gray-500 block mb-1">American</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {result.american}
              </span>
            </div>
          </div>

          <SectionDivider />

          <ResultRow
            label="Implied Probability"
            value={formatPercent(result.impliedProbability)}
            type="highlight"
            tooltip="The probability implied by the bookmaker's odds. This typically includes the bookmaker's margin and may not reflect the true probability."
          />
        </div>
      )}

      <Collapsible title="ℹ️ About Implied Probability">
        <div className="text-sm text-gray-400 space-y-3 leading-relaxed">
          <p>
            <strong className="text-gray-300">Implied probability</strong> is the probability suggested by the bookmaker's odds. 
            It is calculated as <code className="text-blue-400">1 / decimal_odds</code>.
          </p>
          <p>
            Bookmaker odds generally include a margin (overround), meaning the sum of implied probabilities across all outcomes
            typically exceeds 100%. The true probability of each outcome is lower than the implied probability.
          </p>
          <p>
            For example, if a two-outcome market has odds of 1.90 on both sides, each implies ~52.6% probability, 
            summing to 105.3%. The extra 5.3% is the bookmaker's margin.
          </p>
        </div>
      </Collapsible>
    </div>
  );
}
