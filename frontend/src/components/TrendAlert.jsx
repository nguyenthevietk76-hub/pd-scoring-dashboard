import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { AlertTriangle, AlertCircle } from 'lucide-react';

const TrendAlert = ({ pdScores4Q }) => {
  const safeScores = Array.isArray(pdScores4Q) && pdScores4Q.length >= 4 
    ? pdScores4Q 
    : [0, 0, 0, 0];

  // Chuẩn bị data: Q-3, Q-2, Q-1, Q-Current
  const data = safeScores.map((score, index) => {
    let label = '';
    if (index === 3) label = 'Hiện tại';
    else label = `Q-${3 - index}`;
    
    return {
      name: label,
      score: typeof score === 'number' && !isNaN(score) ? score : 0
    };
  });

  const currentScore = typeof safeScores[3] === 'number' && !isNaN(safeScores[3]) ? safeScores[3] : 0;
  const prevScore = typeof safeScores[2] === 'number' && !isNaN(safeScores[2]) ? safeScores[2] : 0;
  
  // Logic hiển thị cảnh báo
  const diff = currentScore - prevScore;
  const isSuddenIncrease = diff > 15;
  const isHighRisk = currentScore > 15;

  const CustomTooltip = ({ active, payload }) => {
    if (active && Array.isArray(payload) && payload.length > 0 && payload[0]) {
      const val = typeof payload[0].value === 'number' && !isNaN(payload[0].value) ? payload[0].value : 0;
      const name = payload[0].payload?.name || '';
      return (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '12px', 
          border: '1px solid rgba(0, 0, 0, 0.08)', 
          borderRadius: '8px', 
          fontSize: '0.875rem',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
          color: 'var(--ink-900)'
        }}>
          <p style={{ fontWeight: 600, color: 'var(--ink-900)', marginBottom: '5px' }}>{name}</p>
          <p style={{ color: 'var(--danger)', fontWeight: 700 }}>PD: {val.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const safeCurrentScore = typeof currentScore === 'number' && !isNaN(currentScore) ? currentScore : 0;
  const safeDiff = typeof diff === 'number' && !isNaN(diff) ? diff : 0;

  return (
    <div className="card chart-card card-glow" style={{ width: '100%' }}>
      <h3 className="chart-title">Biến động PD 4 quý gần nhất</h3>
      
      {/* Banner cảnh báo */}
      {isHighRisk && (
        <div className="alert-banner danger" style={{ width: '100%', marginBottom: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.12)' }}>
          <AlertCircle size={20} />
          <span style={{ color: '#b91c1c', fontWeight: 600 }}> Cảnh báo: Xác suất vỡ nợ hiện tại đang ở mức cao nguy hiểm ({safeCurrentScore.toFixed(1)}%).</span>
        </div>
      )}
      
      {isSuddenIncrease && !isHighRisk && (
        <div className="alert-banner warning" style={{ width: '100%', marginBottom: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.12)' }}>
          <AlertTriangle size={20} />
          <span style={{ color: '#b45309', fontWeight: 600 }}>️ Cảnh báo: Điểm rủi ro tăng vọt (+{safeDiff.toFixed(1)}%) so với quý liền trước.</span>
        </div>
      )}

      <div style={{ width: '100%', height: 200, marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--ink-500)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: 'var(--ink-500)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={15} stroke="var(--danger)" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Ngưỡng rủi ro (15%)', fill: 'var(--danger)', fontSize: 10, fontWeight: 600 }} />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="var(--teal-500)" 
              strokeWidth={3}
              activeDot={{ r: 6, fill: 'var(--teal-500)', stroke: '#ffffff', strokeWidth: 2 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendAlert;
