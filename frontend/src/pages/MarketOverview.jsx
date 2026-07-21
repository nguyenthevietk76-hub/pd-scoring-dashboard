import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, AlertTriangle, AlertOctagon, ShieldCheck } from 'lucide-react';
import demoData from '../demoData.json';
import { API_BASE_URL } from '../config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';


const MarketOverview = () => {
  const navigate = useNavigate();
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

  const totalCompanies = companies.length;
  const highRisk = companies.filter(c => c.risk_level === 'Cao');
  const mediumRisk = companies.filter(c => c.risk_level === 'Trung bình');
  const lowRisk = companies.filter(c => c.risk_level === 'Thấp');

  // Sector average PD
  const sectorData = {};
  companies.forEach(c => {
    const sec = c.sector || 'Khác';
    if (!sectorData[sec]) {
      sectorData[sec] = { count: 0, sum: 0 };
    }
    sectorData[sec].count += 1;
    sectorData[sec].sum += c.current_pd;
  });

  const chartSectorData = Object.keys(sectorData).map(sec => ({
    name: sec,
    avgPD: Math.round((sectorData[sec].sum / sectorData[sec].count) * 100) / 100
  })).sort((a, b) => b.avgPD - a.avgPD);

  // Risk Level distribution for Pie Chart
  const pieData = [
    { name: 'Rủi ro Cao', value: highRisk.length, color: 'var(--danger, #ef4444)' },
    { name: 'Rủi ro Trung bình', value: mediumRisk.length, color: 'var(--warning, #f59e0b)' },
    { name: 'Rủi ro Thấp', value: lowRisk.length, color: 'var(--success, #10b981)' }
  ];

  // Top 5 highest PD
  const topRisky = [...companies]
    .sort((a, b) => b.current_pd - a.current_pd)
    .slice(0, 5);

  const getRiskBadge = (level) => {
    switch(level) {
      case 'Thấp': 
        return <div className="badge-low" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}> Thấp</div>;
      case 'Trung bình': 
        return <div className="badge-medium" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}> Trung bình</div>;
      case 'Cao': 
        return <div className="badge-high" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}> Cao</div>;
      default: return null;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--ink-900)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
        Tổng Quan Thị Trường
      </h1>
      <p style={{ color: 'var(--ink-500)', marginBottom: '2.5rem', fontSize: '1.125rem' }}>
        Phân tích tổng quan mức độ rủi ro tín dụng và Xác suất Vỡ nợ (PD) của doanh nghiệp niêm yết trên thị trường.
      </p>

      {/* Stats Cards */}
      <div className="stagger-enter" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card card-glow" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: 'var(--teal-500)', padding: '16px', borderRadius: '16px' }}>
            <Building2 size={32} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theo dõi</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink-900)', marginTop: '4px' }}>{totalCompanies} Doanh nghiệp</div>
          </div>
        </div>

        <div className="card card-glow" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '16px' }}>
            <AlertOctagon size={32} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rủi ro cao</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink-900)', marginTop: '4px' }}>{highRisk.length} Doanh nghiệp</div>
          </div>
        </div>

        <div className="card card-glow" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '16px', borderRadius: '16px' }}>
            <AlertTriangle size={32} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rủi ro trung bình</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink-900)', marginTop: '4px' }}>{mediumRisk.length} Doanh nghiệp</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="stagger-enter" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* Risk Distribution Pie Chart */}
        <div className="card card-glow" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="chart-title" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Phân bổ Rủi ro Thị trường
          </h3>
          <div style={{ width: '100%', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: '1px solid var(--border-color)', color: '#000' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '1rem' }}>
            {pieData.map((entry, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 600 }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: entry.color }}></span>
                <span>{entry.name}: {entry.value} ({Math.round(entry.value / totalCompanies * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sector average PD Bar Chart */}
        <div className="card card-glow" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="chart-title" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Xác suất Vỡ nợ (PD) Trung bình theo Ngành
          </h3>
          <div style={{ width: '100%', height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartSectorData}
                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                <YAxis label={{ value: 'PD (%)', angle: -90, position: 'insideLeft', offset: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: '1px solid var(--border-color)', color: '#000' }}
                />
                <Bar dataKey="avgPD" fill="var(--teal-500, #0284c7)" radius={[4, 4, 0, 0]}>
                  {chartSectorData.map((entry, index) => {
                    let color = 'var(--success, #10b981)';
                    if (entry.avgPD > 50) color = 'var(--danger, #ef4444)';
                    else if (entry.avgPD > 20) color = 'var(--warning, #f59e0b)';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 5 highest risk Table */}
      <div className="card card-glow" style={{ padding: '32px 24px', marginBottom: '2rem' }}>
        <h3 className="chart-title" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Top 5 Doanh nghiệp có Rủi ro Cao nhất
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-companies" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--ink-500)', fontSize: '0.875rem' }}>Mã CP</th>
                <th style={{ padding: '12px 16px', color: 'var(--ink-500)', fontSize: '0.875rem' }}>Tên doanh nghiệp</th>
                <th style={{ padding: '12px 16px', color: 'var(--ink-500)', fontSize: '0.875rem' }}>Ngành nghề</th>
                <th style={{ padding: '12px 16px', color: 'var(--ink-500)', fontSize: '0.875rem', textAlign: 'right' }}>PD Score</th>
                <th style={{ padding: '12px 16px', color: 'var(--ink-500)', fontSize: '0.875rem', textAlign: 'center' }}>Nhóm rủi ro</th>
              </tr>
            </thead>
            <tbody>
              {topRisky.map((company, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => navigate('/pd-scoring', { state: { selectedTicker: company.ticker } })}
                  style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  className="table-row-hover"
                >
                  <td style={{ padding: '16px', fontWeight: 800, color: 'var(--ink-900)' }}>{company.ticker}</td>
                  <td style={{ padding: '16px', fontWeight: 600, color: 'var(--ink-800)' }}>{company.name}</td>
                  <td style={{ padding: '16px', color: 'var(--ink-600)' }}>{company.sector}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 800, color: 'var(--danger)' }}>
                    {company.current_pd.toFixed(2)}%
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>{getRiskBadge(company.risk_level)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
