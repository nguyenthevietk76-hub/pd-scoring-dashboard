import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import demoData from '../demoData.json';
import { API_BASE_URL } from '../config';


// Mock news for business summary panels
const MOCK_NEWS_MAP = {
  'HPG': [
    { title: 'Hòa Phát đặt mục tiêu doanh thu 150.000 tỷ đồng năm 2025', source: 'VnExpress', date: '2025-06-15' },
    { title: 'Thép Hòa Phát tăng sản lượng xuất khẩu sang Đông Nam Á', source: 'CafeF', date: '2025-06-10' },
  ],
  'VNM': [
    { title: 'Vinamilk mở rộng thị trường sang Trung Đông và Châu Phi', source: 'TBKTSG', date: '2025-06-12' },
    { title: 'VNM duy trì biên lợi nhuận cao nhất ngành sữa', source: 'VietStock', date: '2025-06-08' },
  ],
  'FPT': [
    { title: 'FPT ký hợp đồng chuyển đổi số 100 triệu USD với đối tác Nhật Bản', source: 'VnExpress', date: '2025-06-14' },
    { title: 'Doanh thu CNTT của FPT tăng trưởng 25% so với cùng kỳ', source: 'CafeF', date: '2025-06-09' },
  ],
};

const defaultNews = [
  { title: 'Thị trường chứng khoán Việt Nam hấp dẫn nhà đầu tư nước ngoài', source: 'TBKTSG', date: '2025-06-11' },
  { title: 'Ngân hàng Nhà nước duy trì chính sách lãi suất ổn định', source: 'VnExpress', date: '2025-06-07' },
];

