import { useState, useMemo } from 'react';

import { Newspaper, TrendingUp } from 'lucide-react';
import demoData from '../demoData.json';

/* ───────────────────────── MOCK NEWS DATA ───────────────────────── */

const MOCK_NEWS = [
  {
    id: 1,
    title: 'FPT ghi nhận doanh thu quý II tăng 28% nhờ mảng chuyển đổi số',
    summary: 'Tập đoàn FPT công bố kết quả kinh doanh quý II với doanh thu đạt 15.200 tỷ đồng, tăng 28% so với cùng kỳ năm trước. Mảng dịch vụ CNTT và chuyển đổi số tiếp tục là động lực tăng trưởng chính.',
    source: 'VnExpress',
    publishedAt: '2026-06-25T08:30:00Z',
    relatedTicker: 'FPT',
    category: 'direct',
    sentiment: 'positive',
    sentimentScore: 85,
  },
  {
    id: 2,
    title: 'HPG: Sản lượng thép xây dựng tháng 5 giảm 12% do nhu cầu yếu',
    summary: 'Hòa Phát cho biết sản lượng thép xây dựng tiêu thụ trong tháng 5 giảm 12% so với tháng trước do thị trường bất động sản chưa phục hồi hoàn toàn, ảnh hưởng tới nhu cầu thép.',
    source: 'CafeF',
    publishedAt: '2026-06-24T10:15:00Z',
    relatedTicker: 'HPG',
    category: 'direct',
    sentiment: 'negative',
    sentimentScore: 25,
  },
  {
    id: 3,
    title: 'Ngành bất động sản kỳ vọng phục hồi mạnh nửa cuối năm 2026',
    summary: 'Theo báo cáo của CBRE Việt Nam, thị trường bất động sản đang có nhiều tín hiệu tích cực với nguồn cung mới tăng 35% và lãi suất cho vay giảm về mức hấp dẫn.',
    source: 'TBKTSG',
    publishedAt: '2026-06-24T14:00:00Z',
    relatedTicker: 'VIC',
    category: 'industry',
    sentiment: 'positive',
    sentimentScore: 78,
  },
  {
    id: 4,
    title: 'VNM: Biên lợi nhuận gộp cải thiện nhờ giá nguyên liệu giảm',
    summary: 'Vinamilk ghi nhận biên lợi nhuận gộp quý gần nhất đạt 46,5%, cải thiện đáng kể so với mức 42,8% cùng kỳ nhờ giá bột sữa và đường thế giới giảm mạnh.',
    source: 'VietStock',
    publishedAt: '2026-06-23T09:45:00Z',
    relatedTicker: 'VNM',
    category: 'direct',
    sentiment: 'positive',
    sentimentScore: 82,
  },
  {
    id: 5,
    title: 'NHNN giữ nguyên lãi suất điều hành, hỗ trợ doanh nghiệp',
    summary: 'Ngân hàng Nhà nước quyết định giữ nguyên các mức lãi suất điều hành, tạo điều kiện thuận lợi cho doanh nghiệp tiếp cận vốn vay với chi phí thấp trong bối cảnh phục hồi kinh tế.',
    source: 'VnExpress',
    publishedAt: '2026-06-23T07:00:00Z',
    relatedTicker: 'VCB',
    category: 'industry',
    sentiment: 'positive',
    sentimentScore: 72,
  },
  {
    id: 6,
    title: 'MWG đóng cửa thêm 15 cửa hàng Bách Hóa Xanh không hiệu quả',
    summary: 'Thế Giới Di Động tiếp tục tái cấu trúc chuỗi Bách Hóa Xanh bằng việc đóng thêm 15 cửa hàng có doanh thu thấp, nâng tổng số cửa hàng đóng từ đầu năm lên 52 điểm.',
    source: 'CafeF',
    publishedAt: '2026-06-22T16:30:00Z',
    relatedTicker: 'MWG',
    category: 'direct',
    sentiment: 'negative',
    sentimentScore: 30,
  },
  {
    id: 7,
    title: 'Xuất khẩu thủy sản 5 tháng đầu năm đạt 4,2 tỷ USD, tăng 18%',
    summary: 'Kim ngạch xuất khẩu thủy sản Việt Nam đạt 4,2 tỷ USD trong 5 tháng đầu năm 2026, tăng 18% so với cùng kỳ. Tôm và cá tra là hai mặt hàng chủ lực đóng góp lớn nhất.',
    source: 'TBKTSG',
    publishedAt: '2026-06-22T11:20:00Z',
    relatedTicker: 'ANV',
    category: 'industry',
    sentiment: 'positive',
    sentimentScore: 76,
  },
  {
    id: 8,
    title: 'GAS: Giá dầu biến động mạnh, ảnh hưởng kế hoạch lợi nhuận',
    summary: 'PV Gas cho biết giá dầu thô giảm 15% so với đầu năm đang tạo áp lực lên doanh thu mảng khí khô, có thể ảnh hưởng tới việc hoàn thành kế hoạch lợi nhuận cả năm.',
    source: 'VietStock',
    publishedAt: '2026-06-21T13:00:00Z',
    relatedTicker: 'GAS',
    category: 'direct',
    sentiment: 'negative',
    sentimentScore: 32,
  },
  {
    id: 9,
    title: 'VIC triển khai đại đô thị Vinhomes Grand Park giai đoạn 3',
    summary: 'Vingroup chính thức khởi công giai đoạn 3 của dự án Vinhomes Grand Park với quy mô đầu tư gần 25.000 tỷ đồng, dự kiến cung cấp thêm 8.000 căn hộ ra thị trường.',
    source: 'VnExpress',
    publishedAt: '2026-06-21T08:45:00Z',
    relatedTicker: 'VIC',
    category: 'direct',
    sentiment: 'positive',
    sentimentScore: 80,
  },
  {
    id: 10,
    title: 'Ngành công nghệ Việt Nam thu hút 2,1 tỷ USD vốn FDI',
    summary: 'Trong 6 tháng đầu năm, ngành công nghệ thông tin và viễn thông Việt Nam đã thu hút 2,1 tỷ USD vốn đầu tư trực tiếp nước ngoài, tăng 45% so với cùng kỳ năm trước.',
    source: 'CafeF',
    publishedAt: '2026-06-20T10:00:00Z',
    relatedTicker: 'FPT',
    category: 'industry',
    sentiment: 'positive',
    sentimentScore: 88,
  },
  {
    id: 11,
    title: 'DPM: Giá phân bón urê trong nước giảm về mức thấp nhất 2 năm',
    summary: 'Giá urê trên thị trường nội địa giảm còn 8.500 đồng/kg, mức thấp nhất trong 2 năm qua, gây áp lực lớn lên biên lợi nhuận của Đạm Phú Mỹ và các doanh nghiệp cùng ngành.',
    source: 'VietStock',
    publishedAt: '2026-06-20T15:30:00Z',
    relatedTicker: 'DPM',
    category: 'direct',
    sentiment: 'negative',
    sentimentScore: 22,
  },
  {
    id: 12,
    title: 'Thị trường chứng khoán Việt Nam vượt mốc 1.350 điểm',
    summary: 'Chỉ số VN-Index chính thức vượt mốc 1.350 điểm trong phiên giao dịch ngày 19/6, thanh khoản đạt trung bình 18.000 tỷ đồng/phiên, phản ánh dòng tiền mạnh mẽ.',
    source: 'VnExpress',
    publishedAt: '2026-06-19T17:00:00Z',
    relatedTicker: 'VCB',
    category: 'industry',
    sentiment: 'positive',
    sentimentScore: 75,
  },
  {
    id: 13,
    title: 'CTD trúng thầu dự án hạ tầng giao thông trị giá 3.800 tỷ đồng',
    summary: 'Coteccons vừa trúng thầu gói thầu xây lắp dự án cao tốc Bắc – Nam đoạn Cam Lộ – La Sơn với tổng giá trị hợp đồng 3.800 tỷ đồng, nâng backlog công ty lên mức kỷ lục.',
    source: 'CafeF',
    publishedAt: '2026-06-19T09:20:00Z',
    relatedTicker: 'CTD',
    category: 'direct',
    sentiment: 'positive',
    sentimentScore: 84,
  },
  {
    id: 14,
    title: 'Ngành thép toàn cầu đối mặt rủi ro dư cung từ Trung Quốc',
    summary: 'Hiệp hội Thép Thế giới cảnh báo sản lượng thép Trung Quốc tăng 8% trong quý II có thể tạo áp lực giảm giá lên thị trường thép toàn cầu, bao gồm Việt Nam.',
    source: 'TBKTSG',
    publishedAt: '2026-06-18T14:15:00Z',
    relatedTicker: 'HPG',
    category: 'industry',
    sentiment: 'negative',
    sentimentScore: 18,
  },
  {
    id: 15,
    title: 'VCB: Lợi nhuận trước thuế 6 tháng ước đạt 22.500 tỷ đồng',
    summary: 'Vietcombank ước tính lợi nhuận trước thuế 6 tháng đầu năm 2026 đạt 22.500 tỷ đồng, tăng 15% so với cùng kỳ, tiếp tục dẫn đầu hệ thống ngân hàng thương mại.',
    source: 'VietStock',
    publishedAt: '2026-06-18T08:00:00Z',
    relatedTicker: 'VCB',
    category: 'direct',
    sentiment: 'positive',
    sentimentScore: 90,
  },
  {
    id: 16,
    title: 'Thị trường BĐS Tp.HCM: Giá căn hộ sơ cấp tăng 8% so với đầu năm',
    summary: 'Theo Savills, giá bán căn hộ sơ cấp tại Tp.HCM trong quý II/2026 tăng bình quân 8% so với đầu năm, trong đó phân khúc cao cấp ghi nhận mức tăng mạnh nhất 12%.',
    source: 'CafeF',
    publishedAt: '2026-06-17T11:45:00Z',
    relatedTicker: 'VIC',
    category: 'industry',
    sentiment: 'neutral',
    sentimentScore: 55,
  },
  {
    id: 17,
    title: 'BCM được phê duyệt quy hoạch KCN mới rộng 500ha tại Bình Dương',
    summary: 'Tổng Công ty Becamex IDC vừa được UBND tỉnh Bình Dương phê duyệt quy hoạch chi tiết khu công nghiệp mới với diện tích 500ha, dự kiến thu hút vốn FDI hơn 2 tỷ USD.',
    source: 'VnExpress',
    publishedAt: '2026-06-17T07:30:00Z',
    relatedTicker: 'BCM',
    category: 'direct',
    sentiment: 'positive',
    sentimentScore: 83,
  },
  {
    id: 18,
    title: 'FRT mở rộng chuỗi nhà thuốc Long Châu lên 2.000 điểm bán',
    summary: 'FPT Retail đạt cột mốc 2.000 nhà thuốc Long Châu trên toàn quốc, trở thành chuỗi nhà thuốc lớn nhất Việt Nam. Doanh thu mảng dược phẩm quý II tăng 35%.',
    source: 'VietStock',
    publishedAt: '2026-06-16T14:00:00Z',
    relatedTicker: 'FRT',
    category: 'direct',
    sentiment: 'positive',
    sentimentScore: 79,
  },
  {
    id: 19,
    title: 'Ngành hóa chất chịu áp lực chi phí đầu vào tăng cao',
    summary: 'Giá nguyên liệu hóa chất nhập khẩu tăng 10-15% trong quý II do biến động tỷ giá và chi phí logistics, tạo áp lực lên biên lợi nhuận các doanh nghiệp ngành hóa chất.',
    source: 'TBKTSG',
    publishedAt: '2026-06-15T09:30:00Z',
    relatedTicker: 'DPM',
    category: 'industry',
    sentiment: 'negative',
    sentimentScore: 28,
  },
  {
    id: 20,
    title: 'VNM ra mắt dòng sản phẩm sữa hữu cơ xuất khẩu sang EU',
    summary: 'Vinamilk chính thức ra mắt dòng sữa hữu cơ Organic Gold mới dành riêng cho thị trường Liên minh Châu Âu, đánh dấu bước tiến quan trọng trong chiến lược quốc tế hóa.',
    source: 'VnExpress',
    publishedAt: '2026-06-14T10:00:00Z',
    relatedTicker: 'VNM',
    category: 'direct',
    sentiment: 'positive',
    sentimentScore: 86,
  },
];

