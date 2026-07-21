import { useState, useEffect } from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react';
import demoData from '../demoData.json';
import { API_BASE_URL } from '../config';

const Alerts = () => {
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

  // Lọc ra các công ty có cảnh báo
  const alertsList = [];
  let lowMediumCount = 0;
  
  companies.forEach(company => {
    const scores = company.pd_scores_4q;
    if (scores && scores.length >= 2) {
      const current = scores[scores.length - 1];
      const prev = scores[scores.length - 2];
      const diff = current - prev;
      
      let type = null;
      let message = '';
      
      if (current > 60) {
        type = 'danger';
        message = `Ngưỡng nguy hiểm: Xác suất vỡ nợ cao (PD: ${current.toFixed(1)}%)`;
      } else if (diff > 15) {
        type = 'warning';
        message = `Tín hiệu suy giảm đột ngột: PD tăng +${diff.toFixed(1)} điểm so với quý trước`;
      } else {
        lowMediumCount++;
      }
      
      if (type) {
        alertsList.push({
          ticker: company.ticker,
          name: company.name,
          type,
          message,
          current_pd: current
        });
      }
    }
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--ink-900)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
        Trung tâm Cảnh báo Rủi ro
      </h1>
      <p style={{ color: 'var(--ink-500)', marginBottom: '2.5rem', fontSize: '1.125rem' }}>
        Hệ thống tự động rà soát, phát hiện và cảnh báo sớm các doanh nghiệp vượt ngưỡng rủi ro hoặc suy yếu tài chính đột ngột.
      </p>

      {alertsList.length === 0 ? (
        <div className="card card-glow" style={{ textAlign: 'center', color: 'var(--ink-500)', padding: '4rem', fontSize: '1.1rem' }}>
           Hệ thống hoạt động bình thường. Không ghi nhận cảnh báo rủi ro trọng yếu nào.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
          {alertsList.map((alert, idx) => (
            <div 
              key={idx} 
              className="card card-glow" 
              style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '2rem', 
                borderLeft: `4px solid ${alert.type === 'danger' ? 'var(--danger)' : 'var(--warning)'}`,
                padding: '24px 32px',
                background: alert.type === 'danger' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <div style={{ color: alert.type === 'danger' ? 'var(--danger)' : 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {alert.type === 'danger' ? <AlertOctagon size={36} strokeWidth={1.5} /> : <AlertTriangle size={36} strokeWidth={1.5} />}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.02em' }}>
                  {alert.ticker} - {alert.name}
                </h3>
                <p style={{ color: alert.type === 'danger' ? '#b91c1c' : '#b45309', fontWeight: 600, marginTop: '0.4rem', fontSize: '0.95rem' }}>
                  {alert.message}
                </p>
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 900, color: alert.type === 'danger' ? 'var(--danger)' : 'var(--warning)', fontFamily: "'Playfair Display', serif" }}>
                {alert.current_pd.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* State for healthy companies */}
      {lowMediumCount > 0 && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '0.75rem', 
          padding: '2rem', 
          color: 'var(--ink-500)', 
          borderTop: '1px dashed var(--border-color)',
          marginTop: '2rem',
          fontSize: '0.95rem'
        }}>
          <CheckCircle size={18} color="var(--success)" />
          <span>Có {lowMediumCount} doanh nghiệp khác trong danh mục ở trạng thái rủi ro thấp/trung bình ổn định.</span>
        </div>
      )}
    </div>
  );
};

export default Alerts;
