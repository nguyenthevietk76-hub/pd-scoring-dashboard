import { useState, useEffect } from 'react';
import { FileSpreadsheet, Database } from 'lucide-react';
import demoData from '../demoData.json';
import { API_BASE_URL } from '../config';


const Export = () => {
  const [companies, setCompanies] = useState([]);
  const [exportSuccess, setExportSuccess] = useState(false);

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

  const downloadCSV = () => {
    if (companies.length === 0) return;
    
    // Create CSV header
    const headers = ['Ticker', 'Company Name', 'Sector', 'PD Score (%)', 'Risk Level'];
    
    // Create CSV rows
    const rows = companies.map(c => [
      c.ticker,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.sector || 'N/A'}"`,
      c.current_pd.toFixed(2),
      c.risk_level
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PD_Scoring_Data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '2rem 0' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--ink-900)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
        Xuất Dữ Liệu Phân Tích
      </h1>
      <p style={{ color: 'var(--ink-500)', marginBottom: '2.5rem', fontSize: '1.125rem' }}>
        Trích xuất thông tin xếp hạng tín nhiệm, dữ liệu chấm điểm rủi ro tài chính của doanh nghiệp ra các định dạng chuẩn phục vụ nghiên cứu và lập báo cáo ngoại tuyến.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* CSV Card */}
        <div className="card card-glow" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ backgroundColor: 'rgba(2, 132, 199, 0.08)', color: 'var(--teal-500)', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink-900)', margin: 0 }}>Xuất CSV (Bảng tính)</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-500)', marginTop: '8px', lineHeight: '1.5' }}>
              Tải xuống toàn bộ danh sách doanh nghiệp kèm mã cổ phiếu, xếp hạng rủi ro, ngành nghề và điểm PD Score dưới dạng file CSV mở được bằng Excel, Google Sheets.
            </p>
          </div>
          <button 
            onClick={downloadCSV}
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '999px', fontSize: '0.925rem', fontWeight: 700, width: '100%', marginTop: 'auto' }}
          >
             Tải CSV
          </button>
        </div>

        {/* Database Dump Card */}
        <div className="card card-glow" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'var(--success, #10b981)', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink-900)', margin: 0 }}>Xuất JSON (Cơ sở dữ liệu)</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-500)', marginTop: '8px', lineHeight: '1.5' }}>
              Trích xuất toàn bộ cấu trúc cơ sở dữ liệu doanh nghiệp bao gồm các thành phần SHAP/Feature Importance và lịch sử biến động điểm PD theo dạng định dạng JSON chuẩn.
            </p>
          </div>
          <button 
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(companies, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", `PD_Scoring_Database_${new Date().toISOString().slice(0, 10)}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.removeChild(downloadAnchor);
              setExportSuccess(true);
              setTimeout(() => setExportSuccess(false), 3000);
            }}
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '999px', fontSize: '0.925rem', fontWeight: 700, width: '100%', marginTop: 'auto' }}
          >
             Tải JSON
          </button>
        </div>
      </div>

      {exportSuccess && (
        <div style={{ 
          position: 'fixed', 
          bottom: '24px', 
          right: '24px', 
          backgroundColor: 'var(--success, #10b981)', 
          color: '#ffffff', 
          padding: '12px 24px', 
          borderRadius: '999px', 
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 700,
          fontSize: '0.9rem',
          zIndex: 9999
        }}>
           Đã tải tập tin xuống thành công!
        </div>
      )}
    </div>
  );
};

export default Export;
