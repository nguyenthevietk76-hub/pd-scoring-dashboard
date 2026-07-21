import { useState } from 'react';

import { API_BASE_URL } from '../config';

const QUICK_QUERIES = [
  {
    label: 'Top 10 DN rủi ro cao',
    query: `SELECT ticker, revenue, net_income, total_assets, label_distress FROM companies ORDER BY label_distress DESC, revenue ASC LIMIT 10`,
  },
  {
    label: 'Trung bình theo ngành',
    query: `SELECT ticker, AVG(revenue) as avg_revenue, AVG(total_assets) as avg_total_assets FROM companies GROUP BY ticker LIMIT 20`,
  },
  {
    label: 'DN doanh thu > 1000 tỷ',
    query: `SELECT ticker, year, quarter, revenue, net_income FROM companies WHERE revenue > 1000000000000 ORDER BY revenue DESC LIMIT 20`,
  },
  {
    label: 'Tỷ lệ nợ cao',
    query: `SELECT ticker, year, quarter, total_liabilities, total_assets, CAST(total_liabilities AS FLOAT) / total_assets as debt_ratio FROM companies WHERE total_assets > 0 ORDER BY debt_ratio DESC LIMIT 15`,
  },
];

const SCHEMA_COLUMNS = [
  { name: 'ticker', type: 'TEXT', desc: 'Mã chứng khoán' },
  { name: 'year', type: 'INT', desc: 'Năm tài chính' },
  { name: 'quarter', type: 'INT', desc: 'Quý (1–4)' },
  { name: 'revenue', type: 'FLOAT', desc: 'Doanh thu thuần' },
  { name: 'net_income', type: 'FLOAT', desc: 'Lợi nhuận ròng' },
  { name: 'ebit', type: 'FLOAT', desc: 'Thu nhập trước lãi & thuế' },
  { name: 'depreciation_amortization', type: 'FLOAT', desc: 'Khấu hao' },
  { name: 'current_assets', type: 'FLOAT', desc: 'Tài sản ngắn hạn' },
  { name: 'current_liabilities', type: 'FLOAT', desc: 'Nợ ngắn hạn' },
  { name: 'total_assets', type: 'FLOAT', desc: 'Tổng tài sản' },
  { name: 'total_liabilities', type: 'FLOAT', desc: 'Tổng nợ phải trả' },
  { name: 'total_equity', type: 'FLOAT', desc: 'Vốn chủ sở hữu' },
  { name: 'long_term_debt', type: 'FLOAT', desc: 'Nợ dài hạn' },
  { name: 'operating_cash_flow', type: 'FLOAT', desc: 'Dòng tiền hoạt động' },
  { name: 'cash_and_equiv', type: 'FLOAT', desc: 'Tiền & tương đương tiền' },
  { name: 'inventory', type: 'FLOAT', desc: 'Hàng tồn kho' },
  { name: 'retained_earnings', type: 'FLOAT', desc: 'Lợi nhuận giữ lại' },
  { name: 'label_distress', type: 'INT', desc: 'Nhãn kiệt quệ (0/1)' },
];

