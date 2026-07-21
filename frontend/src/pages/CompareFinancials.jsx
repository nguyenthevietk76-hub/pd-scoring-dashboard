import { useState, useEffect } from 'react';
import demoData from '../demoData.json';
import { API_BASE_URL } from '../config';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';


const COLORS = ['#0284c7', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

const METRICS = [
  { key: 'pd_score', label: 'PD Score (%)', unit: '%' },
  { key: 'revenue', label: 'Doanh thu (Revenue)', unit: 'tỷ VNĐ' },
  { key: 'total_assets', label: 'Tổng tài sản (Total Assets)', unit: 'tỷ VNĐ' },
  { key: 'ebitda_margin', label: 'EBITDA Margin', unit: '%' },
  { key: 'roa', label: 'ROA', unit: '%' },
  { key: 'de_ratio', label: 'Đòn bẩy D/E', unit: 'x' },
];

const MAX_SELECTED = 5;

/* ── Lấy dữ liệu thực tế từ API (thay vì Mock Data) ───── */
const generateQuarterlyData = (company, metricKey) => {
  if (metricKey === 'pd_score') {
    return company.pd_scores_4q || [0, 0, 0, 0];
  }

  // Bind vào dữ liệu thực (financial_history) trả về từ Backend API
  if (company.financial_history && company.financial_history[metricKey]) {
    return company.financial_history[metricKey];
  }

  // Trả về mảng 0 nếu không có dữ liệu
  return [0, 0, 0, 0];
};

/* ── Custom Tooltip ───────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '14px 18px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    }}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: 'var(--ink-900)' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, fontSize: '0.875rem', margin: '3px 0', fontWeight: 600 }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('vi-VN') : entry.value}
        </p>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════ */
const CompareFinancials = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedTickers, setSelectedTickers] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('pd_score');
  const [showPicker, setShowPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  /* ── Load companies ──────────────────────────────────────────── */
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/companies`)
      .then(res => res.json())
      .then(data => {
        const list = data.companies || [];
        setCompanies(list);
        if (list.length >= 2) setSelectedTickers([list[0].ticker, list[1].ticker]);
      })
      .catch(() => {
        const list = demoData.companies || [];
        setCompanies(list);
        if (list.length >= 2) setSelectedTickers([list[0].ticker, list[1].ticker]);
      });
  }, []);

  /* ── Helpers ─────────────────────────────────────────────────── */
  const selectedCompanies = companies.filter(c => selectedTickers.includes(c.ticker));
  const metricMeta = METRICS.find(m => m.key === selectedMetric) || METRICS[0];

  const toggleCompany = (ticker) => {
    setSelectedTickers(prev => {
      if (prev.includes(ticker)) return prev.filter(t => t !== ticker);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, ticker];
    });
  };

  const removeCompany = (ticker) => {
    setSelectedTickers(prev => prev.filter(t => t !== ticker));
  };

  /* ── Build chart data ────────────────────────────────────────── */
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4 (Mới nhất)'];
  const chartData = quarters.map((q, qi) => {
    const point = { name: q };
    selectedCompanies.forEach(c => {
      const vals = generateQuarterlyData(c, selectedMetric);
      point[c.ticker] = vals[qi];
    });
    return point;
  });

  /* ── Table rows ──────────────────────────────────────────────── */
  const tableRows = selectedCompanies.map(c => {
    const vals = generateQuarterlyData(c, selectedMetric);
    const change = vals[3] - vals[0];
    const changePct = vals[0] !== 0 ? ((change / Math.abs(vals[0])) * 100) : 0;
    return { ticker: c.ticker, name: c.name, vals, change, changePct, risk_level: c.risk_level };
  });

  /* ── Filtered companies for picker ──────────────────────────── */
  const filteredCompanies = companies.filter(c =>
    c.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.03em' }}>
            So Sánh Chỉ Số Tài Chính
          </h1>
        </div>
        <p style={{ color: 'var(--ink-500)', fontSize: '1.1rem' }}>
          So sánh song song các chỉ số tài chính quan trọng giữa nhiều doanh nghiệp trong 4 quý gần nhất.
        </p>
      </div>

      {/* ── Controls Card ────────────────────────────────────────── */}
      <div className="card card-glow" style={{ padding: '28px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
          {/* Metric selector */}
          <div style={{ flex: '0 0 280px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Chỉ số so sánh
            </label>
            <select
              value={selectedMetric}
              onChange={e => setSelectedMetric(e.target.value)}
              className="input-pill"
              style={{ width: '100%', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}
            >
              {METRICS.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Company chips + add button */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Doanh nghiệp đang so sánh ({selectedTickers.length}/{MAX_SELECTED})
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {selectedCompanies.map((c, idx) => (
                <div
                  key={c.ticker}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px 6px 10px',
                    borderRadius: '999px',
                    background: `${COLORS[idx % COLORS.length]}14`,
                    border: `1.5px solid ${COLORS[idx % COLORS.length]}40`,
                    fontWeight: 700, fontSize: '0.85rem',
                    color: COLORS[idx % COLORS.length],
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: COLORS[idx % COLORS.length],
                    display: 'inline-block',
                  }} />
                  {c.ticker}
                  <button
                    onClick={() => removeCompany(c.ticker)}
                    style={{
                      background: 'none', border: 'none', padding: '2px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      color: COLORS[idx % COLORS.length], opacity: 0.7,
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                  >
                    
                  </button>
                </div>
              ))}

              {selectedTickers.length < MAX_SELECTED && (
                <button
                  onClick={() => setShowPicker(!showPicker)}
                  className="btn-secondary"
                  style={{
                    padding: '6px 16px', fontSize: '0.85rem',
                    borderRadius: '999px', fontWeight: 600,
                  }}
                >
                  
                  Thêm
                </button>
              )}
            </div>

            {/* ── Company Picker Dropdown ───────────────────────── */}
            {showPicker && (
              <div style={{
                marginTop: '12px',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
                padding: '16px',
                maxHeight: '320px',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}>
                <input
                  type="text"
                  placeholder="Tìm theo mã hoặc tên..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="input-pill"
                  style={{ marginBottom: '12px', fontSize: '0.9rem', width: '100%' }}
                />
                <div style={{ overflowY: 'auto', flex: 1, maxHeight: '240px' }}>
                  {filteredCompanies.map(c => {
                    const isSelected = selectedTickers.includes(c.ticker);
                    const isDisabled = !isSelected && selectedTickers.length >= MAX_SELECTED;
                    return (
                      <label
                        key={c.ticker}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 12px', borderRadius: '10px',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.4 : 1,
                          background: isSelected ? 'rgba(2,132,199,0.06)' : 'transparent',
                          transition: 'background 0.15s ease',
                          fontSize: '0.9rem',
                        }}
                        onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.background = 'rgba(2,132,199,0.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(2,132,199,0.06)' : 'transparent'; }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => toggleCompany(c.ticker)}
                          style={{ accentColor: 'var(--teal-500)', width: 16, height: 16, cursor: 'inherit' }}
                        />
                        <span style={{ fontWeight: 700, minWidth: '48px' }}>{c.ticker}</span>
                        <span style={{ color: 'var(--ink-500)', fontSize: '0.85rem', flex: 1 }}>{c.name}</span>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 700,
                          padding: '2px 8px', borderRadius: '999px',
                          background: c.risk_level === 'Cao' ? 'var(--danger-bg)' : c.risk_level === 'Trung bình' ? 'var(--warning-bg)' : 'var(--success-bg)',
                          color: c.risk_level === 'Cao' ? 'var(--danger)' : c.risk_level === 'Trung bình' ? 'var(--warning)' : 'var(--success)',
                        }}>
                          {c.risk_level}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <button
                  onClick={() => { setShowPicker(false); setSearchTerm(''); }}
                  className="btn-primary"
                  style={{ marginTop: '12px', padding: '8px 24px', fontSize: '0.85rem', alignSelf: 'flex-end' }}
                >
                  Xong
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts Section ───────────────────────────────────────── */}
      {selectedCompanies.length > 0 ? (
        <>
          {/* Line Chart */}
          <div className="card card-glow" style={{ padding: '32px 24px', marginBottom: '2rem' }}>
            <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               Biểu đồ xu hướng — {metricMeta.label}
            </h3>
            <div style={{ width: '100%', height: '380px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--ink-500)', fontSize: 13, fontWeight: 600 }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--ink-500)', fontSize: 12 }}
                    label={{ value: metricMeta.unit, angle: -90, position: 'insideLeft', offset: 0, style: { fill: 'var(--ink-500)' } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '16px' }}
                    formatter={(value) => (
                      <span style={{ fontWeight: 600, color: 'var(--ink-900)', fontSize: '0.875rem' }}>{value}</span>
                    )}
                  />
                  {selectedCompanies.map((c, idx) => (
                    <Line
                      key={c.ticker}
                      type="monotone"
                      dataKey={c.ticker}
                      stroke={COLORS[idx % COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: '#fff', stroke: COLORS[idx % COLORS.length], strokeWidth: 2 }}
                      activeDot={{ r: 7, stroke: COLORS[idx % COLORS.length], strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="card card-glow" style={{ padding: '32px 24px', marginBottom: '2rem' }}>
            <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               So sánh theo quý — {metricMeta.label}
            </h3>
            <div style={{ width: '100%', height: '360px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--ink-500)', fontSize: 13, fontWeight: 600 }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--ink-500)', fontSize: 12 }}
                    label={{ value: metricMeta.unit, angle: -90, position: 'insideLeft', offset: 0, style: { fill: 'var(--ink-500)' } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '16px' }}
                    formatter={(value) => (
                      <span style={{ fontWeight: 600, color: 'var(--ink-900)', fontSize: '0.875rem' }}>{value}</span>
                    )}
                  />
                  {selectedCompanies.map((c, idx) => (
                    <Bar
                      key={c.ticker}
                      dataKey={c.ticker}
                      fill={COLORS[idx % COLORS.length]}
                      radius={[6, 6, 0, 0]}
                      opacity={0.85}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Comparison Table ────────────────────────────────── */}
          <div className="card card-glow" style={{ padding: '28px', marginBottom: '2rem' }}>
            <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               Bảng dữ liệu so sánh — {metricMeta.label}
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Ticker</th>
                    <th style={{ textAlign: 'left' }}>Tên doanh nghiệp</th>
                    <th style={{ textAlign: 'right' }}>Q1</th>
                    <th style={{ textAlign: 'right' }}>Q2</th>
                    <th style={{ textAlign: 'right' }}>Q3</th>
                    <th style={{ textAlign: 'right' }}>Q4 (Mới nhất)</th>
                    <th style={{ textAlign: 'right' }}>Thay đổi</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, idx) => (
                    <tr key={row.ticker} className="table-row-hover">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: COLORS[idx % COLORS.length],
                            display: 'inline-block', flexShrink: 0,
                          }} />
                          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{row.ticker}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.875rem', color: 'var(--ink-500)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.name}
                      </td>
                      {row.vals.map((v, vi) => (
                        <td key={vi} style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {typeof v === 'number' ? v.toLocaleString('vi-VN') : v}
                        </td>
                      ))}
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          fontWeight: 700, fontSize: '0.875rem',
                          padding: '4px 12px', borderRadius: '999px',
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: row.change > 0
                            ? (selectedMetric === 'pd_score' || selectedMetric === 'de_ratio' ? 'var(--danger-bg)' : 'var(--success-bg)')
                            : (selectedMetric === 'pd_score' || selectedMetric === 'de_ratio' ? 'var(--success-bg)' : 'var(--danger-bg)'),
                          color: row.change > 0
                            ? (selectedMetric === 'pd_score' || selectedMetric === 'de_ratio' ? 'var(--danger)' : 'var(--success)')
                            : (selectedMetric === 'pd_score' || selectedMetric === 'de_ratio' ? 'var(--success)' : 'var(--danger)'),
                        }}>
                          {row.change > 0 ? '▲' : '▼'} {Math.abs(row.changePct).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend note */}
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-500)', marginTop: '16px', fontStyle: 'italic' }}>
              * Thay đổi được tính dựa trên chênh lệch giữa Q4 (mới nhất) và Q1. Với PD Score và D/E, tăng = xấu đi; với các chỉ số khác, tăng = cải thiện.
            </p>
          </div>
        </>
      ) : (
        /* ── Empty state ─────────────────────────────────────────── */
        <div className="card card-glow" style={{
          padding: '80px 40px', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(2,132,199,0.1), rgba(56,189,248,0.1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-900)' }}>
            Chưa có doanh nghiệp nào được chọn
          </h3>
          <p style={{ color: 'var(--ink-500)', maxWidth: '400px' }}>
            Nhấn nút <strong>"Thêm"</strong> ở phía trên để chọn tối đa {MAX_SELECTED} doanh nghiệp cần so sánh.
          </p>
        </div>
      )}
    </div>
  );
};

export default CompareFinancials;
