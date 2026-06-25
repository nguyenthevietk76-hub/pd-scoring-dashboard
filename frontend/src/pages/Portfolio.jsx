import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import demoData from '../demoData.json';
import { CheckCircle, AlertTriangle, AlertOctagon, Search, Filter } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Portfolio = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);

  const [filterRisk, setFilterRisk] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
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

  const getRiskBadge = (level) => {
    switch(level) {
      case 'Thấp': 
        return <div className="badge-low"><CheckCircle size={14} /> Thấp</div>;
      case 'Trung bình': 
        return <div className="badge-medium"><AlertTriangle size={14} /> Trung bình</div>;
      case 'Cao': 
        return <div className="badge-high"><AlertOctagon size={14} /> Cao</div>;
      default: return null;
    }
  };

  const getRiskColor = (level) => {
    switch(level) {
      case 'Thấp': return 'var(--success)';
      case 'Trung bình': return 'var(--warning)';
      case 'Cao': return 'var(--danger)';
      default: return 'var(--teal-500)';
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchRisk = filterRisk === 'Tất cả' || company.risk_level === filterRisk;
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = company.name.toLowerCase().includes(searchLower) || company.ticker.toLowerCase().includes(searchLower);
    return matchRisk && matchSearch;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--ink-900)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
        Danh mục doanh nghiệp
      </h1>
      <p style={{ color: 'var(--ink-500)', marginBottom: '2.5rem', fontSize: '1.125rem' }}>
        Bảng theo dõi và thống kê Xác suất Vỡ nợ (PD) của {companies.length || demoData.companies.length} doanh nghiệp trên thị trường chứng khoán Việt Nam.
      </p>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-500)' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo Ticker hoặc Tên công ty..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-pill"
            style={{ 
              width: '100%', 
              padding: '0.75rem 1rem 0.75rem 2.75rem', 
              fontSize: '0.875rem'
            }}
          />
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          backgroundColor: 'rgba(0, 0, 0, 0.25)', 
          padding: '0.5rem 1.5rem', 
          borderRadius: '999px', 
          border: '1px solid var(--border-color)',
          height: '46px'
        }}>
          <Filter size={16} color="var(--ink-500)" />
          <select 
            value={filterRisk} 
            onChange={(e) => setFilterRisk(e.target.value)}
            style={{ 
              border: 'none', 
              outline: 'none', 
              fontFamily: 'inherit', 
              fontSize: '0.875rem', 
              color: 'var(--ink-900)', 
              fontWeight: 600, 
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}
          >
            <option value="Tất cả">Lọc mức rủi ro: Tất cả</option>
            <option value="Thấp">Mức rủi ro: Thấp</option>
            <option value="Trung bình">Mức rủi ro: Trung bình</option>
            <option value="Cao">Mức rủi ro: Cao</option>
          </select>
        </div>
      </div>

      <div className="card card-glow table-glass" style={{ overflowX: 'auto', padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th style={{ padding: '1.25rem 2rem' }}>Ticker</th>
              <th>Tên Doanh nghiệp</th>
              <th>Ngành nghề</th>
              <th>PD Score (Hiện tại)</th>
              <th>Xếp hạng Rủi ro</th>
              <th style={{ padding: '1.25rem 2rem' }}>Yếu tố ảnh hưởng chính</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.length > 0 ? filteredCompanies.map((company, idx) => {
              const score = company.current_pd;
              return (
                <tr 
                  key={idx} 
                  className="table-row-hover" 
                  onClick={() => navigate('/dashboard', { state: { company } })}
                  style={{ transition: 'background-color 0.2s', cursor: 'pointer' }}
                >
                  <td style={{ fontWeight: 800, color: 'var(--teal-500)', padding: '1.25rem 2rem' }}>{company.ticker}</td>
                  <td style={{ color: 'var(--ink-900)', fontWeight: 600 }}>{company.name}</td>
                  <td style={{ color: 'var(--ink-500)', fontSize: '0.875rem' }}>{company.sector}</td>
                  <td style={{ fontWeight: 700, color: 'var(--ink-900)' }}>
                    <div style={{ marginBottom: '6px', fontSize: '0.95rem' }}>{score.toFixed(1)}%</div>
                    <div style={{ width: '120px', height: '5px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${Math.min(100, score)}%`, 
                        height: '100%', 
                        backgroundColor: getRiskColor(company.risk_level),
                        borderRadius: '3px'
                      }}></div>
                    </div>
                  </td>
                  <td>{getRiskBadge(company.risk_level)}</td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--ink-500)', padding: '1.25rem 2rem' }}>
                    {company.top_factors[0] ? company.top_factors[0].label_vi : 'Không có yếu tố đáng chú ý'}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '4rem', color: 'var(--ink-500)', fontSize: '0.95rem' }}>
                  Không tìm thấy doanh nghiệp nào khớp với bộ lọc tìm kiếm.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Portfolio;
