import { useState } from 'react';
import demoData from '../demoData.json';
import { Loader2 } from 'lucide-react';

const InputForm = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    taxCode: '',
    total_assets: '',
    current_liabilities: '',
    long_term_debt: '',
    revenue: '',
    operating_cash_flow: ''
  });

  const formatNumber = (val) => {
    if (!val && val !== 0) return '';
    const parts = val.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join('.');
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    // Remove commas for financial fields to store raw numbers
    if (!['name', 'taxCode'].includes(name)) {
      value = value.replace(/,/g, '');
      // Allow only digits, optional minus sign at start, and one decimal point
      value = value.replace(/[^\d.-]/g, '');
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleLoadDemo = () => {
    const companies = demoData.companies;
    const randomCompany = companies[Math.floor(Math.random() * companies.length)];
    
    if (onSubmit) {
      onSubmit(null, randomCompany); // Pass null for form input, and pass demo company directly
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.name.trim()) {
      alert("Vui lòng nhập Tên doanh nghiệp trước khi phân tích.");
      return;
    }

    const hasValues = [
      formData.total_assets,
      formData.revenue,
      formData.current_liabilities,
      formData.long_term_debt,
      formData.operating_cash_flow
    ].some(val => val !== '' && parseFloat(val) > 0);

    if (!hasValues) {
      alert("Vui lòng điền ít nhất một chỉ tiêu tài chính lớn hơn 0 (ví dụ: Tổng tài sản, Doanh thu) để thực hiện dự báo.");
      return;
    }

    if (onSubmit) onSubmit(formData, null);
  };

  return (
    <div className="card card-glow" style={{ padding: '40px' }}>
      <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.02em' }}>
        Nhập liệu báo cáo tài chính
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label style={{ color: 'var(--ink-500)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tên doanh nghiệp
            </label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="VD: Công ty Masan" 
              className="input-pill" 
            />
          </div>
          <div className="form-group">
            <label style={{ color: 'var(--ink-500)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Mã số thuế
            </label>
            <input 
              type="text" 
              name="taxCode" 
              value={formData.taxCode} 
              onChange={handleChange} 
              placeholder="VD: 0101234567" 
              className="input-pill" 
            />
          </div>
        </div>

        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', marginTop: '2rem', color: 'var(--teal-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Số liệu tài chính (Đơn vị: Tỷ VNĐ)
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label style={{ color: 'var(--ink-500)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tổng tài sản
            </label>
            <input 
              type="text" 
              name="total_assets" 
              value={formatNumber(formData.total_assets)} 
              onChange={handleChange} 
              className="input-pill" 
              placeholder="0.0"
            />
          </div>
          <div className="form-group">
            <label style={{ color: 'var(--ink-500)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Doanh thu
            </label>
            <input 
              type="text" 
              name="revenue" 
              value={formatNumber(formData.revenue)} 
              onChange={handleChange} 
              className="input-pill" 
              placeholder="0.0"
            />
          </div>
          <div className="form-group">
            <label style={{ color: 'var(--ink-500)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Nợ ngắn hạn
            </label>
            <input 
              type="text" 
              name="current_liabilities" 
              value={formatNumber(formData.current_liabilities)} 
              onChange={handleChange} 
              className="input-pill" 
              placeholder="0.0"
            />
          </div>
          <div className="form-group">
            <label style={{ color: 'var(--ink-500)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Nợ dài hạn
            </label>
            <input 
              type="text" 
              name="long_term_debt" 
              value={formatNumber(formData.long_term_debt)} 
              onChange={handleChange} 
              className="input-pill" 
              placeholder="0.0"
            />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label style={{ color: 'var(--ink-500)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dòng tiền từ HĐ kinh doanh (CFO)
            </label>
            <input 
              type="text" 
              name="operating_cash_flow" 
              value={formatNumber(formData.operating_cash_flow)} 
              onChange={handleChange} 
              className="input-pill" 
              placeholder="0.0"
            />
          </div>
        </div>

        <p className="disclaimer" style={{ marginTop: '1.5rem', color: 'var(--ink-500)', fontSize: '0.8rem', fontStyle: 'italic' }}>
          * 5 chỉ tiêu này được nhân với 10^9 (Tỷ VNĐ) khi gửi tới Backend; các chỉ tiêu còn lại sử dụng giá trị trung bình ngành để dự báo.
        </p>

        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '2.5rem' }}>
          <button type="submit" className="btn-primary" disabled={isLoading} style={{ minWidth: '150px' }}>
            {isLoading && <Loader2 size={16} className="lucide-spin" style={{ animation: 'spin 1s linear infinite' }} />}
            Phân tích ngay
          </button>
          <button type="button" className="btn-secondary" onClick={handleLoadDemo} disabled={isLoading}>
            Sử dụng dữ liệu mẫu
          </button>
        </div>
      </form>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default InputForm;
