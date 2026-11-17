import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, RotateCcw, Trash2, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';

type LossRow = { id: string; amount: string };
type ManualSession = { losses: LossRow[]; odds: string; rounds: number; stakeOverride: string };
type PlanRow = { stake: string; lossBefore: string };
const MANUAL_KEY = 'oddspilot-loss-recovery-session-v2';
const PLAN_KEY = 'oddspilot-recovery-plan-v1';
const makeRow = (amount = ''): LossRow => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, amount });
const EMPTY_MANUAL: ManualSession = { losses: [makeRow('')], odds: '1.4', rounds: 0, stakeOverride: '' };

function readManual(): ManualSession {
  try {
    const saved = localStorage.getItem(MANUAL_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<ManualSession>;
      return { ...EMPTY_MANUAL, ...parsed, losses: Array.isArray(parsed.losses) ? parsed.losses : [makeRow('')] };
    }
    const previous = localStorage.getItem('oddspilot-loss-recovery-session');
    if (previous) {
      const parsed = JSON.parse(previous) as { loss?: string; odds?: string; rounds?: number };
      return { losses: parsed.loss && Number(parsed.loss) > 0 ? [makeRow(parsed.loss)] : [makeRow('')], odds: parsed.odds || '1.4', rounds: parsed.rounds || 0, stakeOverride: '' };
    }
  } catch {
    // Keep a clean manual form if saved browser data cannot be read.
  }
  return { ...EMPTY_MANUAL, losses: [makeRow('')] };
}

function makePlan(startLoss: number, odds: number, count = 6): PlanRow[] {
  const rows: PlanRow[] = [];
  let cumulativeLoss = startLoss;
  for (let index = 0; index < count; index += 1) {
    const stake = Math.ceil((cumulativeLoss / (odds - 1)) * 100) / 100;
    rows.push({ stake: stake.toFixed(2), lossBefore: cumulativeLoss.toFixed(2) });
    cumulativeLoss += stake;
  }
  return rows;
}

