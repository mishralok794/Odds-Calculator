import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ArrowLeftRight,
  TrendingUp,
  Percent,
  BookMarked,
  Calculator,
  Clock,
  DollarSign,
  Activity,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/storage';
import { EmptyState } from '../components/ui';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { calculations, currencySymbol } = useApp();

  const stats = useMemo(() => {
    const hedgeCalcs = calculations.filter((c) => c.type === 'hedge');
    const totalCalcs = calculations.length;
    const totalStaked = hedgeCalcs.reduce((sum, c) => {
      const data = c.data as Record<string, unknown>;
      const result = data?.result as Record<string, number> | undefined;
      return sum + (result?.totalStake || 0);
    }, 0);
    const avgResult = hedgeCalcs.length > 0
      ? hedgeCalcs.reduce((sum, c) => {
          const data = c.data as Record<string, unknown>;
          const result = data?.result as Record<string, number> | undefined;
          return sum + (result?.equalizedResult || 0);
        }, 0) / hedgeCalcs.length
      : 0;

    return { totalCalcs, hedgeCalcs: hedgeCalcs.length, totalStaked, avgResult };
  }, [calculations]);

  const recentCalcs = calculations.slice(0, 5);

  const quickActions = [
    {
      icon: Shield,
      label: 'Hedge Calculator',
      description: 'Calculate optimal hedges',
      path: '/hedge',
      gradient: 'from-blue-600 to-indigo-600',
      shadow: 'shadow-blue-500/20',
      main: true,
    },
    {
      icon: ArrowLeftRight,
      label: 'Odds Converter',
      description: 'Convert between formats',
      path: '/odds',
      gradient: 'from-purple-600 to-pink-600',
      shadow: 'shadow-purple-500/20',
    },
    {
      icon: TrendingUp,
      label: 'Arbitrage Analyzer',
      description: 'Find arbitrage opportunities',
      path: '/arbitrage',
      gradient: 'from-emerald-600 to-teal-600',
      shadow: 'shadow-emerald-500/20',
    },
    {
      icon: Percent,
      label: 'Probability Calculator',
      description: 'Calculate expected value',
      path: '/probability',
      gradient: 'from-orange-600 to-red-600',
      shadow: 'shadow-orange-500/20',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your sports odds analysis toolkit
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={`card card-hover p-4 text-left group ${
                action.main ? 'sm:col-span-2 lg:col-span-1' : ''
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} ${action.shadow} shadow-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}
              >
                <Icon size={20} className="text-white" />
              </div>
              <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
                {action.label}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
              {action.main && (
                <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded">
                  MAIN FEATURE
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Calculator,
            label: 'Total Calculations',
            value: stats.totalCalcs.toString(),
            color: 'text-blue-400',
          },
          {
            icon: Shield,
            label: 'Hedge Calculations',
            value: stats.hedgeCalcs.toString(),
            color: 'text-indigo-400',
          },
          {
            icon: DollarSign,
            label: 'Total Staked (Tracked)',
            value: formatCurrency(stats.totalStaked, currencySymbol),
            color: 'text-emerald-400',
          },
          {
            icon: Activity,
            label: 'Avg. Equalized Result',
            value: stats.hedgeCalcs > 0 ? formatCurrency(stats.avgResult, currencySymbol) : '—',
            color: stats.avgResult >= 0 ? 'text-emerald-400' : 'text-red-400',
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className="text-gray-500" />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-500" />
            <h2 className="section-title">Recent Calculations</h2>
          </div>
          {calculations.length > 0 && (
            <button onClick={() => navigate('/saved')} className="btn-ghost text-xs text-blue-400">
              View All <BookMarked size={12} />
            </button>
          )}
        </div>

        {recentCalcs.length === 0 ? (
          <EmptyState
            icon={<Calculator size={24} />}
            title="No calculations yet"
            description="Start by creating a hedge calculation or converting some odds."
            action={
              <button onClick={() => navigate('/hedge')} className="btn-primary">
                <Shield size={16} /> Open Hedge Calculator
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {recentCalcs.map((calc) => (
              <div
                key={calc.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors cursor-pointer group"
                onClick={() => {
                  if (calc.type === 'hedge') navigate('/hedge');
                  else if (calc.type === 'arbitrage') navigate('/arbitrage');
                  else if (calc.type === 'odds') navigate('/odds');
                  else if (calc.type === 'probability') navigate('/probability');
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      calc.type === 'hedge'
                        ? 'bg-blue-500/10 text-blue-400'
                        : calc.type === 'arbitrage'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-purple-500/10 text-purple-400'
                    }`}
                  >
                    {calc.type === 'hedge' && <Shield size={14} />}
                    {calc.type === 'arbitrage' && <TrendingUp size={14} />}
                    {calc.type === 'odds' && <ArrowLeftRight size={14} />}
                    {calc.type === 'probability' && <Percent size={14} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                      {calc.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {calc.sport} · {new Date(calc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    calc.type === 'hedge'
                      ? 'bg-blue-500/10 text-blue-400'
                      : calc.type === 'arbitrage'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-purple-500/10 text-purple-400'
                  }`}
                >
                  {calc.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="card p-4 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 border-blue-500/10">
        <p className="text-xs text-gray-400 leading-relaxed">
          📊 All statistics are calculated from your saved data. This application is a calculator tool — it does not place bets,
          connect to betting accounts, or guarantee outcomes. Local browser storage may be lost if browser data is cleared.
        </p>
      </div>
    </div>
  );
}
