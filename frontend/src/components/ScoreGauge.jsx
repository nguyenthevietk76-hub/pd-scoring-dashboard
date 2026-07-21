import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';

const ScoreGauge = ({ score, riskLevel }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800; // ms
    const increment = score / (duration / 16); // 60fps
    
    if (score === 0) {
      setAnimatedScore(0);
      return;
    }

    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [score]);

  // Convert 0-100 score to 0-180 degrees for half circle
  const data = [
    { name: 'Score', value: animatedScore },
    { name: 'Remainder', value: 100 - animatedScore },
  ];

  // Colors based on thresholds
  let fillColors;
  if (score < 5) fillColors = ['var(--success)', 'transparent'];
  else if (score < 15) fillColors = ['var(--warning)', 'transparent'];
  else fillColors = ['var(--danger)', 'transparent'];

  let badgeClass = '';
  let BadgeIcon = null;
  if (score < 5) { badgeClass = 'badge-low'; BadgeIcon = CheckCircle; }
  else if (score < 15) { badgeClass = 'badge-medium'; BadgeIcon = AlertTriangle; }
  else { badgeClass = 'badge-high'; BadgeIcon = AlertOctagon; }

  return (
    <div className="card chart-card card-glow" style={{ width: '100%', minWidth: '320px', padding: '32px' }}>
      <h3 className="chart-title">Xác suất vỡ nợ dự báo (PD)</h3>
      
      {/* Container for gauge and background circle */}
      <div style={{ position: 'relative', width: '280px', height: '180px', margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
        
        {/* Background Circle for depth */}
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
                isAnimationActive={false} // We handle animation manually for the number and gauge
                cornerRadius={score === 0 || score === 100 ? 0 : 4}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={fillColors[index]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Fake track to show remainder nicely if needed, or just let 'transparent' work.
            Actually, let's use a solid track for the remainder instead of transparent for a better look. */}
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
            {animatedScore.toFixed(1)}%
          </div>
        </div>
      </div>
      
      <div style={{marginTop: '1.5rem', zIndex: 2}}>
        <div className={badgeClass}>
          {BadgeIcon && <BadgeIcon size={16} />}
          <span>MỨC RỦI RO: {riskLevel.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};

export default ScoreGauge;
