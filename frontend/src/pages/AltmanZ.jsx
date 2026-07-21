import { useState, useEffect, useContext } from 'react';
import { AnalysisContext } from '../context/AnalysisContext';


// Format number function (e.g. 1000000 -> 1,000,000)
const formatNumber = (val) => {
  if (val === null || val === undefined || val === '') return '';
  // Convert to string and remove all non-digit and non-minus chars
  const cleaned = val.toString().replace(/[^\d.-]/g, '');
  if (cleaned === '-' || cleaned === '') return cleaned;
  
  const parts = cleaned.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

const parseNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  return parseFloat(val.toString().replace(/,/g, ''));
};

const AltmanZ = () => {
  const { analysisContext } = useContext(AnalysisContext);
  
  const [companyType, setCompanyType] = useState('public_manufacturing');
  
  const [inputs, setInputs] = useState({
    name: '',
    workingCapital: '',
    retainedEarnings: '',
    ebit: '',
    marketEquity: '',
    revenue: '',
    totalAssets: '',
    totalLiabilities: ''
  });

  const [zScoreResult, setZScoreResult] = useState(null);

  // Pre-fill inputs if there's a selected company in context
  useEffect(() => {
    if (analysisContext) {
      // Simulate/approximate values based on total assets if present
      const assets = analysisContext.total_assets_b ? analysisContext.total_assets_b * 1000 : 5000; // in billions -> millions or scaled
      const isHighRisk = analysisContext.risk_level_vi === 'Cao';
      
      setInputs({
        name: analysisContext.company_name,
        workingCapital: formatNumber(Math.round(assets * (isHighRisk ? 0.05 : 0.25))),
        retainedEarnings: formatNumber(Math.round(assets * (isHighRisk ? 0.02 : 0.15))),
        ebit: formatNumber(Math.round(assets * (isHighRisk ? -0.02 : 0.12))),
        marketEquity: formatNumber(Math.round(assets * (isHighRisk ? 0.2 : 0.8))),
        revenue: formatNumber(Math.round(assets * 0.8)),
        totalAssets: formatNumber(Math.round(assets)),
        totalLiabilities: formatNumber(Math.round(assets * (isHighRisk ? 0.85 : 0.4)))
      });
    }
  }, [analysisContext]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'name') {
       setInputs(prev => ({ ...prev, [name]: value }));
       return;
    }

    // Allow typing "-" at the start
    if (value === '-') {
      setInputs(prev => ({ ...prev, [name]: '-' }));
      return;
    }

    const cleanValue = value.replace(/,/g, '');
    if (!isNaN(cleanValue) || cleanValue === '') {
       setInputs(prev => ({ ...prev, [name]: formatNumber(cleanValue) }));
    }
  };

  const calculateZScore = (e) => {
    e.preventDefault();
    const wc = parseNumber(inputs.workingCapital);
    const re = parseNumber(inputs.retainedEarnings);
    const ebit = parseNumber(inputs.ebit);
    const eq = parseNumber(inputs.marketEquity);
    const rev = companyType === 'service' ? 0 : parseNumber(inputs.revenue);
    const ta = parseNumber(inputs.totalAssets) || 1;
    const tl = parseNumber(inputs.totalLiabilities) || 1;

    // Ratios
    const X1 = wc / ta;
    const X2 = re / ta;
    const X3 = ebit / ta;
    const X4 = eq / tl;
    const X5 = companyType === 'service' ? 0 : (rev / ta);

    let zScore = 0;
    let zone = '';
    let zoneColor = '';
    let description = '';

    if (companyType === 'public_manufacturing') {
      zScore = 1.2 * X1 + 1.4 * X2 + 3.3 * X3 + 0.6 * X4 + 0.999 * X5;
      
      if (zScore > 2.99) {
        zone = 'Vùng an toàn';
        zoneColor = 'var(--success, #10b981)';
        description = 'Doanh nghiệp có tình hình tài chính vững mạnh, nguy cơ phá sản thấp.';
      } else if (zScore > 1.81) {
        zone = 'Vùng cảnh báo';
        zoneColor = 'var(--warning, #f59e0b)';
        description = 'Doanh nghiệp nằm trong vùng trung gian. Có dấu hiệu bất ổn định nhẹ hoặc rủi ro tài chính vừa phải, cần được theo dõi kỹ.';
      } else {
        zone = 'Nguy cơ phá sản cao';
        zoneColor = 'var(--danger, #ef4444)';
        description = 'Doanh nghiệp đối mặt với rủi ro tài chính cực kỳ cao. Khả năng xảy ra vỡ nợ hoặc phá sản là rất lớn trong ngắn hạn.';
      }
    } else if (companyType === 'private_manufacturing') {
      zScore = 0.717 * X1 + 0.847 * X2 + 3.107 * X3 + 0.420 * X4 + 0.998 * X5;

      if (zScore > 2.90) {
        zone = 'Vùng an toàn';
        zoneColor = 'var(--success, #10b981)';
        description = 'Doanh nghiệp có tình hình tài chính vững mạnh, nguy cơ phá sản thấp.';
      } else if (zScore > 1.23) {
        zone = 'Vùng cảnh báo';
        zoneColor = 'var(--warning, #f59e0b)';
        description = 'Doanh nghiệp nằm trong vùng trung gian. Có dấu hiệu bất ổn định nhẹ hoặc rủi ro tài chính vừa phải, cần được theo dõi kỹ.';
      } else {
        zone = 'Nguy cơ phá sản cao';
        zoneColor = 'var(--danger, #ef4444)';
        description = 'Doanh nghiệp đối mặt với rủi ro tài chính cực kỳ cao. Khả năng xảy ra vỡ nợ hoặc phá sản là rất lớn trong ngắn hạn.';
      }
    } else if (companyType === 'service') {
      zScore = 6.56 * X1 + 3.26 * X2 + 6.72 * X3 + 1.05 * X4;

      if (zScore > 2.60) {
        zone = 'Vùng an toàn';
        zoneColor = 'var(--success, #10b981)';
        description = 'Doanh nghiệp có tình hình tài chính vững mạnh, nguy cơ phá sản thấp.';
      } else if (zScore > 1.10) {
        zone = 'Vùng cảnh báo';
        zoneColor = 'var(--warning, #f59e0b)';
        description = 'Doanh nghiệp nằm trong vùng trung gian. Có dấu hiệu bất ổn định nhẹ hoặc rủi ro tài chính vừa phải, cần được theo dõi kỹ.';
      } else {
        zone = 'Nguy cơ phá sản cao';
        zoneColor = 'var(--danger, #ef4444)';
        description = 'Doanh nghiệp đối mặt với rủi ro tài chính cực kỳ cao. Khả năng xảy ra vỡ nợ hoặc phá sản là rất lớn trong ngắn hạn.';
      }
    }

    setZScoreResult({
      score: zScore.toFixed(2),
      X1: X1.toFixed(3),
      X2: X2.toFixed(3),
      X3: X3.toFixed(3),
      X4: X4.toFixed(3),
      X5: companyType === 'service' ? 'N/A' : X5.toFixed(3),
      zone,
      zoneColor,
      description
    });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--ink-900)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
        Mô Hình Điểm Số Altman Z-Score
      </h1>
      <p style={{ color: 'var(--ink-500)', marginBottom: '2.5rem', fontSize: '1.125rem' }}>
        Công cụ tính điểm và so sánh Altman Z-Score để phân loại mức độ rủi ro tín dụng và nguy cơ phá sản của doanh nghiệp.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {/* Form Input */}
        <div className="card card-glow" style={{ padding: '32px 24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            
            Tham Số Tài Chính {inputs.name ? `(${inputs.name})` : ''}
          </h3>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink-800)', display: 'block', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
               Loại hình doanh nghiệp
            </label>
            <select 
              value={companyType}
              onChange={(e) => {
                setCompanyType(e.target.value);
                setZScoreResult(null); // Reset result when changing model
              }}
              className="input-pill"
              style={{ width: '100%', padding: '12px 16px', fontWeight: 600, cursor: 'pointer', backgroundColor: 'var(--bg-card)' }}
            >
              <option value="public_manufacturing">Sản xuất (Đã niêm yết) - Z-Score</option>
              <option value="private_manufacturing">Sản xuất (Chưa niêm yết) - Z'-Score</option>
              <option value="service">Thương mại / Dịch vụ / Khác - Z''-Score</option>
            </select>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--ink-700)' }}>
            <strong>Lưu ý:</strong> Vui lòng nhập thống nhất <strong>cùng một đơn vị</strong> cho tất cả các trường (ví dụ: Triệu VNĐ hoặc Tỷ VNĐ). Hỗ trợ nhập số có dấu phẩy phân cách.
          </div>

          <form onSubmit={calculateZScore} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--ink-700)', display: 'block', marginBottom: '6px' }}>Vốn lưu động ròng (WC)</label>
                <input 
                  type="text" 
                  name="workingCapital"
                  value={inputs.workingCapital}
                  onChange={handleInputChange}
                  className="input-pill"
                  style={{ width: '100%', padding: '10px 16px' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--ink-700)', display: 'block', marginBottom: '6px' }}>Lợi nhuận giữ lại (RE)</label>
                <input 
                  type="text" 
                  name="retainedEarnings"
                  value={inputs.retainedEarnings}
                  onChange={handleInputChange}
                  className="input-pill"
                  style={{ width: '100%', padding: '10px 16px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--ink-700)', display: 'block', marginBottom: '6px' }}>Lợi nhuận trước thuế & lãi (EBIT)</label>
                <input 
                  type="text" 
                  name="ebit"
                  value={inputs.ebit}
                  onChange={handleInputChange}
                  className="input-pill"
                  style={{ width: '100%', padding: '10px 16px' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--ink-700)', display: 'block', marginBottom: '6px' }}>
                  {companyType === 'public_manufacturing' ? 'Vốn hóa thị trường' : 'Vốn chủ sở hữu (sổ sách)'} (Equity)
                </label>
                <input 
                  type="text" 
                  name="marketEquity"
                  value={inputs.marketEquity}
                  onChange={handleInputChange}
                  className="input-pill"
                  style={{ width: '100%', padding: '10px 16px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ opacity: companyType === 'service' ? 0.5 : 1 }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--ink-700)', display: 'block', marginBottom: '6px' }}>Doanh thu thuần (Sales)</label>
                <input 
                  type="text" 
                  name="revenue"
                  value={inputs.revenue}
                  onChange={handleInputChange}
                  className="input-pill"
                  style={{ width: '100%', padding: '10px 16px' }}
                  required={companyType !== 'service'}
                  disabled={companyType === 'service'}
                  placeholder={companyType === 'service' ? 'Không áp dụng' : ''}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--ink-700)', display: 'block', marginBottom: '6px' }}>Tổng tài sản (TA)</label>
                <input 
                  type="text" 
                  name="totalAssets"
                  value={inputs.totalAssets}
                  onChange={handleInputChange}
                  className="input-pill"
                  style={{ width: '100%', padding: '10px 16px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--ink-700)', display: 'block', marginBottom: '6px' }}>Nợ phải trả (Total Liabilities)</label>
              <input 
                type="text" 
                name="totalLiabilities"
                value={inputs.totalLiabilities}
                onChange={handleInputChange}
                className="input-pill"
                style={{ width: '100%', padding: '10px 16px' }}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary"
              style={{ padding: '12px', borderRadius: '999px', fontSize: '0.95rem', fontWeight: 700, marginTop: '0.5rem' }}
            >
              Tính Điểm Số Z-Score
            </button>
          </form>
        </div>

        {/* Results output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card card-glow" style={{ padding: '32px 24px', flex: 1 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Kết Quả Tính Điểm</h3>
            
            {!zScoreResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--ink-400)', textAlign: 'center', padding: '2rem' }}>
                
                Vui lòng điền các tham số tài chính bên trái và nhấn nút "Tính Điểm Số Z-Score" để xem phân tích.
              </div>
            ) : (
              <div>
                <div style={{ textAlign: 'center', padding: '1.5rem 0', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '3.5rem', fontWeight: 900, color: zScoreResult.zoneColor, fontFamily: "'Playfair Display', serif" }}>
                    {zScoreResult.score}
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: zScoreResult.zoneColor, marginTop: '8px' }}>
                    {zScoreResult.zone}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, color: 'var(--ink-800)', fontSize: '0.9rem', display: 'block' }}>Mô tả trạng thái:</span>
                    <p style={{ color: 'var(--ink-600)', margin: '4px 0 0 0', fontSize: '0.925rem', lineHeight: '1.5' }}>
                      {zScoreResult.description}
                    </p>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--ink-800)', fontSize: '0.9rem', display: 'block', marginBottom: '10px' }}>Chi tiết các hệ số:</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                      <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--ink-500)', display: 'block' }}>X1 (WC/TA)</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink-900)' }}>{zScoreResult.X1}</span>
                      </div>
                      <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--ink-500)', display: 'block' }}>X2 (RE/TA)</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink-900)' }}>{zScoreResult.X2}</span>
                      </div>
                      <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--ink-500)', display: 'block' }}>X3 (EBIT/TA)</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink-900)' }}>{zScoreResult.X3}</span>
                      </div>
                      <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--ink-500)', display: 'block' }}>X4 ({companyType === 'public_manufacturing' ? 'MktEq' : 'BookEq'}/TL)</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink-900)' }}>{zScoreResult.X4}</span>
                      </div>
                      <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', opacity: companyType === 'service' ? 0.4 : 1 }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--ink-500)', display: 'block' }}>X5 (Sales/TA)</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink-900)' }}>{zScoreResult.X5}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="card card-glow" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', color: 'var(--ink-900)' }}>Công thức tính điểm:</h4>
            
            {companyType === 'public_manufacturing' && (
              <p style={{ fontSize: '0.825rem', color: 'var(--ink-500)', margin: 0, lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--ink-700)' }}>Z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 0.999*X5</strong>
                <br/><br/>
                Trong đó:<br/>
                X1 = Vốn lưu động / Tổng tài sản<br/>
                X2 = Lợi nhuận giữ lại / Tổng tài sản<br/>
                X3 = EBIT / Tổng tài sản<br/>
                <strong style={{ color: 'var(--ink-700)' }}>X4 = Vốn hóa thị trường / Nợ phải trả</strong><br/>
                X5 = Doanh thu / Tổng tài sản
              </p>
            )}

            {companyType === 'private_manufacturing' && (
              <p style={{ fontSize: '0.825rem', color: 'var(--ink-500)', margin: 0, lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--ink-700)' }}>Z' = 0.717*X1 + 0.847*X2 + 3.107*X3 + 0.420*X4 + 0.998*X5</strong>
                <br/><br/>
                Trong đó:<br/>
                X1 = Vốn lưu động / Tổng tài sản<br/>
                X2 = Lợi nhuận giữ lại / Tổng tài sản<br/>
                X3 = EBIT / Tổng tài sản<br/>
                <strong style={{ color: 'var(--ink-700)' }}>X4 = Vốn chủ sở hữu (sổ sách) / Nợ phải trả</strong><br/>
                X5 = Doanh thu / Tổng tài sản
              </p>
            )}

            {companyType === 'service' && (
              <p style={{ fontSize: '0.825rem', color: 'var(--ink-500)', margin: 0, lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--ink-700)' }}>Z'' = 6.56*X1 + 3.26*X2 + 6.72*X3 + 1.05*X4</strong>
                <br/><br/>
                Trong đó:<br/>
                X1 = Vốn lưu động / Tổng tài sản<br/>
                X2 = Lợi nhuận giữ lại / Tổng tài sản<br/>
                X3 = EBIT / Tổng tài sản<br/>
                <strong style={{ color: 'var(--ink-700)' }}>X4 = Vốn chủ sở hữu (sổ sách) / Nợ phải trả</strong><br/>
                <em>(Mô hình này loại bỏ biến X5 - Doanh thu)</em>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AltmanZ;