const SearchCompany = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);

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

  const filtered = companies.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q) || (c.sector && c.sector.toLowerCase().includes(q));
  });

  const handleSelectCompany = (company) => {
    setSelectedCompany(company);
  };

  const getRiskColor = (level) => {
    switch(level) {
      case 'Cao': return 'var(--danger)';
      case 'Trung bình': return 'var(--warning)';
      case 'Thấp': return 'var(--success)';
      default: return 'var(--ink-500)';
    }
  };

  // Generate financial summary for selected company
  const getFinancialSummary = (company) => {
    if (!company) return [];
    
    // Read real data if available from API
    if (company.financial_history && company.financial_history.revenue && company.financial_history.revenue.length > 0) {
      const hist = company.financial_history;
      const ttm_rev = hist.revenue.reduce((a, b) => a + b, 0);
      const latest_ta = hist.total_assets[hist.total_assets.length - 1];
      const latest_roa = hist.roa[hist.roa.length - 1];
      const ttm_ni = hist.roa.map((r, i) => (r / 100) * hist.total_assets[i]).reduce((a, b) => a + b, 0);
      
      return [
        { label: 'Doanh thu (TTM)', value: `${ttm_rev.toLocaleString('vi-VN', {maximumFractionDigits: 0})} tỷ VNĐ` },
        { label: 'Lợi nhuận ròng (TTM)', value: `${ttm_ni.toLocaleString('vi-VN', {maximumFractionDigits: 0})} tỷ VNĐ` },
        { label: 'Tổng tài sản (Hiện tại)', value: `${latest_ta.toLocaleString('vi-VN', {maximumFractionDigits: 0})} tỷ VNĐ` },
        { label: 'Tỷ lệ D/E', value: `${hist.de_ratio[hist.de_ratio.length - 1].toFixed(2)}` },
        { label: 'ROA', value: `${latest_roa.toFixed(1)}%` },
        { label: 'PD Score', value: `${company.current_pd.toFixed(2)}%`, color: getRiskColor(company.risk_level) },
      ];
    }

    const pd = company.current_pd;
    const scale = pd < 5 ? 1.5 : pd < 15 ? 1.0 : 0.6;
    const hash = company.ticker.charCodeAt(0) + (company.ticker.charCodeAt(1) || 0);
    return [
      { label: 'Doanh thu (ước tính)', value: `${(hash * 12.5 * scale).toFixed(0)} tỷ VNĐ` },
      { label: 'Lợi nhuận ròng (ước tính)', value: `${(hash * 1.8 * scale).toFixed(0)} tỷ VNĐ` },
      { label: 'Tổng tài sản (ước tính)', value: `${(hash * 35 * scale).toFixed(0)} tỷ VNĐ` },
      { label: 'Tỷ lệ D/E (ước tính)', value: `${(0.3 + pd / 100).toFixed(2)}` },
      { label: 'ROA (ước tính)', value: `${(12 - pd / 10).toFixed(1)}%` },
      { label: 'PD Score', value: `${pd.toFixed(2)}%`, color: getRiskColor(company.risk_level) },
    ];
  };

  const relatedNews = selectedCompany ? (MOCK_NEWS_MAP[selectedCompany.ticker] || defaultNews) : [];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', padding: '2rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--ink-900)', marginBottom: '1rem', letterSpacing: '-0.03em' }}>
          Tìm Kiếm & Tóm Tắt Doanh Nghiệp
        </h1>
        <p style={{ color: 'var(--ink-500)', fontSize: '1.125rem', maxWidth: '700px', margin: '0 auto' }}>
          Tìm kiếm công ty niêm yết theo tên, mã chứng khoán hoặc ngành. Đọc tóm tắt kinh doanh, duyệt hồ sơ BCTC gần nhất và xem tin tức liên quan — tất cả ở một nơi.
        </p>
      </div>

      {/* Large search input */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        
        <input 
          type="text" 
          placeholder="Nhập mã cổ phiếu (ví dụ: AAA, HPG...) hoặc tên doanh nghiệp..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '1.25rem 1.5rem 1.25rem 3.5rem',
            fontSize: '1.125rem',
            borderRadius: '999px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(10px)',
            color: 'var(--ink-900)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
            outline: 'none',
            transition: 'border-color 0.3s, box-shadow 0.3s'
          }}
          className="input-search-large"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedCompany ? '1fr 1.2fr' : '1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left: Results List */}
        <div className="card card-glow" style={{ padding: '16px', borderRadius: '24px' }}>
          <div style={{ padding: '8px 16px 16px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem', color: 'var(--ink-500)', fontWeight: 600 }}>
            Kết quả tìm kiếm ({filtered.length} doanh nghiệp)
          </div>
          
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-400)' }}>
              Không tìm thấy doanh nghiệp nào phù hợp với từ khóa tìm kiếm.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', maxHeight: selectedCompany ? '600px' : 'none', overflowY: selectedCompany ? 'auto' : 'visible' }}>
              {filtered.slice(0, 15).map((company, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleSelectCompany(company)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    backgroundColor: selectedCompany?.ticker === company.ticker ? 'rgba(2, 132, 199, 0.06)' : 'transparent',
                    borderLeft: selectedCompany?.ticker === company.ticker ? '3px solid var(--teal-500)' : '3px solid transparent',
                  }}
                  className="search-result-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      backgroundColor: 'rgba(2, 132, 199, 0.08)', 
                      color: 'var(--teal-500)', 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.1rem'
                    }}>
                      {company.ticker}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--ink-900)', margin: 0 }}>
                        {company.name}
                      </h3>
                      <span style={{ fontSize: '0.775rem', color: 'var(--ink-500)', fontWeight: 500 }}>
                        {company.sector}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase' }}>PD Score</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: getRiskColor(company.risk_level) }}>
                        {company.current_pd.toFixed(2)}%
                      </div>
                    </div>
                    
                  </div>
                </div>
              ))}
              {filtered.length > 15 && (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--ink-400)', borderTop: '1px solid var(--border-color)', marginTop: '8px' }}>
                  Hiển thị 15 kết quả đầu tiên. Vui lòng gõ cụ thể hơn để lọc kết quả.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Business Summary Panel */}
        {selectedCompany && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Company Header */}
            <div className="card card-glow" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{selectedCompany.sector}</span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--ink-900)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                    {selectedCompany.name}
                  </h2>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--teal-500)' }}>{selectedCompany.ticker}</span>
                </div>
                <button onClick={() => setSelectedCompany(null)} style={{ background: 'none', border: 'none', color: 'var(--ink-400)', padding: '4px' }}>
                  
                </button>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-500)', marginTop: '12px', lineHeight: '1.5' }}>
                Doanh nghiệp hoạt động trong lĩnh vực <strong>{selectedCompany.sector}</strong>. Xác suất Vỡ nợ (PD) hiện tại là <strong style={{ color: getRiskColor(selectedCompany.risk_level) }}>{selectedCompany.current_pd.toFixed(2)}%</strong>, 
                được xếp hạng rủi ro <strong style={{ color: getRiskColor(selectedCompany.risk_level) }}>{selectedCompany.risk_level}</strong>.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button onClick={() => navigate('/pd-scoring', { state: { selectedTicker: selectedCompany.ticker } })} className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem', borderRadius: '999px' }}>
                   Phân tích PD Score
                </button>
                <button onClick={() => navigate('/trends', { state: { selectedTicker: selectedCompany.ticker } })} className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.85rem', borderRadius: '999px' }}>
                  Xu hướng rủi ro
                </button>
              </div>
            </div>

            {/* Financial Indicators */}
            <div className="card card-glow" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 Chỉ Số Tài Chính Chủ Chốt
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {getFinancialSummary(selectedCompany).map((item, idx) => (
                  <div key={idx} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-400)', textTransform: 'uppercase' }}>{item.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: item.color || 'var(--ink-900)', marginTop: '2px' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* BCTC Filings */}
            <div className="card card-glow" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 Hồ Sơ BCTC Gần Nhất
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedCompany.pd_scores_4q && selectedCompany.pd_scores_4q.map((pd, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      
                      <span style={{ fontWeight: 700, color: 'var(--ink-900)', fontSize: '0.9rem' }}>BCTC Quý {idx + 1}/2025</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: pd > 50 ? 'var(--danger)' : pd > 20 ? 'var(--warning)' : 'var(--success)' }}>PD: {pd.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Related News */}
            <div className="card card-glow" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 Tin Tức Liên Quan
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {relatedNews.map((news, idx) => (
                  <div key={idx} style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer', transition: 'background-color 0.2s' }} className="table-row-hover">
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--ink-900)', margin: '0 0 4px 0' }}>{news.title}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.775rem', color: 'var(--ink-400)' }}>
                      <span style={{ fontWeight: 600 }}>{news.source}</span>
                      <span>•</span>
                      <span>{news.date}</span>
                      
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchCompany;
