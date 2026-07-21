import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import demoData from '../demoData.json';
import { API_BASE_URL } from '../config';


const Rankings = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/companies`)
      .then(res => res.json())
      .then(data => {
        setCompanies(data.companies || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.warn('FastAPI backend not running, falling back to static demoData:', err);
        setCompanies(demoData.companies || []);
        setIsLoading(false);
      });
  }, []);

  // Sort by PD Score (ascending = best health first)
  const rankedCompanies = [...companies]
    .sort((a, b) => a.current_pd - b.current_pd);

  const getRiskBadge = (level) => {
    switch(level) {
      case 'Thấp': 
        return <span className="badge-low" style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}> Thấp</span>;
      case 'Trung bình': 
        return <span className="badge-medium" style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}> Trung bình</span>;
      case 'Cao': 
        return <span className="badge-high" style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}> Cao</span>;
      default: return null;
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return <span style={{ color: '#d97706', fontSize: '1.2rem', fontWeight: 900 }}>🥇 1</span>;
    if (rank === 2) return <span style={{ color: '#4b5563', fontSize: '1.2rem', fontWeight: 900 }}>🥈 2</span>;
    if (rank === 3) return <span style={{ color: '#b45309', fontSize: '1.2rem', fontWeight: 900 }}>🥉 3</span>;
    return <span style={{ color: 'var(--ink-500)', fontSize: '0.9rem', fontWeight: 700 }}>#{rank}</span>;
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--ink-900)', margin: 0, letterSpacing: '-0.03em' }}>
          Bảng Xếp Hạng Sức Khỏe Tài Chính
        </h1>
      </div>
      <p style={{ color: 'var(--ink-500)', marginBottom: '2.5rem', fontSize: '1.125rem' }}>
        Danh sách doanh nghiệp được xếp hạng theo Xác suất Vỡ nợ (PD Score) giảm dần. Doanh nghiệp xếp thứ hạng cao tương ứng với sức khỏe tài chính tốt và rủi ro tín dụng thấp.
      </p>

      {/* Leaderboard list */}
      <div className="card card-glow" style={{ padding: '24px 16px', borderRadius: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--ink-500)', fontSize: '0.825rem', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px', width: '80px', textAlign: 'center' }}>Hạng</th>
                <th style={{ padding: '12px 16px', width: '100px' }}>Ticker</th>
                <th style={{ padding: '12px 16px' }}>Tên Doanh Nghiệp</th>
                <th style={{ padding: '12px 16px' }}>Ngành</th>
                <th style={{ padding: '12px 16px', width: '140px', textAlign: 'right' }}>PD Score</th>
                <th style={{ padding: '12px 16px', width: '140px', textAlign: 'center' }}>Mức Độ Rủi Ro</th>
              </tr>
            </thead>
            <tbody>
              {rankedCompanies.map((company, index) => (
                <tr 
                  key={index}
                  onClick={() => navigate('/pd-scoring', { state: { selectedTicker: company.ticker } })}
                  style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  className="table-row-hover"
                >
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    {getRankBadge(index + 1)}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 800, color: 'var(--ink-900)' }}>
                    {company.ticker}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600, color: 'var(--ink-800)' }}>
                    {company.name}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--ink-600)' }}>
                    {company.sector}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 800, color: 'var(--ink-900)' }}>
                    {company.current_pd.toFixed(2)}%
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    {getRiskBadge(company.risk_level)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Rankings;
