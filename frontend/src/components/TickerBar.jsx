import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react';
import demoData from '../demoData.json';
import { API_BASE_URL } from '../config';

const TickerBar = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/companies`)
      .then(res => res.json())
      .then(data => {
        setCompanies(data.companies || []);
      })
      .catch(err => {
        console.warn('FastAPI backend not running, falling back to static demoData:', err);
        setCompanies(demoData.companies || []);
      });
  }, []);

  const handleTickerClick = () => {
    navigate('/portfolio');
  };

  const getRiskIcon = (level) => {
    if (level === 'Cao') return <AlertOctagon size={12} color="var(--danger)" />;
    if (level === 'Trung bình') return <AlertTriangle size={12} color="var(--warning)" />;
    return <CheckCircle size={12} color="var(--success)" />;
  };

  const getRiskColor = (level) => {
    if (level === 'Cao') return 'var(--danger)';
    if (level === 'Trung bình') return 'var(--warning)';
    return 'var(--success)';
  };

  // We want to duplicate the list to make the marquee seamless
  const displayCompanies = [...companies, ...companies];

  return (
    <div style={{
      width: '100%',
      height: '48px',
      backgroundColor: 'var(--bg-sidebar)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div className="marquee-container" style={{ display: 'flex', whiteSpace: 'nowrap' }}>
        {displayCompanies.map((company, index) => (
          <div 
            key={index} 
            className="ticker-item"
            onClick={handleTickerClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0 1.5rem',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              borderRight: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <span style={{ color: 'var(--teal-500)' }}>{company.ticker}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>PD:</span>
            <span style={{ color: getRiskColor(company.risk_level) }}>{company.current_pd.toFixed(1)}%</span>
            {getRiskIcon(company.risk_level)}
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-container {
          animation: scroll 120s linear infinite;
        }
        .marquee-container:hover {
          animation-play-state: paused;
        }
        .ticker-item:hover {
          background-color: rgba(255,255,255,0.05);
        }
      `}} />
    </div>
  );
};

export default TickerBar;
