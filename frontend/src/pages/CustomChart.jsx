import { useState, useEffect, useMemo } from 'react';
import demoData from '../demoData.json';
import { API_BASE_URL } from '../config';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ZAxis
} from 'recharts';


/* ──────────────────────────── metric definitions ──────────────────────────── */
const METRICS = [
  { key: 'current_pd',        label: 'PD Score (%)' },
  { key: 'revenue_est',       label: 'Doanh thu ước tính' },
  { key: 'total_assets_est',  label: 'Tổng tài sản ước tính' },
  { key: 'debt_ratio',        label: 'Tỷ lệ đòn bẩy nợ' },
  { key: 'roa_est',           label: 'ROA ước tính' },
  { key: 'ebitda_margin_est', label: 'EBITDA Margin ước tính' },
  { key: 'cash_ratio_est',    label: 'Tỷ lệ thanh toán tiền mặt' },
];

const metricLabelMap = Object.fromEntries(METRICS.map(m => [m.key, m.label]));

/* ────────────── deterministic hash from ticker string ────────────── */
const hashTicker = (ticker) => {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) {
    h = ((h << 5) - h + ticker.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

/** Seeded pseudo‑random (Mulberry32) — returns 0‑1 */
const seededRandom = (seed) => {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Generate a deterministic metric value for a company */
const computeMetric = (company, metricKey) => {
  const pd = company.current_pd;
  const h  = hashTicker(company.ticker);

  switch (metricKey) {
    case 'current_pd':
      return pd;

    case 'revenue_est': {
      const r = seededRandom(h + 1);
      return pd < 30
        ? Math.round(5000 + r * 45000)   // healthy → high revenue
        : Math.round(500  + r * 8000);    // distressed → low
    }
    case 'total_assets_est': {
      const r = seededRandom(h + 2);
      return pd < 30
        ? Math.round(10000 + r * 90000)
        : Math.round(2000  + r * 20000);
    }
    case 'debt_ratio': {
      const r = seededRandom(h + 3);
      return Math.round((0.1 + r * 0.85 + pd / 200) * 100) / 100;
    }
    case 'roa_est': {
      const r = seededRandom(h + 4);
      return pd < 30
        ? Math.round((5 + r * 20) * 100) / 100
        : Math.round((-5 + r * 10) * 100) / 100;
    }
    case 'ebitda_margin_est': {
      const r = seededRandom(h + 5);
      return pd < 30
        ? Math.round((10 + r * 40) * 100) / 100
        : Math.round((-10 + r * 25) * 100) / 100;
    }
    case 'cash_ratio_est': {
      const r = seededRandom(h + 6);
      return pd < 30
        ? Math.round((0.5 + r * 2.5) * 100) / 100
        : Math.round((0.05 + r * 0.8) * 100) / 100;
    }
    default:
      return 0;
  }
};

/* ────────────── risk → colour mapping ────────────── */
const RISK_COLORS = {
  'Thấp':       '#10b981',
  'Trung bình': '#f59e0b',
  'Cao':        '#ef4444',
};

/* ────────────── format helpers ────────────── */
const fmt = (v, key) => {
  if (key === 'current_pd') return `${v.toFixed(2)}%`;
  if (['revenue_est', 'total_assets_est'].includes(key))
    return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toLocaleString();
  if (['debt_ratio', 'ebitda_margin_est', 'cash_ratio_est'].includes(key))
    return v.toFixed(2);
  if (key === 'roa_est') return `${v.toFixed(2)}%`;
  return v;
};

/* ══════════════════════════════ Component ══════════════════════════════ */
const CustomChart = () => {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [xMetric, setXMetric] = useState('current_pd');
  const [yMetric, setYMetric] = useState('roa_est');

  /* ── data fetch ── */
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/companies`)
      .then(res => res.json())
      .then(data => {
        setCompanies(data.companies || []);
        setIsLoading(false);
      })
      .catch(() => {
        setCompanies(demoData.companies || []);
        setIsLoading(false);
      });
  }, []);

  /* ── build scatter data ── */
  const scatterData = useMemo(() =>
    companies.map(c => ({
      ticker:     c.ticker,
      name:       c.name,
      risk_level: c.risk_level,
      x:          computeMetric(c, xMetric),
      y:          computeMetric(c, yMetric),
    })),
    [companies, xMetric, yMetric]
  );

  /* ── top 3 outliers on Y axis ── */
  const outliers = useMemo(() => {
    if (scatterData.length === 0) return [];
    const meanY = scatterData.reduce((s, d) => s + d.y, 0) / scatterData.length;
    return [...scatterData]
      .map(d => ({ ...d, deviation: Math.abs(d.y - meanY) }))
      .sort((a, b) => b.deviation - a.deviation)
      .slice(0, 3);
  }, [scatterData]);

  /* ── custom tooltip ── */
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '14px 18px',
        boxShadow: 'var(--shadow-card)',
        minWidth: 200,
      }}>
        <p style={{ fontWeight: 700, color: 'var(--ink-900)', marginBottom: 4, fontSize: '0.95rem' }}>
          {d.ticker}
        </p>
        <p style={{ color: 'var(--ink-500)', fontSize: '0.82rem', marginBottom: 8 }}>
          {d.name}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--teal-500)' }}>
            {metricLabelMap[xMetric]}: <strong>{fmt(d.x, xMetric)}</strong>
          </span>
          <span style={{ color: 'var(--ink-900)' }}>
            {metricLabelMap[yMetric]}: <strong>{fmt(d.y, yMetric)}</strong>
          </span>
        </div>
      </div>
    );
  };

  /* ── selector component ── */
  const MetricSelector = ({ label, value, onChange }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--ink-400)',
      }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input-pill"
        style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--border-color)',
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(8px)',
          color: 'var(--ink-900)',
          fontWeight: 600,
          fontSize: '0.92rem',
          cursor: 'pointer',
          outline: 'none',
          minWidth: 220,
          appearance: 'auto',
        }}
      >
        {METRICS.map(m => (
          <option key={m.key} value={m.key}>{m.label}</option>
        ))}
      </select>
    </div>
  );

  /* ── risk badge ── */
  const RiskDot = ({ level }) => (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      background: RISK_COLORS[level] || '#999', marginRight: 6, flexShrink: 0,
    }} />
  );

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          
          <h1 style={{
            fontSize: '2.25rem', fontWeight: 800, color: 'var(--ink-900)',
            letterSpacing: '-0.03em', margin: 0,
          }}>
            Biểu Đồ Tùy Chỉnh
          </h1>
        </div>
        <p style={{ color: 'var(--ink-500)', fontSize: '1.125rem', margin: 0 }}>
          Vẽ bất kỳ công thức tài chính nào trên trục X và Y để khám phá mối tương quan và phát hiện doanh nghiệp nổi bật.
        </p>
      </div>

      {/* ── Selectors Card ── */}
      <div className="card card-glow" style={{ padding: '28px 32px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink-900)' }}>
            Cấu hình trục
          </span>
        </div>

        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <MetricSelector label="Trục X" value={xMetric} onChange={setXMetric} />
          <MetricSelector label="Trục Y" value={yMetric} onChange={setYMetric} />
        </div>

        {/* legend */}
        <div style={{ display: 'flex', gap: 24, marginTop: 20, flexWrap: 'wrap' }}>
          {Object.entries(RISK_COLORS).map(([level, color]) => (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--ink-500)' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, display: 'inline-block' }} />
              {level}
            </div>
          ))}
        </div>
      </div>

      {/* ── Chart Card ── */}
      <div className="card card-glow" style={{ padding: '32px', marginBottom: '2rem' }}>
        <h2 className="chart-title" style={{
          fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink-900)', marginBottom: 24,
        }}>
          {metricLabelMap[xMetric]} &nbsp;×&nbsp; {metricLabelMap[yMetric]}
        </h2>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink-400)' }}>
            Đang tải dữ liệu…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={480}>
            <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis
                type="number"
                dataKey="x"
                name={metricLabelMap[xMetric]}
                tick={{ fill: 'var(--ink-500)', fontSize: 12 }}
                label={{
                  value: metricLabelMap[xMetric],
                  position: 'insideBottom', offset: -10,
                  fill: 'var(--ink-400)', fontSize: 13, fontWeight: 600,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={metricLabelMap[yMetric]}
                tick={{ fill: 'var(--ink-500)', fontSize: 12 }}
                label={{
                  value: metricLabelMap[yMetric],
                  angle: -90, position: 'insideLeft', offset: 0,
                  fill: 'var(--ink-400)', fontSize: 13, fontWeight: 600,
                }}
              />
              <ZAxis range={[80, 80]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '4 4' }} />
              <Scatter data={scatterData} isAnimationActive>
                {scatterData.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={RISK_COLORS[entry.risk_level] || '#999'}
                    fillOpacity={0.85}
                    stroke={RISK_COLORS[entry.risk_level] || '#999'}
                    strokeWidth={1}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Outliers / Phát hiện nổi bật ── */}
      {!isLoading && outliers.length > 0 && (
        <div className="card card-glow" style={{ padding: '28px 32px' }}>
          <h2 style={{
            fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink-900)', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
             Phát hiện nổi bật
          </h2>
          <p style={{ color: 'var(--ink-500)', fontSize: '0.9rem', marginBottom: 20 }}>
            Top 3 doanh nghiệp có giá trị <strong>{metricLabelMap[yMetric]}</strong> lệch xa nhất so với trung bình trên trục Y.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {outliers.map((o, idx) => (
              <div
                key={o.ticker}
                className="table-row-hover"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-lg, 12px)',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.45)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.85rem',
                    background: idx === 0 ? 'linear-gradient(135deg, var(--teal-500), #06b6d4)'
                               : 'rgba(0,0,0,0.06)',
                    color: idx === 0 ? '#fff' : 'var(--ink-500)',
                  }}>
                    {idx + 1}
                  </span>

                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--ink-900)', fontSize: '0.95rem' }}>
                      <RiskDot level={o.risk_level} />
                      {o.ticker}
                      <span style={{ fontWeight: 400, color: 'var(--ink-400)', marginLeft: 8, fontSize: '0.85rem' }}>
                        {o.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--ink-900)', fontSize: '1rem' }}>
                    {fmt(o.y, yMetric)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-400)' }}>
                    Độ lệch: {fmt(o.deviation, yMetric)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomChart;
