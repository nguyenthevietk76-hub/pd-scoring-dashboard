import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const FeatureContributionChart = ({ topFactors = [] }) => {
  // Chuẩn bị data cho biểu đồ với kiểm tra an toàn
  const safeFactors = Array.isArray(topFactors) ? topFactors : [];
  const data = safeFactors.map(factor => ({
    name: factor?.label_vi || factor?.feature || 'Chỉ số',
    displayVal: factor?.display_val ?? factor?.raw_val ?? factor?.raw_value ?? '',
    contribution: typeof factor?.contribution === 'number' ? factor.contribution : 0
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const isPositive = payload[0].value > 0;
      return (
        <div style={{background: 'rgba(11, 15, 25, 0.95)', backdropFilter: 'blur(8px)', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3)', fontSize: '0.875rem'}}>
          <p style={{fontWeight: 600, color: 'var(--ink-900)', marginBottom: '5px'}}>{payload[0].payload.name}</p>
          <p style={{color: 'var(--ink-500)', marginBottom: '8px'}}>Giá trị hiện tại: {payload[0].payload.displayVal}</p>
          <p style={{color: isPositive ? 'var(--danger)' : 'var(--success)', fontWeight: 500}}>
            Tác động: {isPositive ? '+' : ''}{payload[0].value.toFixed(2)} 
            {isPositive ? ' (Tăng rủi ro)' : ' (Giảm rủi ro)'}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom Y-Axis tick to show label and value
  const CustomYAxisTick = (props) => {
    const { x, y, payload } = props;
    const factor = data.find(d => d.name === payload.value);
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={-8} dy={0} textAnchor="end" fill="var(--ink-900)" fontSize={13} fontWeight={500}>
          {payload.value}
        </text>
        <text x={0} y={10} dy={0} textAnchor="end" fill="var(--ink-500)" fontSize={12}>
          {factor ? factor.displayVal : ''}
        </text>
      </g>
    );
  };

  const chartHeight = Math.max(250, data.length * 70 + 40);

  return (
    <div className="card chart-card card-glow">
      <h3 className="chart-title">Các yếu tố ảnh hưởng chính đến điểm rủi ro</h3>
      <div style={{ width: '100%', height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 10, right: 30, left: 160, bottom: 5 }}
            barSize={24}
          >
            <defs>
              <linearGradient id="colorPos" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FCA5A5" />
                <stop offset="100%" stopColor="var(--danger)" />
              </linearGradient>
              <linearGradient id="colorNeg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6EE7B7" />
                <stop offset="100%" stopColor="var(--success)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border-color)" />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              tick={<CustomYAxisTick />}
              width={150}
            />
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'var(--surface)'}} />
            <Bar dataKey="contribution" radius={[0, 6, 6, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.contribution > 0 ? 'url(#colorPos)' : 'url(#colorNeg)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FeatureContributionChart;
