import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Alerts from './pages/Alerts';
import MarketOverview from './pages/MarketOverview';
import SearchCompany from './pages/SearchCompany';
import Trends from './pages/Trends';
import AltmanZ from './pages/AltmanZ';
import Rankings from './pages/Rankings';
import CreditReport from './pages/CreditReport';
import Export from './pages/Export';
import CompareFinancials from './pages/CompareFinancials';
import CustomChart from './pages/CustomChart';
import NewsAnalysis from './pages/NewsAnalysis';
import SqlExplorer from './pages/SqlExplorer';
import { AnalysisProvider } from './context/AnalysisContext';
import FinBotPage from './pages/FinBotPage';

function App() {
  return (
    <AnalysisProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Navigate to="/market-overview" replace />} />
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
      </BrowserRouter>
    </AnalysisProvider>
  );
}

export default App;

