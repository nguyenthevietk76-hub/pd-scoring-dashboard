import { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import InputForm from '../components/InputForm';
import ScoreGauge from '../components/ScoreGauge';
import FeatureContributionChart from '../components/FeatureContributionChart';
import TrendAlert from '../components/TrendAlert';
import FinancialHealthRadar from '../components/FinancialHealthRadar';
import { API_BASE_URL } from '../config';
import { AnalysisContext } from '../context/AnalysisContext';

const Dashboard = () => {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const contextObj = useContext(AnalysisContext);
  const updateAnalysisContext = contextObj?.updateAnalysisContext;
  const location = useLocation();
  const resultRef = useRef(null);

  const generateRadarData = (pdScore) => {
    const safePd = typeof pdScore === 'number' && !isNaN(pdScore) ? pdScore : 0;
    const baseHealth = 100 - safePd;
    return [
      { subject: 'Thanh khoản', A: Math.max(10, Math.min(100, baseHealth + (Math.random() * 20 - 10))) },
      { subject: 'Sinh lời', A: Math.max(10, Math.min(100, baseHealth + (Math.random() * 30 - 15))) },
      { subject: 'Đòn bẩy', A: Math.max(10, Math.min(100, baseHealth + (Math.random() * 20 - 10))) },
      { subject: 'Tăng trưởng', A: Math.max(10, Math.min(100, baseHealth + (Math.random() * 40 - 20))) },
      { subject: 'Hiệu quả HĐ', A: Math.max(10, Math.min(100, baseHealth + (Math.random() * 20 - 10))) },
    ].map(item => ({...item, A: Math.round(item.A)}));
  };

  const handlePredict = async (formData, demoCompany) => {
    setIsLoading(true);
    setResult(null);

    if (demoCompany) {
      setTimeout(() => {
        const pdVal = typeof demoCompany.current_pd === 'number' ? demoCompany.current_pd : 0;
        const newResult = {
          isDemo: true,
          companyName: demoCompany.name || 'Doanh nghiệp',
          sector: demoCompany.sector || 'Chưa rõ',
          pd_score: pdVal,
          risk_level: demoCompany.risk_level || 'Thấp',
          top_factors: Array.isArray(demoCompany.top_factors) ? demoCompany.top_factors : [],
          pd_scores_4q: Array.isArray(demoCompany.pd_scores_4q) ? demoCompany.pd_scores_4q : [0,0,0,0],
          radar_data: generateRadarData(pdVal)
        };
        setResult(newResult);
        if (typeof updateAnalysisContext === 'function') updateAnalysisContext(newResult, null);
        setIsLoading(false);
      }, 500);
    } else if (formData) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/predict/simplified`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: formData.name || 'Công ty Chưa rõ tên',
            tax_code: formData.taxCode || null,
            total_assets: formData.total_assets ? parseFloat(formData.total_assets) : 0.0,
            revenue: formData.revenue ? parseFloat(formData.revenue) : 0.0,
            current_liabilities: formData.current_liabilities ? parseFloat(formData.current_liabilities) : 0.0,
            long_term_debt: formData.long_term_debt ? parseFloat(formData.long_term_debt) : 0.0,
            operating_cash_flow: formData.operating_cash_flow ? parseFloat(formData.operating_cash_flow) : 0.0,
            model_name: 'logreg'
          })
        });

        if (!response.ok) {
          throw new Error('Yêu cầu dự báo từ Backend thất bại!');
        }

        const res = await response.json();
        const scorePct = typeof res.pd_score_pct === 'number' ? res.pd_score_pct : 0;
        
        const mock4Q = [
          Math.max(0, scorePct - 10),
          Math.max(0, scorePct - 5),
          scorePct,
          scorePct
        ];

        const newResult = {
          isDemo: false,
          companyName: formData.name || 'Công ty Chưa rõ tên',
          sector: null,
          pd_score: scorePct,
          risk_level: res.risk_level_vi || 'Thấp',
          top_factors: Array.isArray(res.top_factors) ? res.top_factors : [],
          pd_scores_4q: mock4Q,
          radar_data: generateRadarData(scorePct)
        };
        setResult(newResult);
        if (typeof updateAnalysisContext === 'function') updateAnalysisContext(newResult, formData);
      } catch (e) {
        console.error(e);
        alert('Lỗi kết nối Backend: ' + e.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  const handlePredictByTicker = async (ticker) => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/predict/ticker/${ticker}`);
      if (!response.ok) throw new Error('Không thể lấy kết quả phân tích cho mã ' + ticker);
      const res = await response.json();
      const scorePct = typeof res.pd_score_pct === 'number' ? res.pd_score_pct : 0;
      
      const mock4Q = [
        Math.max(0, scorePct - 10),
        Math.max(0, scorePct - 5),
        scorePct,
        scorePct
      ];

      const newResult = {
        isDemo: false,
        companyName: res.company_name || ticker,
        sector: null,
        pd_score: scorePct,
        risk_level: res.risk_level_vi || 'Thấp',
        top_factors: Array.isArray(res.top_factors) ? res.top_factors : [],
        pd_scores_4q: mock4Q,
        radar_data: generateRadarData(scorePct)
      };
      setResult(newResult);
      if (typeof updateAnalysisContext === 'function') updateAnalysisContext(newResult, null);
    } catch (e) {
      console.error(e);
      alert('Lỗi kết nối Backend: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (location.state) {
      if (location.state.selectedTicker) {
        handlePredictByTicker(location.state.selectedTicker);
      } else if (location.state.company) {
        handlePredict(null, location.state.company);
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => {
        if (typeof resultRef.current?.scrollIntoView === 'function') {
          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [result]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--ink-900)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
        Phân tích rủi ro tín dụng doanh nghiệp
      </h1>
      <p style={{ color: 'var(--ink-500)', marginBottom: '2.5rem', fontSize: '1.125rem' }}>
        Nhập số liệu tài chính trực tiếp hoặc chọn một trong các doanh nghiệp mẫu để đánh giá Probability of Distress (PD).
      </p>

      <InputForm onSubmit={handlePredict} isLoading={isLoading} />

      {result && (
        <div ref={resultRef} style={{ marginTop: '4rem' }} className="reveal active">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '1rem'
          }}>
            <h2 style={{
              fontSize: '1.8rem', 
              fontWeight: 800, 
              color: 'var(--ink-900)',
              letterSpacing: '-0.03em'
            }}>
              Báo cáo phân tích: <span style={{ background: 'var(--gradient-aura)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{result.companyName}</span>
            </h2>
            {result.isDemo && (
              <span style={{ fontSize: '0.8rem', backgroundColor: 'rgba(0, 229, 255, 0.08)', color: 'var(--teal-500)', border: '1px solid rgba(0, 229, 255, 0.15)', padding: '0.4rem 1rem', borderRadius: '999px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Demo Data
              </span>
            )}
          </div>
          
          <div className="charts-container stagger-enter" style={{ marginBottom: '2rem' }}>
            <div style={{ minWidth: 0 }}>
              <ScoreGauge score={result.pd_score} riskLevel={result.risk_level} />
            </div>
            <div style={{ minWidth: 0 }}>
              <TrendAlert pdScores4Q={result.pd_scores_4q} />
            </div>
          </div>
          
          <div className="charts-container stagger-enter" style={{ marginBottom: '2rem' }}>
            <div style={{ minWidth: 0 }}>
              <FeatureContributionChart topFactors={result.top_factors} />
            </div>
            <div style={{ minWidth: 0 }}>
              <FinancialHealthRadar metrics={result.radar_data} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
