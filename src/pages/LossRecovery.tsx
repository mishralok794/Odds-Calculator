import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';

type RecoverySession = { loss: string; odds: string; rounds: number };
const STORAGE_KEY = 'oddspilot-loss-recovery-session';
const EMPTY_SESSION: RecoverySession = { loss: '10', odds: '1.4', rounds: 0 };

export default function LossRecoveryPage() {
  const { currencySymbol } = useApp();
  const [session, setSession] = useState<RecoverySession>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...EMPTY_SESSION, ...JSON.parse(stored) } : EMPTY_SESSION;
    } catch {
      return EMPTY_SESSION;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const loss = Number(session.loss);
  const odds = Number(session.odds);
  const valid = Number.isFinite(loss) && loss >= 0 && Number.isFinite(odds) && odds > 1;
  const stake = useMemo(() => valid ? Math.ceil((loss / (odds - 1)) * 100) / 100 : null, [loss, odds, valid]);
  const fmt = (value: number) => `${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const markLost = () => {
    if (stake === null) return;
    setSession((current) => ({ ...current, loss: (Number(current.loss) + stake).toFixed(2), rounds: current.rounds + 1 }));
  };
  const reset = () => setSession(EMPTY_SESSION);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-slide-up">
      <header>
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2"><RotateCcw size={16} /> BETTING TOOLS <span className="text-gray-600">/</span> LOSS RECOVERY</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Loss Recovery Calculator</h1>
        <p className="text-gray-400 mt-2 max-w-2xl">Apni ab tak ki total haar aur current decimal odds daaliye. Calculator agle stake ka estimate dikhayega.</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_0.9fr] gap-5 items-start">
        <section className="card p-5 sm:p-6 space-y-5">
          <div>
            <label className="label" htmlFor="recovery-loss">Ab tak ka total loss ({currencySymbol})</label>
            <input id="recovery-loss" className="input-field text-lg" type="number" min="0" step="0.01" value={session.loss} onChange={(e) => setSession((s) => ({ ...s, loss: e.target.value }))} placeholder="Jaise 10.00" />
            <p className="text-xs text-gray-500 mt-1.5">Is series mein pehle haare hue stakes ka total. Aap ise kabhi bhi edit kar sakte hain.</p>
          </div>
          <div>
            <label className="label" htmlFor="recovery-odds">Current decimal odds</label>
            <input id="recovery-odds" className="input-field text-lg" type="number" min="1.01" step="0.01" value={session.odds} onChange={(e) => setSession((s) => ({ ...s, odds: e.target.value }))} placeholder="Jaise 1.40" />
            <p className="text-xs text-gray-500 mt-1.5">Har naye bet ke liye odds update karein. Odds 1.00 se zyada hone chahiye.</p>
          </div>
          {!valid && <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">Sahi calculation ke liye loss 0 ya usse zyada aur odds 1.00 se zyada daalein.</div>}
          <button className="btn-secondary w-full" onClick={reset}><RotateCcw size={16} /> Nayi recovery series shuru karein</button>
        </section>

        <section className="card p-5 sm:p-6 border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-indigo-600/5">
          <div className="flex items-center gap-2 text-gray-300 text-sm"><TrendingUp size={17} className="text-blue-400" /> Recovery ke liye agla stake</div>
          <div className="text-4xl sm:text-5xl font-bold text-white mt-4 mb-2">{stake === null ? '—' : fmt(stake)}</div>
          <p className="text-sm text-gray-400">Agar yeh bet jeeta, to diye gaye loss ke barabar net profit banega.</p>
          {valid && <div className="mt-5 border-t border-white/[0.08] pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400"><span>Current total loss</span><span className="text-gray-200">{fmt(loss)}</span></div>
            <div className="flex justify-between text-gray-400"><span>Odds</span><span className="text-gray-200">{odds.toFixed(2)}×</span></div>
            <div className="flex justify-between text-gray-400"><span>Estimated net winnings</span><span className="text-emerald-400">{stake === null ? '—' : fmt(stake * (odds - 1))}</span></div>
          </div>}
          <button className="btn-primary w-full mt-5" disabled={stake === null} onClick={markLost}>Yeh stake bhi haar gaya — total mein jodein</button>
          {session.rounds > 0 && <p className="text-xs text-gray-500 text-center mt-3">Is series mein {session.rounds} haare hue stake auto-add hue hain.</p>}
        </section>
      </div>

      <div className="card p-4 flex gap-3 border-amber-500/15 bg-amber-500/[0.04]">
        <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed"><span className="text-amber-300 font-medium">Dhyan rahe:</span> Haar ke baad stake badhane se nuksan recover hone ki guarantee nahi hoti; lagatar haare to required amount bahut tezi se badh sakta hai. Yeh sirf hisaab ka tool hai, betting salah nahi. Bet jeetne par net return = stake × (odds − 1), fees ya commission alag ho sakte hain.</p>
      </div>
    </div>
  );
}
