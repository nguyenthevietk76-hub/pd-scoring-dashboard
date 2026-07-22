import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AnalysisProvider } from './context/AnalysisContext';

// Lazy load pages to split the bundle size and speed up page load
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Alerts = lazy(() => import('./pages/Alerts'));
const MarketOverview = lazy(() => import('./pages/MarketOverview'));
const SearchCompany = lazy(() => import('./pages/SearchCompany'));
const Trends = lazy(() => import('./pages/Trends'));
const AltmanZ = lazy(() => import('./pages/AltmanZ'));
const Rankings = lazy(() => import('./pages/Rankings'));
const CreditReport = lazy(() => import('./pages/CreditReport'));
const Export = lazy(() => import('./pages/Export'));
const CompareFinancials = lazy(() => import('./pages/CompareFinancials'));
const CustomChart = lazy(() => import('./pages/CustomChart'));
const NewsAnalysis = lazy(() => import('./pages/NewsAnalysis'));
const SqlExplorer = lazy(() => import('./pages/SqlExplorer'));
const FinBotPage = lazy(() => import('./pages/FinBotPage'));

const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '4px solid rgba(0, 229, 255, 0.1)',
      borderTop: '4px solid var(--teal-500)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
  </div>
);

function App() {
  return (
    <AnalysisProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/market-overview" element={<MarketOverview />} />
              <Route path="/search-company" element={<SearchCompany />} />
              <Route path="/pd-scoring" element={<Dashboard />} />
              <Route path="/trends" element={<Trends />} />
              <Route path="/altman-z" element={<AltmanZ />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/credit-report" element={<CreditReport />} />
              <Route path="/export" element={<Export />} />
              <Route path="/compare" element={<CompareFinancials />} />
              <Route path="/custom-chart" element={<CustomChart />} />
              <Route path="/news" element={<NewsAnalysis />} />
              <Route path="/sql" element={<SqlExplorer />} />
              <Route path="/chatbot" element={<FinBotPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AnalysisProvider>
  );
}

export default App;
