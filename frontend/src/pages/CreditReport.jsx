import { useState, useEffect, useContext } from 'react';
import { AnalysisContext } from '../context/AnalysisContext';
import demoData from '../demoData.json';
import { API_BASE_URL } from '../config';


const CreditReport = () => {
  const { analysisContext } = useContext(AnalysisContext);
  const [companies, setCompanies] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/companies`)
      .then(res => res.json())
      .then(data => {
        setCompanies(data.companies || []);
      })
      .catch(err => {
        setCompanies(demoData.companies || []);
      });
  }, []);

  // Pre-select company from context if available
  useEffect(() => {
    if (analysisContext && analysisContext.company_name) {
      const found = companies.find(c => c.name === analysisContext.company_name || c.ticker === analysisContext.ticker);
      if (found) {
        setSelectedTicker(found.ticker);
        setSelectedCompany(found);
      }
    } else if (companies.length > 0) {
      setSelectedTicker(companies[0].ticker);
      setSelectedCompany(companies[0]);
    }
  }, [analysisContext, companies]);

  const handleCompanyChange = (e) => {
    const ticker = e.target.value;
    setSelectedTicker(ticker);
    const found = companies.find(c => c.ticker === ticker);
    setSelectedCompany(found);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      {/* Report Controls (Hidden during print) */}
      <div className="card card-glow no-print" style={{ padding: '20px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: 700, color: 'var(--ink-700)', fontSize: '0.9rem' }}>Chọn doanh nghiệp:</label>
          <select 
            value={selectedTicker} 
            onChange={handleCompanyChange}
            className="input-pill"
            style={{ padding: '8px 16px', fontWeight: 600 }}
          >
            {companies.map((c, idx) => (
              <option key={idx} value={c.ticker}>{c.ticker} - {c.name}</option>
            ))}
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handlePrint} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '999px', fontSize: '0.875rem' }}>
             In Báo Cáo
          </button>
        </div>
      </div>

      {/* Printable Report Document */}
      {selectedCompany && (
        <div className="card report-print-container" style={{ padding: '48px', backgroundColor: '#ffffff', color: '#1a1a1a', borderRadius: '16px', boxShadow: '0 4px 30px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #0f172a', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Risk Tech - CREDIT REPORT</div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0 0', letterSpacing: '-0.02em' }}>
                BÁO CÁO ĐÁNH GIÁ TÍN DỤNG
              </h2>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0284c7', marginTop: '6px' }}>
                {selectedCompany.name} ({selectedCompany.ticker})
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>MÃ BÁO CÁO: CR-{selectedCompany.ticker}-{new Date().getFullYear()}</div>
              <div style={{ fontSize: '0.825rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '6px' }}>
                 Ngày lập: {new Date().toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
              I. Tóm Tắt Đánh Giá Chung
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Điểm Xác Suất Vỡ Nợ (PD)</span>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: selectedCompany.risk_level === 'Cao' ? '#ef4444' : selectedCompany.risk_level === 'Trung bình' ? '#f59e0b' : '#10b981' }}>
                  {selectedCompany.current_pd.toFixed(2)}%
                </span>
              </div>
              <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Hạng Rủi Ro Tín Dụng</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 900, color: selectedCompany.risk_level === 'Cao' ? '#ef4444' : selectedCompany.risk_level === 'Trung bình' ? '#f59e0b' : '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  {selectedCompany.risk_level === 'Cao' ? 'Rủi ro Cao' : selectedCompany.risk_level === 'Trung bình' ? 'Rủi ro Trung bình' : 'Rủi ro Thấp'}
                </span>
              </div>
            </div>
            <p style={{ fontSize: '0.925rem', color: '#334155', lineHeight: '1.6', margin: 0 }}>
              Dựa trên mô hình học máy **Random Forest** kết hợp **Logistic Regression** đã qua kiểm định, doanh nghiệp **{selectedCompany.name}** có xác suất xảy ra biến cố mất khả năng thanh toán (Distress) trong vòng 1 năm tới là **{(selectedCompany.current_pd || 0).toFixed(2)}%**. Tình hình tài chính tổng thể của doanh nghiệp được xếp vào nhóm có **rủi ro {(selectedCompany.risk_level || '').toLowerCase()}**.
            </p>
          </div>

          {/* Section 2: Historical Trend */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
              II. Lịch Sử Biến Động Rủi Ro (4 Quý Gần Nhất)
            </h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
              {selectedCompany.pd_scores_4q && selectedCompany.pd_scores_4q.map((pd, index) => (
                <div key={index} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center', backgroundColor: '#ffffff' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Quý {index + 1} trước</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#334155', marginTop: '4px', display: 'block' }}>{pd.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Risk Factors */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
              III. Các Yếu Tố Rủi Ro Tài Chính Trọng Yếu
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedCompany.top_factors && selectedCompany.top_factors.map((factor, index) => (
                <div key={index} style={{ padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.925rem', fontWeight: 800, color: '#1e293b' }}>{factor.label_vi}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Tên biến gốc: <code>{factor.feature}</code></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Giá trị thực tế: {factor.display_val}</div>
                    <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 700, marginTop: '2px' }}>Đóng góp rủi ro: +{factor.contribution.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer / Disclaimers */}
          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1.5rem', marginTop: '3rem', fontSize: '0.75rem', color: '#64748b', lineHeight: '1.5' }}>
            <div style={{ fontWeight: 800, marginBottom: '4px', color: '#475569' }}>CẢNH BÁO MIỄN TRỪ TRÁCH NHIỆM (DISCLAIMER):</div>
            Báo cáo này được lập tự động từ mô hình đánh giá rủi ro tín dụng của Risk Tech dựa trên dữ liệu báo cáo tài chính đã công công bố của doanh nghiệp. Kết quả PD Score đóng vai trò là một nguồn thông tin tham khảo kỹ thuật trong quá trình thẩm định và không cấu thành quyết định cho vay hay từ chối cho vay tín dụng cuối cùng. Risk Tech không chịu trách nhiệm đối với bất kỳ quyết định đầu tư hay cấp tín dụng nào phát sinh từ việc sử dụng thông tin của báo cáo này.
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditReport;
