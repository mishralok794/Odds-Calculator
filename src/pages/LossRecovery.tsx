import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, RotateCcw, Trash2, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';

type LossRow = { id: string; amount: string };
type RecoverySession = { losses: LossRow[]; odds: string; rounds: number; stakeOverride: string };
const STORAGE_KEY = 'oddspilot-loss-recovery-session-v2';
const makeRow = (amount = ''): LossRow => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, amount });
const EMPTY_SESSION: RecoverySession = { losses: [makeRow('2.00')], odds: '1.4', rounds: 0, stakeOverride: '' };

function readSession(): RecoverySession {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<RecoverySession>;
      return { ...EMPTY_SESSION, ...parsed, losses: Array.isArray(parsed.losses) ? parsed.losses : EMPTY_SESSION.losses };
    }
    // Preserve the single total loss from the previous version of this calculator.
    const previous = localStorage.getItem('oddspilot-loss-recovery-session');
    if (previous) {
      const parsed = JSON.parse(previous) as { loss?: string; odds?: string; rounds?: number };
      return {
        losses: parsed.loss && Number(parsed.loss) > 0 ? [makeRow(parsed.loss)] : [makeRow('')],
        odds: parsed.odds || '1.4',
        rounds: parsed.rounds || 0,
        stakeOverride: '',
      };
    }
  } catch {
    // Start with an editable example if saved browser data is unavailable.
  }
  return { ...EMPTY_SESSION, losses: [makeRow('2.00')] };
}