/* ───────────────────────── HELPER FUNCTIONS ───────────────────────── */

const formatDate = (isoStr) => {
  const d = new Date(isoStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
};

const getSentimentIcon = (sentiment) => {
  switch (sentiment) {
    case 'positive': return ;
    case 'negative': return ;
    default: return ;
  }
};

const getSentimentLabel = (sentiment) => {
  switch (sentiment) {
    case 'positive': return 'Tích cực';
    case 'negative': return 'Tiêu cực';
    default: return 'Trung lập';
  }
};

const getSentimentColor = (sentiment) => {
  switch (sentiment) {
    case 'positive': return { bg: 'rgba(22, 163, 74, 0.1)', color: 'var(--success)', border: 'rgba(22, 163, 74, 0.2)' };
    case 'negative': return { bg: 'rgba(220, 38, 38, 0.1)', color: 'var(--danger)', border: 'rgba(220, 38, 38, 0.2)' };
    default: return { bg: 'rgba(217, 119, 6, 0.1)', color: 'var(--warning)', border: 'rgba(217, 119, 6, 0.2)' };
  }
};

/* ───────────────────────── COMPONENT ───────────────────────── */

const NewsAnalysis = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [tickerFilter, setTickerFilter] = useState('');

  // Unique tickers from news
  const availableTickers = useMemo(() => {
    const tickers = [...new Set(MOCK_NEWS.map(n => n.relatedTicker))].sort();
    return tickers;
  }, []);

  // Filtered articles
  const filteredNews = useMemo(() => {
    let items = [...MOCK_NEWS];

    // Category / sentiment filter
    switch (activeFilter) {
      case 'direct':
        items = items.filter(n => n.category === 'direct');
        break;
      case 'industry':
        items = items.filter(n => n.category === 'industry');
        break;
      case 'positive':
        items = items.filter(n => n.sentiment === 'positive');
        break;
      case 'negative':
        items = items.filter(n => n.sentiment === 'negative');
        break;
      default:
        break;
    }

    // Ticker filter
    if (tickerFilter) {
      items = items.filter(n => n.relatedTicker === tickerFilter);
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return items;
  }, [activeFilter, tickerFilter]);

  // Stats
  const totalArticles = filteredNews.length;
  const avgSentiment = totalArticles > 0
    ? Math.round(filteredNews.reduce((sum, n) => sum + n.sentimentScore, 0) / totalArticles)
    : 0;
  const positivePercent = totalArticles > 0
    ? Math.round((filteredNews.filter(n => n.sentiment === 'positive').length / totalArticles) * 100)
    : 0;

  const filterButtons = [
    { key: 'all', label: 'Tất cả' },
    { key: 'direct', label: 'Tin trực tiếp ' },
    { key: 'industry', label: 'Tin ngành ' },
    { key: 'positive', label: 'Tích cực ' },
    { key: 'negative', label: 'Tiêu cực ' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--ink-900)', margin: 0, letterSpacing: '-0.03em' }}>
          Phân Tích Tin Tức Thị Trường
        </h1>
      </div>
      <p style={{ color: 'var(--ink-500)', marginBottom: '2.5rem', fontSize: '1.125rem' }}>
        Tổng hợp và phân tích cảm xúc từ các nguồn tin tài chính uy tín, giúp đánh giá tác động tin tức tới rủi ro tín dụng doanh nghiệp.
      </p>

      {/* ─── Summary Stats ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Total articles */}
        <div className="card card-glow" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: 'var(--teal-500)', padding: '16px', borderRadius: '16px' }}>
            <Newspaper size={32} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tổng bài viết
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink-900)', marginTop: '4px' }}>
              {totalArticles}
            </div>
          </div>
        </div>

        {/* Average sentiment */}
        <div className="card card-glow" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            backgroundColor: avgSentiment >= 60 ? 'rgba(22, 163, 74, 0.1)' : avgSentiment >= 40 ? 'rgba(217, 119, 6, 0.1)' : 'rgba(220, 38, 38, 0.1)',
            color: avgSentiment >= 60 ? 'var(--success)' : avgSentiment >= 40 ? 'var(--warning)' : 'var(--danger)',
            padding: '16px',
            borderRadius: '16px',
            fontWeight: 'bold',
            fontSize: '0.8rem'
          }}>
            {avgSentiment >= 50 ? 'TÍCH CỰC' : 'TIÊU CỰC'}
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Điểm cảm xúc TB
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink-900)', marginTop: '4px' }}>
              {avgSentiment}<span style={{ fontSize: '1rem', color: 'var(--ink-500)', fontWeight: 600 }}>/100</span>
            </div>
          </div>
        </div>

        {/* Positive % */}
        <div className="card card-glow" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: 'var(--success)', padding: '16px', borderRadius: '16px' }}>
            <TrendingUp size={32} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tỷ lệ tích cực
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink-900)', marginTop: '4px' }}>
              {positivePercent}<span style={{ fontSize: '1rem', color: 'var(--ink-500)', fontWeight: 600 }}>%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="card card-glow" style={{ padding: '20px 24px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ink-500)', fontWeight: 700, fontSize: '0.9rem' }}>
          
          <span>Bộ lọc:</span>
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {filterButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setActiveFilter(btn.key)}
              style={{
                padding: '8px 18px',
                borderRadius: '999px',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: activeFilter === btn.key ? '2px solid var(--teal-500)' : '1px solid var(--border-color)',
                backgroundColor: activeFilter === btn.key ? 'rgba(2, 132, 199, 0.1)' : 'rgba(255, 255, 255, 0.5)',
                color: activeFilter === btn.key ? 'var(--teal-500)' : 'var(--ink-500)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Ticker dropdown */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            value={tickerFilter}
            onChange={e => setTickerFilter(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '999px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              color: 'var(--ink-900)',
              fontSize: '0.85rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '140px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <option value="">Tất cả mã CK</option>
            {availableTickers.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── News Cards ─── */}
      {filteredNews.length === 0 ? (
        <div className="card card-glow" style={{ padding: '60px 24px', textAlign: 'center' }}>
          
          <p style={{ color: 'var(--ink-500)', fontSize: '1.1rem', fontWeight: 600 }}>
            Không tìm thấy bài viết nào phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredNews.map(article => {
            const sentColor = getSentimentColor(article.sentiment);
            return (
              <div
                key={article.id}
                className="card card-glow"
                style={{
                  padding: '24px 28px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                }}
              >
                {/* Top Row: Title + Badges */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: 'var(--ink-900)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.4,
                    flex: 1,
                    minWidth: '200px',
                  }}>
                    {article.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                    {/* Category badge */}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 12px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: article.category === 'direct' ? 'rgba(2, 132, 199, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                      color: article.category === 'direct' ? 'var(--teal-500)' : 'var(--ink-500)',
                      border: `1px solid ${article.category === 'direct' ? 'rgba(2, 132, 199, 0.2)' : 'rgba(100, 116, 139, 0.15)'}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {article.category === 'direct' ? ' Trực tiếp' : ' Tin ngành'}
                    </span>

                    {/* Sentiment badge */}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 12px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: sentColor.bg,
                      color: sentColor.color,
                      border: `1px solid ${sentColor.border}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {getSentimentIcon(article.sentiment)}
                      {getSentimentLabel(article.sentiment)} · {article.sentimentScore}
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <p style={{
                  color: 'var(--ink-500)',
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  marginBottom: '14px',
                }}>
                  {article.summary}
                </p>

                {/* Bottom Row: Source + Date + Ticker */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Source */}
                    <span style={{
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      color: 'var(--ink-900)',
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      padding: '4px 12px',
                      borderRadius: '8px',
                    }}>
                      {article.source}
                    </span>

                    {/* Date */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.825rem', color: 'var(--ink-400)', fontWeight: 500 }}>
                      
                      {formatDate(article.publishedAt)}
                    </span>
                  </div>

                  {/* Ticker chip */}
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '5px 14px',
                    borderRadius: '999px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    backgroundColor: 'rgba(2, 132, 199, 0.08)',
                    color: 'var(--teal-500)',
                    border: '1px solid rgba(2, 132, 199, 0.15)',
                    letterSpacing: '0.03em',
                  }}>
                    {article.relatedTicker}
                  </span>
                </div>

                {/* Sentiment bar */}
                <div style={{ marginTop: '14px' }}>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${article.sentimentScore}%`,
                      height: '100%',
                      borderRadius: '4px',
                      background: article.sentiment === 'positive'
                        ? 'linear-gradient(90deg, #15803d, #22c55e)'
                        : article.sentiment === 'negative'
                          ? 'linear-gradient(90deg, #b91c1c, #ef4444)'
                          : 'linear-gradient(90deg, #b45309, #f59e0b)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom spacer */}
      <div style={{ height: '3rem' }} />
    </div>
  );
};

export default NewsAnalysis;