export default function LossRecoveryPage() {
  const { currencySymbol } = useApp();
  const [manual, setManual] = useState<ManualSession>(readManual);
  const [startLoss, setStartLoss] = useState('10');
  const [planOdds, setPlanOdds] = useState('1.4');
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);

  useEffect(() => { localStorage.setItem(MANUAL_KEY, JSON.stringify(manual)); }, [manual]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PLAN_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { startLoss?: string; odds?: string; rows?: PlanRow[] };
        setStartLoss(parsed.startLoss ?? '10');
        setPlanOdds(parsed.odds ?? '1.4');
        setPlanRows(Array.isArray(parsed.rows) ? parsed.rows : []);
      }
    } catch { /* Use the default example values. */ }
  }, []);
  useEffect(() => { localStorage.setItem(PLAN_KEY, JSON.stringify({ startLoss, odds: planOdds, rows: planRows })); }, [startLoss, planOdds, planRows]);

  const fmt = (value: number) => `${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const createPlan = () => {
    const initial = Number(startLoss);
    const odds = Number(planOdds);
    if (!Number.isFinite(initial) || initial <= 0 || !Number.isFinite(odds) || odds <= 1) return;
    setPlanRows(makePlan(initial, odds));
  };
  const updatePlanStake = (index: number, value: string) => {
    setPlanRows((current) => {
      const updated = [...current];
      updated[index] = { ...updated[index], stake: value };
      let cumulative = Number(startLoss);
      const odds = Number(planOdds);
      for (let i = 0; i < updated.length; i += 1) {
        updated[i] = { ...updated[i], lossBefore: cumulative.toFixed(2) };
        const amount = Number(updated[i].stake);
        if (i > index && Number.isFinite(odds) && odds > 1 && Number.isFinite(cumulative) && cumulative > 0) {
          updated[i].stake = (Math.ceil((cumulative / (odds - 1)) * 100) / 100).toFixed(2);
        }
        const effectiveAmount = Number(updated[i].stake);
        if (Number.isFinite(effectiveAmount) && effectiveAmount > 0) cumulative += effectiveAmount;
        else if (!Number.isFinite(amount)) cumulative = Number.NaN;
      }
      return updated;
    });
  };
  const updatePlanOdds = (value: string) => {
    setPlanOdds(value);
    const odds = Number(value);
    const initial = Number(startLoss);
    if (planRows.length && odds > 1 && initial > 0) setPlanRows(makePlan(initial, odds));
  };
  const resetAll = () => {
    setStartLoss('10');
    setPlanOdds('1.4');
    setPlanRows([]);
    setManual({ ...EMPTY_MANUAL, losses: [makeRow('')] });
  };

  const totalLoss = useMemo(() => manual.losses.reduce((sum, row) => {
    const amount = Number(row.amount);
    return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0);
  }, 0), [manual.losses]);
  const manualOdds = Number(manual.odds);
  const manualValid = manual.losses.every((row) => row.amount.trim() !== '') && totalLoss > 0 && Number.isFinite(manualOdds) && manualOdds > 1;
  const suggestedStake = useMemo(() => manualValid ? Math.ceil((totalLoss / (manualOdds - 1)) * 100) / 100 : null, [totalLoss, manualOdds, manualValid]);
  const stake = manual.stakeOverride === '' ? suggestedStake : Number(manual.stakeOverride);
  const validStake = stake !== null && Number.isFinite(stake) && stake > 0;
  const updateManualLoss = (id: string, amount: string) => setManual((current) => ({ ...current, stakeOverride: '', losses: current.losses.map((row) => row.id === id ? { ...row, amount } : row) }));
  const markManualLoss = () => {
    if (!validStake) return;
    const amount = Number(stake);
    setManual((current) => ({ ...current, losses: [...current.losses, makeRow(amount.toFixed(2))], stakeOverride: '', rounds: current.rounds + 1 }));
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-slide-up">
      <header>
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2"><RotateCcw size={16} /> BETTING TOOLS <span className="text-gray-600">/</span> LOSS RECOVERY</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Loss Recovery Calculator</h1>
        <p className="text-gray-400 mt-2 max-w-2xl">Starting loss aur odds daal kar ek click mein 6 recovery stakes dekhein, ya neeche manual calculator use karein.</p>
      </header>

      <section className="card p-5 sm:p-6 space-y-5">
        <div>
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div>
              <h2 className="section-title">Automatic 6-row plan</h2>
              <p className="text-sm text-gray-400 mt-1">Starting loss ke baad agle 6 bets ke suggested stakes calculate honge.</p>
            </div>
            <button type="button" className="btn-secondary" onClick={resetAll}><RotateCcw size={16} /> Reset all</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="plan-start-loss">Starting loss ({currencySymbol})</label>
            <input id="plan-start-loss" className="input-field" type="number" min="0.01" step="0.01" value={startLoss} onChange={(event) => setStartLoss(event.target.value)} placeholder="Jaise 10.00" />
          </div>
          <div>
            <label className="label" htmlFor="plan-odds">Decimal odds</label>
            <input id="plan-odds" className="input-field" type="number" min="1.01" step="0.01" value={planOdds} onChange={(event) => updatePlanOdds(event.target.value)} placeholder="Jaise 1.40" />
          </div>
        </div>
        <button className="btn-primary" type="button" onClick={createPlan} disabled={!Number.isFinite(Number(startLoss)) || Number(startLoss) <= 0 || !Number.isFinite(Number(planOdds)) || Number(planOdds) <= 1}><Plus size={17} /> 6 recovery rows add karein</button>

        {planRows.length > 0 && <div className="space-y-2">
          <div className="grid grid-cols-[76px_1fr_1fr] gap-3 px-3 text-xs text-gray-500 uppercase tracking-wide"><span>Round</span><span>Is round se pehle ka loss</span><span>Suggested stake (editable)</span></div>
          {planRows.map((row, index) => (
            <div key={index} className="grid grid-cols-[76px_1fr_1fr] items-center gap-3 rounded-lg bg-white/[0.025] p-2 sm:p-3">
              <span className="text-sm text-gray-400">Bet {index + 1}</span>
              <span className="text-sm text-gray-300">{fmt(Number(row.lossBefore) || 0)}</span>
              <input aria-label={`Bet ${index + 1} recovery stake`} className="input-field" type="number" min="0.01" step="0.01" value={row.stake} onChange={(event) => updatePlanStake(index, event.target.value)} />
            </div>
          ))}
        </div>}
        {planRows.length === 0 && <p className="text-xs text-gray-500">“6 recovery rows add karein” dabane par rows yahan aa jayengi. Har suggested stake ko baad mein edit kar sakte hain.</p>}
      </section>

      <section className="card p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="section-title">Manual recovery calculator</h2>
          <p className="text-sm text-gray-400 mt-1">Apne losses khud enter karein; total ke liye agla stake calculate hoga.</p>
        </div>
        <div className="grid lg:grid-cols-[1fr_0.9fr] gap-5 items-start">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3 mb-2"><label className="label mb-0">Pichhli haari hui bets ({currencySymbol})</label><button className="btn-ghost text-xs" type="button" onClick={() => setManual((current) => ({ ...current, losses: [...current.losses, makeRow('')], stakeOverride: '' }))}><Plus size={15} /> Row jodein</button></div>
              <div className="space-y-2">{manual.losses.map((row, index) => <div key={row.id} className="flex items-center gap-2"><label className="text-xs text-gray-500 w-16 flex-shrink-0" htmlFor={`manual-loss-${row.id}`}>Loss {index + 1}</label><input id={`manual-loss-${row.id}`} className="input-field" type="number" min="0" step="0.01" value={row.amount} onChange={(event) => updateManualLoss(row.id, event.target.value)} placeholder="Amount" /><button className="btn-icon flex-shrink-0" type="button" onClick={() => setManual((current) => ({ ...current, losses: current.losses.length > 1 ? current.losses.filter((item) => item.id !== row.id) : [makeRow('')], stakeOverride: '' }))} aria-label={`Remove loss ${index + 1}`}><Trash2 size={16} /></button></div>)}</div>
              <div className="flex justify-between text-sm mt-3 px-1"><span className="text-gray-400">Total loss</span><span className="text-gray-100 font-semibold">{fmt(totalLoss)}</span></div>
            </div>
            <div><label className="label" htmlFor="manual-odds">Current decimal odds</label><input id="manual-odds" className="input-field" type="number" min="1.01" step="0.01" value={manual.odds} onChange={(event) => setManual((current) => ({ ...current, odds: event.target.value, stakeOverride: '' }))} /></div>
            <button className="btn-secondary" type="button" onClick={() => setManual({ ...EMPTY_MANUAL, losses: [makeRow('')] })}><RotateCcw size={16} /> Manual entries reset karein</button>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-indigo-600/5 p-5">
            <div className="flex items-center gap-2 text-gray-300 text-sm"><TrendingUp size={17} className="text-blue-400" /> Agla recovery stake</div>
            <label className="label mt-4" htmlFor="manual-stake">Stake ({currencySymbol})</label>
            <input id="manual-stake" className="input-field text-3xl font-bold text-white" type="number" min="0.01" step="0.01" value={manual.stakeOverride === '' ? suggestedStake ?? '' : manual.stakeOverride} onChange={(event) => setManual((current) => ({ ...current, stakeOverride: event.target.value }))} placeholder="Stake amount" />
            <p className="text-xs text-gray-500 mt-2">Suggested: {suggestedStake === null ? '—' : fmt(suggestedStake)}. Stake editable hai.</p>
            {manualValid && <p className="text-sm text-gray-400 mt-4">{fmt(totalLoss)} loss recover karne ke liye odds {manualOdds.toFixed(2)}× hain.</p>}
            <button className="btn-primary w-full mt-4" type="button" disabled={!manualValid || !validStake} onClick={markManualLoss}>Stake haar gaya — manual losses mein jodein</button>
            {manual.rounds > 0 && <p className="text-xs text-gray-500 text-center mt-3">{manual.rounds} stakes auto-add hue hain.</p>}
          </div>
        </div>
      </section>

      <div className="card p-4 flex gap-3 border-amber-500/15 bg-amber-500/[0.04]"><AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" /><p className="text-xs sm:text-sm text-gray-400 leading-relaxed"><span className="text-amber-300 font-medium">Dhyan rahe:</span> Haar ke baad stake badhane se nuksan recover hone ki guarantee nahi hoti; lagatar haare to required amount tezi se badh sakta hai. Yeh sirf hisaab ka tool hai, betting salah nahi. Net return = stake × (odds − 1); fees ya commission alag ho sakte hain.</p></div>
    </div>
  );
}
