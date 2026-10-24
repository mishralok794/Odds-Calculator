import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Shield,
  ListChecks,
  TrendingUp,
  ArrowLeftRight,
  Percent,
  BookMarked,
  Settings,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/hedge', label: 'Hedge Calculator', icon: Shield, highlight: true },
  { path: '/tracker', label: 'Multi-Bet Tracker', icon: ListChecks },
  { path: '/arbitrage', label: 'Arbitrage Analyzer', icon: TrendingUp },
  { path: '/odds', label: 'Odds Converter', icon: ArrowLeftRight },
  { path: '/probability', label: 'Probability Calculator', icon: Percent },
  { path: '/saved', label: 'Saved Calculations', icon: BookMarked },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/[0.06] bg-gray-900/40 backdrop-blur-sm">
        {/* Logo */}
        <div className="p-5 border-b border-white/[0.06]">
          <button onClick={() => handleNav('/')} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-sm">OP</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-100 group-hover:text-white transition-colors">
                OddsPilot
              </h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">
                Odds & Hedge Analyzer
              </p>
            </div>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                  ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                      : item.highlight
                      ? 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
                      : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                  }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 flex-shrink-0 ${
                    isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-400'
                  }`}
                  size={18}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded">
                    MAIN
                  </span>
                )}
                {isActive && <ChevronRight size={14} className="text-blue-400/60" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="card p-3 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 border-blue-500/10">
            <p className="text-xs text-gray-400 leading-relaxed">
              ⚠️ Calculator tool only. Not a betting recommendation engine. Actual results may differ.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => handleNav('/')} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">OP</span>
            </div>
            <span className="text-sm font-bold text-gray-100">OddsPilot</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn-icon"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute top-14 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-b border-white/[0.06] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="py-2 px-3 space-y-0.5 max-h-[70vh] overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all
                      ${
                        isActive
                          ? 'bg-blue-600/10 text-blue-400'
                          : 'text-gray-300 hover:bg-white/[0.06]'
                      }`}
                  >
                    <Icon size={18} className={isActive ? 'text-blue-400' : 'text-gray-500'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:overflow-y-auto">
        <div className="pt-14 lg:pt-0 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
