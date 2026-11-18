import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, ChevronLeft, ChevronRight, ClipboardList, Download, FileDown,
  History, LayoutDashboard, Play, Save, Settings2, Target, Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from 'recharts';
import type { BallHistoryRow, BetStatus, PlayerReport, StrategyAnalysis } from '../utils/strategyAnalyzer';
import { analyzeStrategy, STRATEGY_RULES } from '../utils/strategyAnalyzer';
import { STRATEGY_SAMPLES } from '../utils/strategySamples';

type SectionId = 'dashboard' | 'input' | 'history' | 'player-a' | 'player-b' | 'comparison' | 'settings';
type SavedAnalysis = { id: string; name: string; savedAt: string; source: string; outcomes: number[] };
type RunResult = { outcomes: number[]; source: string; analysis: StrategyAnalysis };

const SECTIONS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'input', label: 'Input Data', icon: Upload },
  { id: 'history', label: 'Ball History', icon: History },
  { id: 'player-a', label: 'Player A Report', icon: Target },
  { id: 'player-b', label: 'Player B Report', icon: Target },
  { id: 'comparison', label: 'Comparison', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];
const SAVE_KEY = 'oddspilot-strategy-analyzer-saved';
const STATUS_CLASS: Record<BetStatus, string> = {
  WIN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  LOSS: 'bg-red-500/10 text-red-400 border-red-500/20',
  RECOVERY: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const money = (value: number) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const percent = (value: number) => `${value.toFixed(2)}%`;
const dateTime = (value: string) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function readSaved(): SavedAnalysis[] {
  try {
    const value = localStorage.getItem(SAVE_KEY);
    return value ? JSON.parse(value) as SavedAnalysis[] : [];
  } catch { return []; }
}

function StatusBadge({ status }: { status: BetStatus }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${STATUS_CLASS[status]}`}>{status}</span>;
}

function MetricCard({ label, value, note, tone = 'text-gray-100' }: { label: string; value: string; note?: string; tone?: string }) {
  return <div className="card p-4"><p className="text-xs text-gray-500">{label}</p><p className={`text-xl sm:text-2xl font-bold mt-2 ${tone}`}>{value}</p>{note && <p className="text-xs text-gray-500 mt-1">{note}</p>}</div>;
}

function PlayerReportView({ report }: { report: PlayerReport }) {
  const winPct = report.winningPercentage;
  const recoveryPct = report.lossCycles ? percent(report.recoverySuccessPercentage) : 'N/A';
  const rows: [string, string][] = [
    ['Total balls analyzed', String(report.balls)], ['Normal wins', String(report.wins)], ['Losses', String(report.losses)],
    ['Recoveries', String(report.recoveries)], ['Winning percentage', percent(winPct)],
    ['Recovery success', recoveryPct], ['Normal win investment', money(report.normalInvestment)],
    ['Recovery investment', money(report.recoveryInvestment)], ['Loss investment', money(report.lossInvestment)],
    ['Total investment', money(report.totalInvestment)], ['Total lost amount', money(report.totalLostAmount)],
    ['Normal win returns', money(report.normalWinReturns)], ['Recovery returns', money(report.recoveryReturns)],
    ['Total return', money(report.totalReturn)], ['Net profit / loss', money(report.netProfitLoss)],
    ['ROI', percent(report.roi)], ['Pending recovery amount', money(report.pendingRecovery)],
    ['Next required recovery bet', money(report.nextRequiredBet)],
  ];
  return <div className="space-y-5">
    <div><h2 className="text-2xl font-bold text-gray-100">Player {report.player} Report</h2><p className="text-sm text-gray-400 mt-1">Target: {report.targetDescription} · Odds {report.odds} · Normal bet {money(report.normalBet)}</p></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <MetricCard label="Net profit / loss" value={money(report.netProfitLoss)} tone={report.netProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'} />
      <MetricCard label="Total investment" value={money(report.totalInvestment)} />
      <MetricCard label="Total return" value={money(report.totalReturn)} />
      <MetricCard label="Pending recovery" value={money(report.pendingRecovery)} tone={report.pendingRecovery > 0 ? 'text-amber-400' : 'text-gray-100'} />
    </div>
    {report.pendingRecovery > 0 && <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">Sequence recovery ke dauran khatam hui. Pending {money(report.pendingRecovery)} abhi recover nahi hua; next target par required bet {money(report.nextRequiredBet)} hai.</div>}
    <div className="card overflow-hidden"><div className="divide-y divide-white/[0.06] sm:grid sm:grid-cols-2 sm:divide-y-0">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 px-4 py-3 text-sm border-white/[0.06] sm:border-b"><span className="text-gray-400">{label}</span><span className="text-gray-100 text-right font-medium">{value}</span></div>)}</div></div>
  </div>;
}

export default function StrategyAnalyzerPage() {
  const [section, setSection] = useState<SectionId>('dashboard');
  const [inputMode, setInputMode] = useState<'sample' | 'custom'>('sample');
  const [sampleId, setSampleId] = useState(STRATEGY_SAMPLES[0].id);
  const [sampleCount, setSampleCount] = useState('120');
  const [customCount, setCustomCount] = useState('6');
  const [customBalls, setCustomBalls] = useState<string[]>(Array(6).fill(''));
  const [pasteSequence, setPasteSequence] = useState('');
  const [inputError, setInputError] = useState('');
  const [run, setRun] = useState<RunResult | null>(null);
  const [selectedBall, setSelectedBall] = useState<number | null>(null);
  const [saved, setSaved] = useState<SavedAnalysis[]>(readSaved);
  const [savedSelection, setSavedSelection] = useState('');
  const [saveName, setSaveName] = useState('');
  const [loadedMessage, setLoadedMessage] = useState('');

  React.useEffect(() => { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); }, [saved]);
  const activeSample = STRATEGY_SAMPLES.find((item) => item.id === sampleId) || STRATEGY_SAMPLES[0];
  const detail = run && selectedBall !== null ? run.analysis.history[selectedBall] : null;

  const resizeCustom = (value: string) => {
    setCustomCount(value);
    const count = Number(value);
    if (Number.isInteger(count) && count >= 1 && count <= 1200) setCustomBalls((current) => Array.from({ length: count }, (_, index) => current[index] ?? ''));
  };
  const analyze = (values: number[], source: string) => {
    try {
      const analysis = analyzeStrategy(values);
      setRun({ outcomes: values, source, analysis });
      setSection('dashboard');
      setInputError('');
      setLoadedMessage('');
    } catch (error) { setInputError(error instanceof Error ? error.message : 'Sequence analyze nahi ho saka.'); }
  };
  const analyzeCurrent = () => {
    if (inputMode === 'sample') {
      const count = Number(sampleCount);
      if (!Number.isInteger(count) || count < 1 || count > 120) { setInputError('Sample ke liye 1 se 120 balls chuniye.'); return; }
      analyze(activeSample.outcomes.slice(0, count), `${activeSample.name} · first ${count} balls`);
      return;
    }
    const values = customBalls.map((value) => value.trim() === '' ? Number.NaN : Number(value));
    const count = Number(customCount);
    if (!Number.isInteger(count) || count < 1 || count > 1200 || count !== customBalls.length) { setInputError('Balls ki valid count 1 se 1200 ke beech honi chahiye.'); return; }
    const invalidIndex = values.findIndex((value) => !Number.isInteger(value) || value < 0 || value > 6);
    if (invalidIndex >= 0) { setInputError(`Ball ${invalidIndex + 1} mein 0 se 6 tak integer daalein.`); return; }
    if (values.length < 1) { setInputError('Kam se kam ek ball outcome daalein.'); return; }
    analyze(values, 'Custom sequence');
  };
  const addCustomBall = () => { setCustomBalls((current) => [...current, '']); setCustomCount(String(customBalls.length + 1)); };
  const removeCustomBall = () => { if (customBalls.length <= 1) return; setCustomBalls((current) => current.slice(0, -1)); setCustomCount(String(customBalls.length - 1)); };
  const clearCustom = () => { setCustomBalls((current) => current.map(() => '')); setPasteSequence(''); setInputError(''); };
  const applyPaste = () => {
    const tokens = pasteSequence.trim().split(/[\s,;]+/).filter(Boolean);
    const values = tokens.map(Number);
    if (!tokens.length || values.some((value) => !Number.isInteger(value) || value < 0 || value > 6)) { setInputError('Paste sequence mein sirf comma/space-separated 0 se 6 tak integers hone chahiye.'); return; }
    setCustomBalls(values.map(String));
    setCustomCount(String(values.length));
    setInputError('');
  };

  const saveCurrent = () => {
    if (!run) return;
    const item: SavedAnalysis = {
      id: `${Date.now()}`,
      name: saveName.trim() || `${run.source} · ${new Date().toLocaleDateString('en-IN')}`,
      savedAt: new Date().toISOString(), source: run.source, outcomes: run.outcomes,
    };
    setSaved((current) => [item, ...current]);
    setSavedSelection(item.id);
    setSaveName('');
    setLoadedMessage('Analysis browser mein save ho gaya.');
  };
  const loadSaved = () => {
    const item = saved.find((entry) => entry.id === savedSelection);
    if (!item) return;
    analyze(item.outcomes, item.source);
    setLoadedMessage(`Loaded: ${item.name} · ${dateTime(item.savedAt)}`);
  };
  const resetAnalysis = () => { setRun(null); setSelectedBall(null); setSection('input'); setLoadedMessage(''); };

  const exportCsv = () => {
    if (!run) return;
    const headings = ['Ball No', 'Outcome', 'Player A Status', 'Player A Bet', 'Player A Return', 'Player A Net', 'Player A Pending', 'Player A Cumulative Investment', 'Player A Cumulative Return', 'Player A Cumulative P/L', 'Player B Status', 'Player B Bet', 'Player B Return', 'Player B Net', 'Player B Pending', 'Player B Cumulative Investment', 'Player B Cumulative Return', 'Player B Cumulative P/L'];
    const rows = run.analysis.history.map((row) => [row.ballNo, row.outcome, row.playerA.status, row.playerA.bet, row.playerA.returned, row.playerA.net, row.playerA.pending, row.playerA.cumulativeInvestment, row.playerA.cumulativeReturn, row.playerA.cumulativeNet, row.playerB.status, row.playerB.bet, row.playerB.returned, row.playerB.net, row.playerB.pending, row.playerB.cumulativeInvestment, row.playerB.cumulativeReturn, row.playerB.cumulativeNet]);
    const a = run.analysis.playerA; const b = run.analysis.playerB;
    const summary = [
      ['Summary metric', 'Player A', 'Player B'],
      ['Balls analyzed', a.balls, b.balls], ['Wins', a.wins, b.wins], ['Losses', a.losses, b.losses], ['Recoveries', a.recoveries, b.recoveries],
      ['Winning percentage', a.winningPercentage, b.winningPercentage], ['Recovery success percentage', a.recoverySuccessPercentage, b.recoverySuccessPercentage],
      ['Normal win investment', a.normalInvestment, b.normalInvestment], ['Recovery investment', a.recoveryInvestment, b.recoveryInvestment],
      ['Loss investment', a.lossInvestment, b.lossInvestment], ['Total investment', a.totalInvestment, b.totalInvestment],
      ['Total lost amount', a.totalLostAmount, b.totalLostAmount], ['Normal win returns', a.normalWinReturns, b.normalWinReturns],
      ['Recovery returns', a.recoveryReturns, b.recoveryReturns], ['Total return', a.totalReturn, b.totalReturn], ['Net profit/loss', a.netProfitLoss, b.netProfitLoss],
      ['ROI percent', a.roi, b.roi], ['Pending recovery', a.pendingRecovery, b.pendingRecovery], ['Next required bet', a.nextRequiredBet, b.nextRequiredBet],
      [], headings,
    ];
    const csv = [...summary, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'betting-strategy-analysis.csv'; anchor.click(); URL.revokeObjectURL(url);
  };
  const exportPdf = () => {
    if (!run) return;
    const rows = run.analysis.history.map((row) => `<tr><td>${row.ballNo}</td><td>${row.outcome}</td><td>${row.playerA.status}</td><td>₹${row.playerA.bet.toFixed(2)}</td><td>₹${row.playerA.returned.toFixed(2)}</td><td>₹${row.playerA.net.toFixed(2)}</td><td>₹${row.playerA.cumulativeNet.toFixed(2)}</td><td>${row.playerB.status}</td><td>₹${row.playerB.bet.toFixed(2)}</td><td>₹${row.playerB.returned.toFixed(2)}</td><td>₹${row.playerB.net.toFixed(2)}</td><td>₹${row.playerB.cumulativeNet.toFixed(2)}</td></tr>`).join('');
    const report = [run.analysis.playerA, run.analysis.playerB].map((player) => `<section><h2>Player ${player.player} Report</h2><p>Target: ${player.targetDescription} · Odds: ${player.odds} · Normal bet ₹${player.normalBet.toFixed(2)}</p><p>Balls ${player.balls} · Wins ${player.wins} · Losses ${player.losses} · Recoveries ${player.recoveries} · Win rate ${player.winningPercentage.toFixed(2)}% · Recovery success ${player.recoverySuccessPercentage.toFixed(2)}%</p><p>Normal investment ₹${player.normalInvestment.toFixed(2)} · Recovery investment ₹${player.recoveryInvestment.toFixed(2)} · Loss investment ₹${player.lossInvestment.toFixed(2)} · Total investment ₹${player.totalInvestment.toFixed(2)}</p><p>Lost amount ₹${player.totalLostAmount.toFixed(2)} · Normal returns ₹${player.normalWinReturns.toFixed(2)} · Recovery returns ₹${player.recoveryReturns.toFixed(2)} · Total return ₹${player.totalReturn.toFixed(2)}</p><p>Net ₹${player.netProfitLoss.toFixed(2)} · ROI ${player.roi.toFixed(2)}% · Pending recovery ₹${player.pendingRecovery.toFixed(2)} · Next bet ₹${player.nextRequiredBet.toFixed(2)}</p></section>`).join('');
    const popup = window.open('', '_blank', 'width=1100,height=800');
    if (!popup) { setInputError('PDF print window block ho gaya. Browser pop-ups allow karke phir try karein.'); return; }
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Strategy Analysis Report</title><style>body{font:12px Arial,sans-serif;color:#172033;margin:24px}h1{font-size:22px}section{border:1px solid #ccd2dc;padding:12px;margin:12px 0}table{width:100%;border-collapse:collapse;font-size:9px}th,td{border:1px solid #d5dae2;padding:4px;text-align:right}th{background:#eef1f6}td:nth-child(3),td:nth-child(8){text-align:left}@media print{body{margin:12mm}}</style></head><body><h1>Betting Strategy Analyzer</h1><p>${run.source} · ${run.outcomes.length} balls · Generated ${new Date().toLocaleString('en-IN')}</p>${report}<h2>Ball-by-ball history</h2><table><thead><tr><th>Ball</th><th>Outcome</th><th>A Status</th><th>A Bet</th><th>A Return</th><th>A Net</th><th>A Cum P/L</th><th>B Status</th><th>B Bet</th><th>B Return</th><th>B Net</th><th>B Cum P/L</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  const cumulative = run?.analysis.history.map((row) => ({ ball: row.ballNo, 'Player A': row.playerA.cumulativeNet, 'Player B': row.playerB.cumulativeNet })) || [];
  const comparison = run ? [
    { metric: 'Net P/L', A: run.analysis.playerA.netProfitLoss, B: run.analysis.playerB.netProfitLoss },
    { metric: 'Investment', A: run.analysis.playerA.totalInvestment, B: run.analysis.playerB.totalInvestment },
    { metric: 'Return', A: run.analysis.playerA.totalReturn, B: run.analysis.playerB.totalReturn },
  ] : [];

  const renderDashboard = () => {
    if (!run) return <div className="card p-10 text-center"><BarChart3 size={38} className="mx-auto text-blue-400 mb-3" /><h2 className="text-xl font-semibold text-gray-100">Strategy analyze karne ke liye ready</h2><p className="text-sm text-gray-400 mt-2">Input Data par jaakar 20 sample scenarios mein se chuniyen ya apna ball sequence daalein.</p><button className="btn-primary mt-5" onClick={() => setSection('input')}><Play size={16} /> Input Data kholein</button></div>;
    const a = run.analysis.playerA; const b = run.analysis.playerB;
    const better = a.netProfitLoss === b.netProfitLoss ? (a.roi === b.roi ? 'Tie' : a.roi > b.roi ? 'Player A' : 'Player B') : a.netProfitLoss > b.netProfitLoss ? 'Player A' : 'Player B';
    return <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3"><div><h2 className="text-2xl font-bold text-gray-100">Analysis Dashboard</h2><p className="text-sm text-gray-400 mt-1">{run.source} · {run.outcomes.length} balls analyzed</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={saveCurrent}><Save size={15} /> Save</button><button className="btn-secondary" onClick={exportCsv}><Download size={15} /> CSV</button><button className="btn-secondary" onClick={exportPdf}><FileDown size={15} /> PDF</button><button className="btn-secondary" onClick={resetAnalysis}>Analyze another</button></div></div>
      {loadedMessage && <p className="text-xs text-emerald-400">{loadedMessage}</p>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3"><MetricCard label="Player A · Net P/L" value={money(a.netProfitLoss)} tone={a.netProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'} /><MetricCard label="Player B · Net P/L" value={money(b.netProfitLoss)} tone={b.netProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'} /><MetricCard label="Combined balls" value={String(run.outcomes.length)} /><MetricCard label="Financial leader" value={better} tone="text-blue-400" note="Net P/L, then ROI" /></div>
      <div className="grid xl:grid-cols-2 gap-4"><ChartCard title="Cumulative profit / loss after each ball"><ResponsiveContainer width="100%" height={280}><LineChart data={cumulative}><CartesianGrid strokeDasharray="3 3" stroke="#263148" /><XAxis dataKey="ball" stroke="#94a3b8" /><YAxis stroke="#94a3b8" tickFormatter={(value) => `₹${value}`} /><Tooltip formatter={(value) => money(Number(value))} labelFormatter={(label) => `Ball ${label}`} /><Legend /><Line type="monotone" dataKey="Player A" stroke="#60a5fa" dot={false} /><Line type="monotone" dataKey="Player B" stroke="#34d399" dot={false} /></LineChart></ResponsiveContainer></ChartCard><ChartCard title="Financial comparison"><ResponsiveContainer width="100%" height={280}><BarChart data={comparison}><CartesianGrid strokeDasharray="3 3" stroke="#263148" /><XAxis dataKey="metric" stroke="#94a3b8" /><YAxis stroke="#94a3b8" tickFormatter={(value) => `₹${value}`} /><Tooltip formatter={(value) => money(Number(value))} /><Legend /><Bar dataKey="A" name="Player A" fill="#60a5fa" radius={[4, 4, 0, 0]} /><Bar dataKey="B" name="Player B" fill="#34d399" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard></div>
      <div className="grid lg:grid-cols-2 gap-4"><QuickPlayer report={a} /><QuickPlayer report={b} /></div>
    </div>;
  };

  const renderInput = () => <div className="space-y-5"><div><h2 className="text-2xl font-bold text-gray-100">Input Data</h2><p className="text-sm text-gray-400 mt-1">Sample ke first balls ya apne custom outcomes analyze karein.</p></div>
    <div className="flex gap-2"><button className={inputMode === 'sample' ? 'btn-primary' : 'btn-secondary'} onClick={() => { setInputMode('sample'); setInputError(''); }}>Sample data</button><button className={inputMode === 'custom' ? 'btn-primary' : 'btn-secondary'} onClick={() => { setInputMode('custom'); setInputError(''); }}>Custom input</button></div>
    <div className="card p-5 sm:p-6 space-y-5">{inputMode === 'sample' ? <>
      <div className="grid md:grid-cols-[1fr_180px] gap-4"><div><label className="label" htmlFor="sample-select">120-ball sample scenario ({STRATEGY_SAMPLES.length} available)</label><select id="sample-select" className="input-field" value={sampleId} onChange={(event) => setSampleId(event.target.value)}>{STRATEGY_SAMPLES.map((sample) => <option key={sample.id} value={sample.id}>{sample.name}</option>)}</select><p className="text-xs text-gray-500 mt-2">{activeSample.description} · {activeSample.outcomes.length} ball outcomes</p></div><div><label className="label" htmlFor="sample-count">Initial balls to analyze</label><input id="sample-count" className="input-field" type="number" min="1" max="120" value={sampleCount} onChange={(event) => setSampleCount(event.target.value)} /></div></div>
      <div className="flex flex-wrap gap-1.5">{activeSample.outcomes.slice(0, Math.min(Number(sampleCount) || 0, 120)).map((outcome, index) => <span key={index} className="w-8 h-8 rounded bg-white/[0.05] flex items-center justify-center text-xs text-gray-300" title={`Ball ${index + 1}`}>{outcome}</span>)}</div>
    </> : <>
      <div className="max-w-xs"><label className="label" htmlFor="custom-count">How many balls do you want to analyze?</label><input id="custom-count" className="input-field" type="number" min="1" max="1200" value={customCount} onChange={(event) => resizeCustom(event.target.value)} /></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">{customBalls.map((value, index) => <div key={index}><label className="label text-xs" htmlFor={`custom-ball-${index}`}>Ball {index + 1}</label><input id={`custom-ball-${index}`} className="input-field" type="number" min="0" max="6" step="1" value={value} onChange={(event) => setCustomBalls((current) => current.map((item, i) => i === index ? event.target.value : item))} placeholder="0–6" /></div>)}</div>
      <div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={addCustomBall}><Play size={15} /> Add ball</button><button className="btn-secondary" onClick={removeCustomBall}>Remove ball</button><button className="btn-secondary" onClick={clearCustom}>Clear all</button></div>
      <div><label className="label" htmlFor="paste-sequence">Paste sequence (comma, space, or line separated)</label><div className="flex flex-col sm:flex-row gap-2"><textarea id="paste-sequence" className="input-field min-h-20" value={pasteSequence} onChange={(event) => setPasteSequence(event.target.value)} placeholder="1,0,6,0,1,1" /><button className="btn-secondary self-start" onClick={applyPaste}>Sequence apply karein</button></div></div>
    </>}
      {inputError && <p role="alert" className="text-sm text-red-400">{inputError}</p>}
      <button className="btn-primary" onClick={analyzeCurrent}><Play size={16} /> Analyze Strategy</button>
    </div>
    <div className="card p-5"><h3 className="section-title">Saved analyses</h3><p className="text-xs text-gray-500 mt-1">Browser LocalStorage mein save ki gayi reports yahan milengi.</p>{saved.length ? <div className="flex flex-col sm:flex-row gap-2 mt-4"><select className="input-field" value={savedSelection} onChange={(event) => setSavedSelection(event.target.value)}><option value="">Saved analysis chuniye</option>{saved.map((item) => <option key={item.id} value={item.id}>{item.name} · {dateTime(item.savedAt)}</option>)}</select><button className="btn-secondary flex-shrink-0" disabled={!savedSelection} onClick={loadSaved}><History size={15} /> Load analysis</button></div> : <p className="text-sm text-gray-500 mt-4">Abhi koi saved analysis nahi. Pehle data analyze karke Dashboard se Save karein.</p>}</div>
  </div>;

  const renderHistory = () => run ? <div className="space-y-4"><div className="flex flex-wrap justify-between items-center gap-3"><div><h2 className="text-2xl font-bold text-gray-100">Ball-by-Ball History</h2><p className="text-sm text-gray-400 mt-1">Row par click karke dono players ke details aur decision reason dekhein.</p></div><span className="badge-blue">{run.analysis.history.length} balls</span></div><div className="card overflow-hidden"><div className="table-responsive"><table className="min-w-[1320px] w-full text-xs text-right"><thead className="bg-white/[0.04] text-gray-400"><tr>{['Ball', 'Outcome', 'A Status', 'A Bet', 'A Return', 'A Net', 'A Cum. P/L', 'B Status', 'B Bet', 'B Return', 'B Net', 'B Cum. P/L'].map((label) => <th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-white/[0.05]">{run.analysis.history.map((row, index) => <tr key={row.ballNo} tabIndex={0} role="button" onClick={() => setSelectedBall(index)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedBall(index); }} className="text-gray-300 hover:bg-white/[0.04] cursor-pointer"><td className="px-3 py-2">{row.ballNo}</td><td className="px-3 py-2 font-bold">{row.outcome}</td><td className="px-3 py-2"><StatusBadge status={row.playerA.status} /></td><td className="px-3 py-2">{money(row.playerA.bet)}</td><td className="px-3 py-2">{money(row.playerA.returned)}</td><td className={`px-3 py-2 ${row.playerA.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{money(row.playerA.net)}</td><td className="px-3 py-2">{money(row.playerA.cumulativeNet)}</td><td className="px-3 py-2"><StatusBadge status={row.playerB.status} /></td><td className="px-3 py-2">{money(row.playerB.bet)}</td><td className="px-3 py-2">{money(row.playerB.returned)}</td><td className={`px-3 py-2 ${row.playerB.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{money(row.playerB.net)}</td><td className="px-3 py-2">{money(row.playerB.cumulativeNet)}</td></tr>)}</tbody></table></div></div></div> : <EmptyAnalysis onInput={() => setSection('input')} />;

  const renderComparison = () => run ? <div className="space-y-5"><div><h2 className="text-2xl font-bold text-gray-100">Player Comparison</h2><p className="text-sm text-gray-400 mt-1">Financial performance net P/L aur ROI se compare hoti hai; win count akela winner decide nahi karta.</p></div><div className="grid sm:grid-cols-2 gap-3"><QuickPlayer report={run.analysis.playerA} /><QuickPlayer report={run.analysis.playerB} /></div><ChartCard title="Net profit / loss, investment and return"><ResponsiveContainer width="100%" height={340}><BarChart data={comparison}><CartesianGrid strokeDasharray="3 3" stroke="#263148" /><XAxis dataKey="metric" stroke="#94a3b8" /><YAxis stroke="#94a3b8" tickFormatter={(value) => `₹${value}`} /><Tooltip formatter={(value) => money(Number(value))} /><Legend /><Bar dataKey="A" name="Player A" fill="#60a5fa" radius={[4, 4, 0, 0]} /><Bar dataKey="B" name="Player B" fill="#34d399" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard><ChartCard title="Cumulative P/L by ball"><ResponsiveContainer width="100%" height={360}><LineChart data={cumulative}><CartesianGrid strokeDasharray="3 3" stroke="#263148" /><XAxis dataKey="ball" stroke="#94a3b8" /><YAxis stroke="#94a3b8" tickFormatter={(value) => `₹${value}`} /><Tooltip formatter={(value) => money(Number(value))} labelFormatter={(label) => `Ball ${label}`} /><Legend /><Line type="monotone" dataKey="Player A" stroke="#60a5fa" dot={false} /><Line type="monotone" dataKey="Player B" stroke="#34d399" dot={false} /></LineChart></ResponsiveContainer></ChartCard></div> : <EmptyAnalysis onInput={() => setSection('input')} />;

  const renderSettings = () => <div className="space-y-5"><div><h2 className="text-2xl font-bold text-gray-100">Strategy Settings</h2><p className="text-sm text-gray-400 mt-1">Prompt ke rules ke mutabik fixed calculation assumptions.</p></div><div className="grid md:grid-cols-2 gap-4"><div className="card p-5"><h3 className="section-title">Player A</h3><SettingRow label="Target" value="0 run" /><SettingRow label="Opposite" value="1–6 runs" /><SettingRow label="Decimal odds" value="2.50" /><SettingRow label="Normal bet" value="₹10.00" /></div><div className="card p-5"><h3 className="section-title">Player B</h3><SettingRow label="Target" value="1–6 runs" /><SettingRow label="Opposite" value="0 run" /><SettingRow label="Decimal odds" value="1.30" /><SettingRow label="Normal bet" value="₹10.00" /></div></div><div className="card p-5"><h3 className="section-title">Data & accounting</h3><SettingRow label="Sample scenarios" value={`${STRATEGY_SAMPLES.length} scenarios × 120 balls`} /><SettingRow label="Storage" value="Saved analyses stay in this browser’s LocalStorage" /><SettingRow label="Recovery bet" value="Accumulated loss ÷ (decimal odds − 1) on every active recovery ball" /><SettingRow label="Profit / loss" value="Gross returns − all invested stakes" /></div></div>;

  const content: Record<SectionId, React.ReactNode> = {
    dashboard: renderDashboard(), input: renderInput(), history: renderHistory(),
    'player-a': run ? <PlayerReportView report={run.analysis.playerA} /> : <EmptyAnalysis onInput={() => setSection('input')} />,
    'player-b': run ? <PlayerReportView report={run.analysis.playerB} /> : <EmptyAnalysis onInput={() => setSection('input')} />,
    comparison: renderComparison(), settings: renderSettings(),
  };

  return <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-slide-up">
    <header><div className="flex items-center gap-2 text-blue-400 text-xs font-semibold tracking-wider mb-2"><BarChart3 size={15} /> ODDS PILOT <span className="text-gray-600">/</span> STRATEGY ANALYZER</div><h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Betting Strategy Analyzer</h1><p className="text-sm text-gray-400 mt-2 max-w-3xl">120-ball cricket outcome sequence par Player A aur Player B strategy ko independently analyze karein.</p></header>
    {run && <div className="card p-3 flex flex-col sm:flex-row gap-2 sm:items-center"><span className="text-xs text-gray-500 sm:mr-auto">Current: {run.source} · {run.outcomes.length} balls</span><input className="input-field sm:max-w-56" value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder="Saved report name (optional)" aria-label="Saved report name" /><select className="input-field sm:max-w-64" value={savedSelection} onChange={(event) => setSavedSelection(event.target.value)} aria-label="Saved analyses"><option value="">Load saved…</option>{saved.map((item) => <option key={item.id} value={item.id}>{item.name} · {dateTime(item.savedAt)}</option>)}</select><button className="btn-secondary" onClick={saveCurrent}><Save size={15} /> Save</button><button className="btn-secondary" disabled={!savedSelection} onClick={loadSaved}>Load</button></div>}
    <nav className="flex overflow-x-auto gap-1 border-b border-white/[0.08]" aria-label="Strategy analyzer sections">{SECTIONS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setSection(id)} className={`flex-shrink-0 flex items-center gap-2 px-3 py-3 text-xs sm:text-sm border-b-2 transition-colors ${section === id ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}><Icon size={15} />{label}</button>)}</nav>
    {content[section]}
    {inputError && section !== 'input' && <p role="alert" className="text-sm text-red-400">{inputError}</p>}
    <div className="card p-4 flex gap-3 border-amber-500/15 bg-amber-500/[0.04]"><AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" /><p className="text-xs text-gray-400 leading-relaxed"><span className="text-amber-300 font-medium">Calculator only:</span> Yeh strategy calculator hai, betting recommendation nahi. Results guarantee nahi hote. Recovery stake pending amount ko model karta hai; asal outcomes aur settlement alag ho sakte hain.</p></div>
    {detail && run && <BallDetails row={detail} index={selectedBall!} total={run.analysis.history.length} onClose={() => setSelectedBall(null)} onNavigate={setSelectedBall} />}
  </div>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) { return <div className="card p-4 sm:p-5"><h3 className="text-sm font-semibold text-gray-200 mb-4">{title}</h3>{children}</div>; }
function QuickPlayer({ report }: { report: PlayerReport }) { return <div className="card p-5"><div className="flex justify-between gap-3"><div><h3 className="text-lg font-semibold text-gray-100">Player {report.player}</h3><p className="text-xs text-gray-500">Target {report.targetDescription} · Odds {report.odds}</p></div><span className={`text-lg font-bold ${report.netProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{money(report.netProfitLoss)}</span></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-sm"><MiniStat label="Wins" value={report.wins} /><MiniStat label="Losses" value={report.losses} /><MiniStat label="Recoveries" value={report.recoveries} /><MiniStat label="Investment" value={money(report.totalInvestment)} /><MiniStat label="Return" value={money(report.totalReturn)} /><MiniStat label="ROI" value={percent(report.roi)} /><MiniStat label="Pending" value={money(report.pendingRecovery)} /></div></div>; }
function MiniStat({ label, value }: { label: string; value: string | number }) { return <div><p className="text-[11px] text-gray-500">{label}</p><p className="text-gray-200 font-medium mt-0.5">{value}</p></div>; }
function SettingRow({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3 border-b border-white/[0.05] py-3 text-sm last:border-0"><span className="text-gray-400">{label}</span><span className="text-gray-200 text-right">{value}</span></div>; }
function EmptyAnalysis({ onInput }: { onInput: () => void }) { return <div className="card p-10 text-center"><ClipboardList size={36} className="mx-auto text-gray-500 mb-3" /><h2 className="text-lg font-semibold text-gray-200">Pehle sequence analyze karein</h2><p className="text-sm text-gray-500 mt-2">Input Data se sample ya custom balls select karke analysis chalayein.</p><button className="btn-primary mt-4" onClick={onInput}>Input Data kholein</button></div>; }

function BallDetails({ row, index, total, onClose, onNavigate }: { row: BallHistoryRow; index: number; total: number; onClose: () => void; onNavigate: (index: number) => void }) {
  const player = (id: 'A' | 'B') => id === 'A' ? row.playerA : row.playerB;
  const panel = (id: 'A' | 'B') => {
    const result = player(id);
    return <div className="rounded-lg bg-white/[0.03] p-4 space-y-2"><h3 className="font-semibold text-gray-100">Player {id}</h3><DetailRow label="Previous recovery state" value={result.recoveringBefore ? `Active · pending ${money(result.previousPending)}` : 'Inactive'} /><DetailRow label="Current status" value={<StatusBadge status={result.status} />} /><DetailRow label="Bet amount" value={money(result.bet)} /><DetailRow label="Return" value={money(result.returned)} /><DetailRow label="Net for ball" value={money(result.net)} /><DetailRow label="Cumulative investment" value={money(result.cumulativeInvestment)} /><DetailRow label="Cumulative return" value={money(result.cumulativeReturn)} /><DetailRow label="Cumulative P/L" value={money(result.cumulativeNet)} /><DetailRow label="Pending recovery now" value={money(result.pending)} /><p className="text-xs text-gray-400 pt-2">{result.reason}</p></div>;
  };
  return <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-labelledby="ball-detail-title" className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 sm:p-6"><div className="flex justify-between items-start"><div><p className="text-xs text-blue-400 uppercase tracking-wider">Ball detail</p><h2 id="ball-detail-title" className="text-xl font-bold text-gray-100 mt-1">Ball {row.ballNo} · Outcome {row.outcome}</h2></div><button className="btn-secondary" onClick={onClose}>Close</button></div><div className="grid md:grid-cols-2 gap-3 mt-5">{panel('A')}{panel('B')}</div><div className="flex justify-between mt-5"><button className="btn-secondary" disabled={index === 0} onClick={() => onNavigate(index - 1)}><ChevronLeft size={15} /> Previous ball</button><button className="btn-secondary" disabled={index === total - 1} onClick={() => onNavigate(index + 1)}>Next ball <ChevronRight size={15} /></button></div></div></div>;
}
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) { return <div className="flex justify-between gap-2 text-xs"><span className="text-gray-500">{label}</span><span className="text-gray-200 text-right">{value}</span></div>; }