const SqlExplorer = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSchema, setShowSchema] = useState(false);

  const handleExecute = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Lỗi không xác định từ máy chủ.');
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl/Cmd + Enter to execute
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
    // Tab inserts spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newQuery = query.substring(0, start) + '  ' + query.substring(end);
      setQuery(newQuery);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const columns = results && results.length > 0 ? Object.keys(results[0]) : [];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            }}
          >
            
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>
              SQL Explorer
            </h1>
            <p style={{ color: 'var(--ink-500)', fontSize: '0.95rem', margin: 0 }}>
              Truy vấn trực tiếp vào cơ sở dữ liệu tài chính...
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick Query Chips ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Truy vấn nhanh
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {QUICK_QUERIES.map((qq, i) => (
            <button
              key={i}
              onClick={() => setQuery(qq.query)}
              style={{
                background: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 999,
                padding: '8px 18px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--ink-900)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(2,132,199,0.3)';
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(2,132,199,0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {qq.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SQL Editor ── */}
      <div className="card card-glow" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        {/* Editor Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(15,23,42,0.95)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            </div>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontFamily: "Consolas, 'Courier New', monospace", marginLeft: 8 }}>
              query.sql
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: "Consolas, 'Courier New', monospace" }}>
              Ctrl + Enter để thực thi
            </span>
          </div>
        </div>

        {/* Code Textarea */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 48,
              height: '100%',
              background: 'rgba(15,23,42,0.6)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              paddingTop: 20,
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {(query || ' ').split('\n').map((_, i) => (
              <span
                key={i}
                style={{
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontFamily: "Consolas, 'Courier New', monospace",
                  lineHeight: '1.65',
                  userSelect: 'none',
                }}
              >
                {i + 1}
              </span>
            ))}
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="-- Nhập câu lệnh SQL tại đây...&#10;SELECT * FROM companies LIMIT 10;"
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: 160,
              background: '#1e293b',
              color: '#e2e8f0',
              border: 'none',
              outline: 'none',
              padding: '20px 20px 20px 60px',
              fontFamily: "Consolas, 'Courier New', monospace",
              fontSize: '0.9rem',
              lineHeight: '1.65',
              resize: 'vertical',
              caretColor: '#38bdf8',
              letterSpacing: '0.02em',
            }}
          />
        </div>

        {/* Editor Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            background: 'rgba(15,23,42,0.95)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              
              <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: "Consolas, 'Courier New', monospace" }}>
                companies
              </span>
            </div>
            <span style={{ color: '#334155', fontSize: '0.75rem' }}>|</span>
            <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: "Consolas, 'Courier New', monospace" }}>
              {query.length} ký tự
            </span>
          </div>
          <button
            className="btn-primary"
            onClick={handleExecute}
            disabled={isLoading || !query.trim()}
            style={{ padding: '8px 24px', fontSize: '0.9rem' }}
          >
            {isLoading ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.25)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'sql-spin 0.7s linear infinite',
                  }}
                />
                Đang thực thi...
              </>
            ) : (
              <>
                
                Thực thi truy vấn
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Schema Reference ── */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          padding: 0,
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setShowSchema(!showSchema)}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Schema Reference</span>
            <span
              style={{
                background: 'var(--teal-50)',
                color: 'var(--teal-500)',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 999,
                border: '1px solid rgba(2,132,199,0.15)',
              }}
            >
              {SCHEMA_COLUMNS.length} cột
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--teal-600)', cursor: 'pointer' }}>
            {showSchema ? '▲ Thu gọn' : '▼ Xem chi tiết'}
          </div>
        </div>

        {showSchema && (
          <div
            style={{ padding: '0 24px 20px', borderTop: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 8,
                paddingTop: 16,
              }}
            >
              {SCHEMA_COLUMNS.map((col) => (
                <div
                  key={col.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'rgba(0,0,0,0.015)',
                    border: '1px solid rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(2,132,199,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(2,132,199,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.015)';
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.04)';
                  }}
                >
                  <code
                    style={{
                      fontFamily: "Consolas, 'Courier New', monospace",
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--teal-500)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.name}
                  </code>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: '#94a3b8',
                      background: 'rgba(0,0,0,0.04)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      fontFamily: "Consolas, 'Courier New', monospace",
                    }}
                  >
                    {col.type}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-500)', marginLeft: 'auto' }}>
                    {col.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Error Alert ── */}
      {error && (
        <div
          style={{
            background: 'var(--danger-bg)',
            border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            color: 'var(--danger)',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}></span>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Lỗi truy vấn</div>
            <div style={{ fontWeight: 500, opacity: 0.9, fontFamily: "Consolas, 'Courier New', monospace", fontSize: '0.82rem' }}>
              {error}
            </div>
          </div>
        </div>
      )}

      {/* ── Loading State ── */}
      {isLoading && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', marginBottom: 24 }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid rgba(2,132,199,0.15)',
              borderTopColor: 'var(--teal-500)',
              borderRadius: '50%',
              animation: 'sql-spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: 'var(--ink-500)', fontWeight: 600 }}>Đang thực thi truy vấn...</p>
        </div>
      )}

      {/* ── Results Table ── */}
      {results && !isLoading && (
        <div className="card card-glow" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Results Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Kết quả truy vấn</span>
            </div>
            <span
              style={{
                background: 'var(--success-bg)',
                color: 'var(--success)',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '4px 14px',
                borderRadius: 999,
                border: '1px solid rgba(22,163,74,0.2)',
              }}
            >
              {results.length} dòng
            </span>
          </div>

          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--ink-500)' }}>
              
              <p style={{ fontWeight: 600 }}>Không có dữ liệu trả về.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'center', color: '#94a3b8' }}>#</th>
                    {columns.map((col) => (
                      <th key={col} style={{ whiteSpace: 'nowrap' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, idx) => (
                    <tr key={idx} className="table-row-hover">
                      <td
                        style={{
                          textAlign: 'center',
                          color: '#94a3b8',
                          fontSize: '0.8rem',
                          fontFamily: "Consolas, 'Courier New', monospace",
                        }}
                      >
                        {idx + 1}
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col}
                          style={{
                            whiteSpace: 'nowrap',
                            fontFamily:
                              typeof row[col] === 'number'
                                ? "Consolas, 'Courier New', monospace"
                                : 'inherit',
                            fontSize: '0.9rem',
                          }}
                        >
                          {row[col] !== null && row[col] !== undefined
                            ? typeof row[col] === 'number'
                              ? row[col].toLocaleString('vi-VN')
                              : String(row[col])
                            : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Spinner Keyframes ── */}
      <style>{`
        @keyframes sql-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SqlExplorer;