export default function LossRecoveryPage() {
  const { currencySymbol } = useApp();
  const [session, setSession] = useState<RecoverySession>(readSession);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const loss = useMemo(() => session.losses.reduce((sum, row) => {
    const amount = Number(row.amount);
    return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0);
  }, 0), [session.losses]);
  const odds = Number(session.odds);
  const hasLoss = session.losses.every((row) => row.amount.trim() !== '') && loss > 0;
  const valid = hasLoss && Number.isFinite(odds) && odds > 1;
  const suggestedStake = useMemo(() => valid ? Math.ceil((loss / (odds - 1)) * 100) / 100 : null, [loss, odds, valid]);
  const stake = session.stakeOverride === '' ? suggestedStake : Number(session.stakeOverride);
  const validStake = stake !== null && Number.isFinite(stake) && stake > 0;
  const fmt = (value: number) => `${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const updateLoss = (id: string, amount: string) => setSession((current) => ({
    ...current,
    stakeOverride: '',
    losses: current.losses.map((row) => row.id === id ? { ...row, amount } : row),
  }));
  const updateOdds = (value: string) => setSession((current) => ({ ...current, odds: value, stakeOverride: '' }));
  const markLost = () => {
    if (!validStake) return;
    const actualStake = Number(stake);
    setSession((current) => ({
      ...current,
      losses: [...current.losses, makeRow(actualStake.toFixed(2))],
      stakeOverride: '',
      rounds: current.rounds + 1,
    }));
  };
  const addLossRow = () => setSession((current) => ({ ...current, losses: [...current.losses, makeRow('')] }));
  const removeLoss = (id: string) => setSession((current) => ({
    ...current,
    losses: current.losses.length > 1 ? current.losses.filter((row) => row.id !== id) : [makeRow('')],
    stakeOverride: '',
  }));
  const reset = () => setSession({ ...EMPTY_SESSION, losses: [makeRow('')] });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-slide-up">
      <header>
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2"><RotateCcw size={16} /> BETTING TOOLS <span className="text-gray-600">/</span> LOSS RECOVERY</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Loss Recovery Calculator</h1>
        <p className="text-gray-400 mt-2 max-w-2xl">Har haari hui bet alag row mein rakhein. Sabhi losses ko jodkar current odds par agla recovery stake calculate hoga.</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_0.9fr] gap-5 items-start">
        <section className="card p-5 sm:p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="label mb-0">Pichhli haari hui bets ({currencySymbol})</label>
              <button className="btn-ghost text-xs" type="button" onClick={addLossRow}><Plus size={15} /> Row jodein</button>
            </div>
            <div className="space-y-2">
              {session.losses.map((row, index) => (
                <div key={row.id} className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-16 flex-shrink-0" htmlFor={`loss-${row.id}`}>Loss {index + 1}</label>
                  <input id={`loss-${row.id}`} aria-label={`Loss ${index + 1}`} className="input-field" type="number" min="0" step="0.01" value={row.amount} onChange={(event) => updateLoss(row.id, event.target.value)} placeholder="Amount" />
                  <button className="btn-icon flex-shrink-0" type="button" onClick={() => removeLoss(row.id)} aria-label={`Remove loss ${index + 1}`} title="Row hataayein"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm mt-3 px-1"><span className="text-gray-400">Total loss</span><span className="text-gray-100 font-semibold">{fmt(loss)}</span></div>
            <p className="text-xs text-gray-500 mt-2">Amount badlein ya row add/remove karein; total aur suggested stake automatic update honge.</p>
          </div>
          <div>
            <label className="label" htmlFor="recovery-odds">Current decimal odds</label>
            <input id="recovery-odds" className="input-field text-lg" type="number" min="1.01" step="0.01" value={session.odds} onChange={(event) => updateOdds(event.target.value)} placeholder="Jaise 1.40" />
            <p className="text-xs text-gray-500 mt-1.5">Har agle bet ke liye odds edit kar sakte hain.</p>
          </div>
          {!valid && <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">Har loss row mein 0 se zyada amount aur odds 1.00 se zyada daalein.</div>}
          <button className="btn-secondary w-full" type="button" onClick={reset}><RotateCcw size={16} /> Nayi recovery series shuru karein</button>
        </section>

        <section className="card p-5 sm:p-6 border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-indigo-600/5">
          <div className="flex items-center gap-2 text-gray-300 text-sm"><TrendingUp size={17} className="text-blue-400" /> Sabhi losses recover karne ka agla stake</div>
          <label className="label mt-4" htmlFor="recovery-stake">Aapka agla stake ({currencySymbol})</label>
          <input id="recovery-stake" aria-label="Agla stake" className="input-field text-3xl sm:text-4xl font-bold text-white mb-2" type="number" min="0.01" step="0.01" value={session.stakeOverride === '' ? suggestedStake ?? '' : session.stakeOverride} onChange={(event) => setSession((current) => ({ ...current, stakeOverride: event.target.value }))} placeholder="Stake amount" />
          <p className="text-xs text-gray-500">Suggested stake: {suggestedStake === null ? '—' : fmt(suggestedStake)}. Aap ise edit bhi kar sakte hain.</p>
          {valid && <div className="mt-5 border-t border-white/[0.08] pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400"><span>Total losses to recover</span><span className="text-gray-200">{fmt(loss)}</span></div>
            <div className="flex justify-between text-gray-400"><span>Current odds</span><span className="text-gray-200">{odds.toFixed(2)}×</span></div>
            <div className="flex justify-between text-gray-400"><span>Estimated net winnings</span><span className="text-emerald-400">{validStake ? fmt(stake * (odds - 1)) : '—'}</span></div>
          </div>}
          <button className="btn-primary w-full mt-5" type="button" disabled={!valid || !validStake} onClick={markLost}>Yeh stake haar gaya — {validStake ? fmt(stake) : 'stake'} ko losses mein jodein</button>
          <p className="text-xs text-gray-500 text-center mt-3">Haarne par dabayein: current stake agali loss row mein judega aur naya stake niklega.</p>
        </section>
      </div>

      <div className="card p-4 flex gap-3 border-amber-500/15 bg-amber-500/[0.04]">
        <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed"><span className="text-amber-300 font-medium">Dhyan rahe:</span> Haar ke baad stake badhane se nuksan recover hone ki guarantee nahi hoti; lagatar haare to required amount bahut tezi se badh sakta hai. Yeh sirf hisaab ka tool hai, betting salah nahi. Net return = stake × (odds − 1); fees ya commission alag ho sakte hain.</p>
      </div>
    </div>
  );
}
