import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';

const ScoreGauge = ({ score = 0, riskLevel = 'Thấp' }) => {
  const safeScore = typeof score === 'number' && !isNaN(score) ? score : 0;
  const safeRiskLevel = typeof riskLevel === 'string' ? riskLevel : String(riskLevel || 'Thấp');
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800; // ms
    const increment = safeScore / (duration / 16); // 60fps
    
    if (safeScore === 0) {
      setAnimatedScore(0);
      return;
    }

    const timer = setInterval(() => {
      start += increment;
      if (start >= safeScore) {
        setAnimatedScore(safeScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [safeScore]);

  const data = [
    { name: 'Score', value: animatedScore },
    { name: 'Remainder', value: Math.max(0, 100 - animatedScore) },
  ];

  let fillColors;
  if (safeScore < 5) fillColors = ['var(--success)', 'transparent'];
  else if (safeScore < 15) fillColors = ['var(--warning)', 'transparent'];
  else fillColors = ['var(--danger)', 'transparent'];

  let badgeClass = '';
  let BadgeIcon = null;
  if (safeScore < 5) { badgeClass = 'badge-low'; BadgeIcon = CheckCircle; }
  else if (safeScore < 15) { badgeClass = 'badge-medium'; BadgeIcon = AlertTriangle; }
  else { badgeClass = 'badge-high'; BadgeIcon = AlertOctagon; }

  return (
    <div className="card chart-card card-glow" style={{ width: '100%', minWidth: '320px', padding: '32px' }}>
      <h3 className="chart-title">Xác suất vỡ nợ dự báo (PD)</h3>
      
      <div style={{ position: 'relative', width: '280px', height: '180px', margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '240px',
          height: '120px',
          borderTopLeftRadius: '120px',
          borderTopRightRadius: '120px',
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          zIndex: 0
        }}></div>

        <div style={{ width: '280px', height: '280px', position: 'absolute', top: 0, zIndex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                startAngle={180}
                endAngle={0}
                innerRadius={90}
                outerRadius={120}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
                cornerRadius={safeScore === 0 || safeScore === 100 ? 0 : 4}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={fillColors[index]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ width: '280px', height: '280px', position: 'absolute', top: 0, zIndex: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[{value: 100}]}
                cx="50%"
                cy="50%"
                startAngle={180}
                endAngle={0}
                innerRadius={90}
                outerRadius={120}
                dataKey="value"
                stroke="none"
                fill="rgba(0, 0, 0, 0.05)"
                isAnimationActive={false}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{
          position: 'absolute', 
          bottom: '10px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          textAlign: 'center',
          zIndex: 2
        }}>
          <div style={{fontSize: '2.5rem', fontWeight: 800, color: 'var(--ink-900)', lineHeight: 1}}>
            {(typeof animatedScore === 'number' && !isNaN(animatedScore) ? animatedScore : 0).toFixed(1)}%
          </div>
        </div>
      </div>
      
      <div style={{marginTop: '1.5rem', zIndex: 2}}>
        <div className={badgeClass}>
          {BadgeIcon && <BadgeIcon size={16} />}
          <span>MỨC RỦI RO: {safeRiskLevel.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};

export default ScoreGauge;
