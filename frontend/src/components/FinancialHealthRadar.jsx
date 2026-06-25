import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const FinancialHealthRadar = ({ metrics }) => {
  return (
    <div className="card chart-card card-glow" style={{ width: '100%', minWidth: '320px', padding: '32px' }}>
      <h3 className="chart-title">Đánh giá tài chính đa chiều</h3>
      <div style={{ width: '100%', height: '280px', marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={metrics}>
            <PolarGrid stroke="var(--border-color)" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: 'var(--ink-900)', fontSize: 12, fontWeight: 600 }} 
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ 
                background: 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '8px', 
                border: '1px solid rgba(0, 0, 0, 0.08)', 
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)' 
              }}
              itemStyle={{ color: 'var(--teal-500)', fontWeight: 700 }}
              labelStyle={{ color: 'var(--ink-500)', fontWeight: 500, marginBottom: '4px' }}
            />
            <Radar
              name="Điểm (1-100)"
              dataKey="A"
              stroke="var(--teal-500)"
              fill="var(--teal-500)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--ink-500)', marginTop: '1rem', fontStyle: 'italic', textAlign: 'center' }}>
        * Điểm càng sát rìa ngoài (100) sức khỏe tài chính càng vững mạnh.
      </p>
    </div>
  );
};

export default FinancialHealthRadar;
