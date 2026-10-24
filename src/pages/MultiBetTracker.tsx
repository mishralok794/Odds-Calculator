import React, { useState, useMemo } from 'react';
import {
  ListChecks,
  Plus,
  Trash2,
  Edit3,
  Download,
  Upload,
  Search,
  Shield,
  TrendingUp,
  ArrowLeftRight,
  Percent,
  Filter,
  Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, exportCalculationsJSON, exportCalculationsCSV, importCalculations, saveCalculations } from '../utils/storage';
import { ConfirmDialog, EmptyState, SelectField } from '../components/ui';
import type { SavedCalculation, Sport } from '../types';
import { SPORTS } from '../types';

export default function MultiBetTrackerPage() {
  const { calculations, deleteCalculation, refreshCalculations, currencySymbol } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const filtered = useMemo(() => {
    return calculations.filter((c) => {
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (sportFilter !== 'all' && c.sport !== sportFilter) return false;
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      return true;
    });
  }, [calculations, searchTerm, sportFilter, typeFilter]);

  const stats = useMemo(() => {
    const totalStaked = calculations.reduce((sum, c) => {
      const data = c.data as Record<string, unknown>;
      const result = data?.result as Record<string, number> | undefined;
      return sum + (result?.totalStake || 0);
    }, 0);
    const totalEqualized = calculations
      .filter((c) => c.type === 'hedge')
      .reduce((sum, c) => {
        const data = c.data as Record<string, unknown>;
        const result = data?.result as Record<string, number> | undefined;
        return sum + (result?.equalizedResult || 0);
      }, 0);
    return { totalStaked, totalEqualized };
  }, [calculations]);

  const handleExportJSON = () => {
    const blob = new Blob([exportCalculationsJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oddspilot-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const blob = new Blob([exportCalculationsCSV()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oddspilot-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const imported = importCalculations(importText);
    if (imported.length > 0) {
      const existing = calculations;
      saveCalculations([...imported, ...existing]);
      refreshCalculations();
      setShowImport(false);
      setImportText('');
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteCalculation(deleteId);
      setDeleteId(null);
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'hedge': return <Shield size={14} />;
      case 'arbitrage': return <TrendingUp size={14} />;
      case 'odds': return <ArrowLeftRight size={14} />;
      case 'probability': return <Percent size={14} />;
      default: return <ListChecks size={14} />;
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Multi-Bet Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track, manage, and export your saved calculations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)} className="btn-ghost text-xs">
            <Upload size={14} /> Import
          </button>
          <button onClick={handleExportJSON} className="btn-secondary text-xs" disabled={calculations.length === 0}>
            <Download size={14} /> JSON
          </button>
          <button onClick={handleExportCSV} className="btn-secondary text-xs" disabled={calculations.length === 0}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <span className="text-xs text-gray-500">Saved Calculations</span>
          <p className="text-lg font-bold font-mono text-blue-400 mt-1">{calculations.length}</p>
        </div>
        <div className="card p-4">
          <span className="text-xs text-gray-500">Total Staked (Tracked)</span>
          <p className="text-lg font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(stats.totalStaked, currencySymbol)}
          </p>
        </div>
        <div className="card p-4">
          <span className="text-xs text-gray-500">Total Modeled Result</span>
          <p className={`text-lg font-bold font-mono mt-1 ${stats.totalEqualized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(stats.totalEqualized, currencySymbol)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9"
              placeholder="Search by name..."
            />
          </div>
          <SelectField
            label=""
            value={sportFilter}
            options={[
              { value: 'all', label: 'All Sports' },
              ...SPORTS.map((s) => ({ value: s.value, label: s.label })),
            ]}
            onChange={setSportFilter}
            id="tracker-sport-filter"
          />
          <SelectField
            label=""
            value={typeFilter}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'hedge', label: 'Hedge' },
              { value: 'arbitrage', label: 'Arbitrage' },
              { value: 'odds', label: 'Odds' },
              { value: 'probability', label: 'Probability' },
            ]}
            onChange={setTypeFilter}
            id="tracker-type-filter"
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={24} />}
          title={calculations.length === 0 ? 'No calculations saved yet' : 'No matching calculations'}
          description={
            calculations.length === 0
              ? 'Save a calculation from the Hedge Calculator, Odds Converter, or other tools to see it here.'
              : 'Try adjusting your search or filter criteria.'
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((calc) => (
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
                    {calc.notes && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[120px]">{calc.notes}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className={`text-xs font-medium px-2 py-0.5 rounded mr-2 ${typeColor(calc.type)}`}>
                  {calc.type}
                </span>
                <button
                  onClick={() => setDeleteId(calc.id)}
                  className="btn-icon text-red-400/60 hover:text-red-400"
                  aria-label="Delete calculation"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Data notice */}
      <div className="card p-3 bg-blue-500/5 border-blue-500/10">
        <p className="text-xs text-gray-500">
          💾 Data is stored in your browser's local storage. It may be lost if browser data is cleared.
          Use the export buttons above to back up your calculations.
        </p>
      </div>

      {/* Import dialog */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card p-6 max-w-lg mx-4 w-full animate-slide-up">
            <h3 className="text-lg font-semibold text-gray-100 mb-3">Import Calculations</h3>
            <p className="text-sm text-gray-400 mb-3">Paste exported JSON data below:</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="input-field h-40 font-mono text-xs resize-none"
              placeholder='[{"id": "...", "name": "...", ...}]'
            />
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => { setShowImport(false); setImportText(''); }} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleImport} className="btn-primary" disabled={!importText.trim()}>
                <Upload size={16} /> Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Calculation"
        message="This will permanently delete this saved calculation. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
