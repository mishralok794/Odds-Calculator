import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import DashboardPage from './pages/Dashboard';
import HedgeCalculatorPage from './pages/HedgeCalculator';
import OddsConverterPage from './pages/OddsConverter';
import ProbabilityCalculatorPage from './pages/ProbabilityCalculator';
import ArbitrageAnalyzerPage from './pages/ArbitrageAnalyzer';
import MultiBetTrackerPage from './pages/MultiBetTracker';
import SavedCalculationsPage from './pages/SavedCalculations';
import SettingsPage from './pages/Settings';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/hedge" element={<HedgeCalculatorPage />} />
            <Route path="/odds" element={<OddsConverterPage />} />
            <Route path="/probability" element={<ProbabilityCalculatorPage />} />
            <Route path="/arbitrage" element={<ArbitrageAnalyzerPage />} />
            <Route path="/tracker" element={<MultiBetTrackerPage />} />
            <Route path="/saved" element={<SavedCalculationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
