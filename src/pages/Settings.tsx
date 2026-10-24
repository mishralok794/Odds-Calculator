import React from 'react';
import { Settings as SettingsIcon, Save, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SelectField, NumberInput, ConfirmDialog } from '../components/ui';
import type { OddsFormat, Sport, MarketType } from '../types';
import { CURRENCIES, SPORTS, MARKET_TYPES, DEFAULT_PREFERENCES } from '../types';

export default function SettingsPage() {
  const { preferences, updatePreferences } = useApp();
  const [saved, setSaved] = React.useState(false);
  const [showReset, setShowReset] = React.useState(false);

  const handleReset = () => {
    updatePreferences(DEFAULT_PREFERENCES);
    setShowReset(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize your preferences. Changes are saved automatically.
          </p>
        </div>
        <button onClick={() => setShowReset(true)} className="btn-ghost text-xs">
          <RotateCcw size={14} /> Reset to Defaults
        </button>
      </div>

      {saved && (
        <div className="card p-3 border-emerald-500/20 bg-emerald-500/5 animate-fade-in">
          <p className="text-xs text-emerald-400 flex items-center gap-2">
            <Save size={14} /> Preferences saved successfully
          </p>
        </div>
      )}

      {/* Currency */}
      <div className="card p-5 space-y-4">
        <h2 className="section-title flex items-center gap-2">
          <SettingsIcon size={18} className="text-gray-500" />
          General
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Currency"
            value={preferences.currency}
            options={CURRENCIES.map((c) => ({
              value: c.code,
              label: `${c.symbol} ${c.name} (${c.code})`,
            }))}
            onChange={(v) => {
              const cur = CURRENCIES.find((c) => c.code === v);
              updatePreferences({
                currency: v,
                currencySymbol: cur?.symbol || '$',
              });
            }}
            id="settings-currency"
          />
          <SelectField
            label="Default Odds Format"
            value={preferences.defaultOddsFormat}
            options={[
              { value: 'decimal', label: 'Decimal' },
              { value: 'fractional', label: 'Fractional' },
              { value: 'american', label: 'American' },
            ]}
            onChange={(v) => updatePreferences({ defaultOddsFormat: v as OddsFormat })}
            id="settings-odds-format"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Default Sport"
            value={preferences.defaultSport}
            options={SPORTS.map((s) => ({ value: s.value, label: `${s.icon} ${s.label}` }))}
            onChange={(v) => updatePreferences({ defaultSport: v as Sport })}
            id="settings-sport"
          />
          <SelectField
            label="Default Market Type"
            value={preferences.defaultMarketType}
            options={MARKET_TYPES.map((m) => ({ value: m.value, label: m.label }))}
            onChange={(v) => updatePreferences({ defaultMarketType: v as MarketType })}
            id="settings-market"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Stake Increment"
            value={String(preferences.stakeIncrement)}
            options={[
              { value: '0.01', label: `${preferences.currencySymbol}0.01` },
              { value: '0.10', label: `${preferences.currencySymbol}0.10` },
              { value: '0.50', label: `${preferences.currencySymbol}0.50` },
              { value: '1.00', label: `${preferences.currencySymbol}1.00` },
              { value: '5.00', label: `${preferences.currencySymbol}5.00` },
            ]}
            onChange={(v) => updatePreferences({ stakeIncrement: parseFloat(v) })}
            id="settings-increment"
          />
          <NumberInput
            label="Default Commission %"
            value={String(preferences.defaultCommission)}
            onChange={(v) => updatePreferences({ defaultCommission: parseFloat(v) || 0 })}
            placeholder="0"
            id="settings-commission"
            min={0}
            step="0.1"
          />
        </div>
      </div>

      {/* Privacy */}
      <div className="card p-5 space-y-3">
        <h2 className="section-title">Data & Privacy</h2>
        <div className="text-sm text-gray-400 space-y-2 leading-relaxed">
          <p>
            All your data is stored locally in your browser using <strong className="text-gray-300">localStorage</strong>.
            No data is sent to any server.
          </p>
          <p>
            This application does not store passwords, payment details, or sensitive account information.
          </p>
          <p className="text-xs text-yellow-400/60">
            ⚠️ Local browser storage may be lost if you clear your browser data, use incognito mode, or switch browsers.
            Use the export feature in the Multi-Bet Tracker to back up your calculations.
          </p>
        </div>
      </div>

      {/* About */}
      <div className="card p-5 space-y-3">
        <h2 className="section-title">About OddsPilot</h2>
        <div className="text-sm text-gray-400 space-y-2 leading-relaxed">
          <p>
            <strong className="text-gray-300">OddsPilot</strong> is a sports odds calculator and hedge analyzer.
            It is a calculator tool, not a betting recommendation engine.
          </p>
          <p>
            This application does not place bets, connect to betting accounts, or require deposits.
            All calculations are mathematical models that may not account for every real-world factor.
          </p>
          <p className="text-xs text-gray-500">Version 1.0.0 · Built with React, TypeScript, Vite, and Tailwind CSS</p>
        </div>
      </div>

      <ConfirmDialog
        open={showReset}
        title="Reset Preferences"
        message="This will reset all settings to their default values."
        confirmLabel="Reset"
        onConfirm={handleReset}
        onCancel={() => setShowReset(false)}
      />
    </div>
  );
}
