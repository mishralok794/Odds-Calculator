import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, Shield, TrendingUp, ArrowLeftRight, Percent, Trash2, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmptyState, ConfirmDialog } from '../components/ui';

export default function SavedCalculationsPage() {
  const navigate = useNavigate();
  const { calculations, deleteCalculation } = useApp();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const typeIcon = (type: string) => {
    switch (type) {
      case 'hedge': return <Shield size={14} />;
      case 'arbitrage': return <TrendingUp size={14} />;
      case 'odds': return <ArrowLeftRight size={14} />;
      case 'probability': return <Percent size={14} />;
      default: return <BookMarked size={14} />;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'hedge': return 'bg-blue-500/10 text-blue-400';
      case 'arbitrage': return 'bg-emerald-500/10 text-emerald-400';
      case 'odds': return 'bg-purple-500/10 text-purple-400';
      case 'probability': return 'bg-orange-500/10 text-orange-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Saved Calculations</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage your saved calculations. For advanced tracking, use the{' '}
            <button onClick={() => navigate('/tracker')} className="text-blue-400 hover:underline">
              Multi-Bet Tracker
            </button>.
          </p>
        </div>
      </div>

      {calculations.length === 0 ? (
        <EmptyState
          icon={<BookMarked size={24} />}
          title="No saved calculations"
          description="Save a calculation from any tool to see it here."
          action={
            <button onClick={() => navigate('/hedge')} className="btn-primary">
              <Shield size={16} /> Open Hedge Calculator
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {calculations.map((calc) => (
            <div
              key={calc.id}
              className="card card-hover p-4 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColor(calc.type)}`}>
                  {typeIcon(calc.type)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{calc.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <Clock size={10} />
                    <span>{new Date(calc.createdAt).toLocaleString()}</span>
                    <span>·</span>
                    <span>{calc.sport}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDeleteId(calc.id)}
                className="btn-icon text-red-400/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Calculation"
        message="This will permanently delete this saved calculation."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteId) deleteCalculation(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
