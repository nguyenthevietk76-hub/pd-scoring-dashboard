import { useState, useEffect, useContext } from 'react';
import { AnalysisContext } from '../context/AnalysisContext';
import demoData from '../demoData.json';
import { API_BASE_URL } from '../config';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';


const Trends = () => {
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

  // Build historical chart data
  const chartData = selectedCompany && selectedCompany.pd_scores_4q ? 
    selectedCompany.pd_scores_4q.map((pd, index) => ({
      name: `Quý ${index + 1}`,
      PD: parseFloat(pd.toFixed(2)),
      'Trung bình ngành': selectedCompany.current_pd > 50 ? Math.round(pd * 0.7) : Math.round(pd * 1.3) // mock industry avg
    })) : [];

  let trendLabel = 'Xu Hướng Ổn Định';
  let trendColor = 'var(--teal-500)';
  let TrendIconComponent = Activity;
  let trendDesc = 'Xác suất vỡ nợ không có biến động lớn. Duy trì các chính sách tín dụng hiện tại.';

  if (selectedCompany && selectedCompany.pd_scores_4q && selectedCompany.pd_scores_4q.length >= 3) {
    const prevPD = selectedCompany.pd_scores_4q[2]; // Quý trước (Quý 3)
    const currentPD = selectedCompany.current_pd;
    const diff = currentPD - prevPD;

    if (diff <= -10) {
      trendLabel = 'Đang Cải Thiện (Tích Cực)';
      trendColor = 'var(--success)';
      TrendIconComponent = ShieldCheck;
      trendDesc = 'Rủi ro giảm mạnh. Tình hình tài chính đang cải thiện rất tích cực, có thể mở rộng hạn mức tín dụng.';
    } else if (diff >= 10) {
      trendLabel = 'Rủi Ro Tăng Mạnh';
      trendColor = 'var(--danger)';
      TrendIconComponent = AlertTriangle;
      trendDesc = 'Rủi ro tăng đột biến. Khuyến nghị thẩm định cực kỳ chặt chẽ, rút ngắn kỳ hạn vay và bổ sung tài sản bảo đảm.';
    } else if (diff > 2) {
      trendLabel = 'Rủi Ro Tăng Nhẹ';
      trendColor = 'var(--warning)';
      TrendIconComponent = TrendingUp;
      trendDesc = 'Rủi ro có dấu hiệu tăng nhẹ. Cần theo dõi sát sao báo cáo tài chính quý tiếp theo.';
    } else if (diff < -2) {
      trendLabel = 'Cải Thiện Nhẹ';
      trendColor = 'var(--success)';
      TrendIconComponent = ShieldCheck;
      trendDesc = 'Tình hình rủi ro có xu hướng giảm nhẹ, duy trì trạng thái cấp tín dụng bình thường.';
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--ink-900)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
        Phân Tích Xu Hướng Rủi Ro
      </h1>
      <p style={{ color: 'var(--ink-500)', marginBottom: '2.5rem', fontSize: '1.125rem' }}>
        Biểu đồ lịch sử Xác suất Vỡ nợ (PD) qua các quý gần nhất giúp theo dõi xu hướng cải thiện hoặc suy yếu của doanh nghiệp.
      </p>

      {/* Select Box */}
      <div className="card card-glow" style={{ padding: '20px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ fontWeight: 700, color: 'var(--ink-700)', fontSize: '0.9rem' }}>Chọn doanh nghiệp phân tích:</label>
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

      {selectedCompany && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Main Chart */}
          <div className="card card-glow" style={{ padding: '32px 24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              
              Lịch Sử Điểm PD - {selectedCompany.ticker}
            </h3>

            <div style={{ width: '100%', height: '360px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorPD" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--danger, #ef4444)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--danger, #ef4444)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorIndustry" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--teal-500, #0284c7)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="var(--teal-500, #0284c7)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Xác suất vỡ nợ (PD %)', angle: -90, position: 'insideLeft', offset: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: '1px solid var(--border-color)', color: '#000' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="PD" stroke="var(--danger, #ef4444)" fillOpacity={1} fill="url(#colorPD)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="Trung bình ngành" stroke="var(--teal-500, #0284c7)" fillOpacity={1} fill="url(#colorIndustry)" strokeDasharray="5 5" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card card-glow" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--ink-500)', textTransform: 'uppercase', marginBottom: '8px' }}>Xu Hướng Hiện Tại</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendIconComponent size={24} color={trendColor} />  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink-900)' }}>
                  {trendLabel}
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-500)', marginTop: '8px', lineHeight: 1.4 }}>
                {trendDesc}
              </p>
            </div>

            <div className="card card-glow" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--ink-500)', textTransform: 'uppercase', marginBottom: '12px' }}>Chỉ Số So Sánh</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--ink-500)' }}>PD hiện tại:</span>
                  <span style={{ fontWeight: 800, color: 'var(--ink-900)' }}>{selectedCompany.current_pd.toFixed(2)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--ink-500)' }}>PD Quý trước:</span>
                  <span style={{ fontWeight: 800, color: 'var(--ink-900)' }}>
                    {(selectedCompany.pd_scores_4q && selectedCompany.pd_scores_4q[2]) ? selectedCompany.pd_scores_4q[2].toFixed(2) : 'N/A'}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--ink-500)' }}>Mức thay đổi:</span>
                  {selectedCompany.pd_scores_4q && selectedCompany.pd_scores_4q[2] ? (
                    (() => {
                      const diff = selectedCompany.current_pd - selectedCompany.pd_scores_4q[2];
                      return (
                        <span style={{ fontWeight: 800, color: diff > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {diff > 0 ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`}
                        </span>
                      );
                    })()
                  ) : <span style={{ fontWeight: 800, color: 'var(--ink-900)' }}>N/A</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trends;
