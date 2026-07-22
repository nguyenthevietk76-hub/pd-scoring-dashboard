import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, TrendingUp, FileInput, BrainCircuit, ShieldAlert, ChevronRight } from 'lucide-react';
import TickerBar from '../components/TickerBar';
import Meteor3DCard from '../components/Meteor3DCard';

const Landing = () => {
  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.15 });

    revealElements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent', overflowX: 'hidden', position: 'relative' }}>
      {/* Background Aurora Band */}
      <div className="aurora-backdrop">
        <div className="aurora-blob aurora-band" />
      </div>

      {/* Background Meteor shower */}
      <div className="meteor-bg-container">
        <div className="bg-meteor bg-met1" />
        <div className="bg-meteor bg-met2" />
        <div className="bg-meteor bg-met3" />
        <div className="bg-meteor bg-met4" />
        <div className="bg-meteor bg-met5" />
      </div>

      {/* Header */}
      <header style={{ 
        background: 'rgba(255, 255, 255, 0.75)', 
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '1.25rem 4rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#000000', letterSpacing: '-0.03em' }}>
          Risk Tech
        </div>
        <Link to="/pd-scoring" className="btn-primary" style={{ padding: '0.6rem 1.8rem', fontSize: '0.875rem' }}>
          Khởi chạy hệ thống <ChevronRight size={16} />
        </Link>
      </header>

      {/* Ticker Marquee */}
      <TickerBar />

      {/* Hero Section */}
      <section style={{ 
        background: 'transparent', 
        padding: '9rem 4rem 8rem 4rem', 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        position: 'relative'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '6rem', maxWidth: '1200px', width: '100%', alignItems: 'center' }}>
          <div className="reveal active">
            {/* OPPO AI Phone Vibe Badge */}
            <div style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              backdropFilter: 'blur(10px)',
              padding: '0.5rem 1.25rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#000000',
              marginBottom: '2rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              <span style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--teal-500)', 
                display: 'inline-block',
                animation: 'pulse-glowing 2s infinite' 
              }}></span>
              AI Risk Platform
            </div>
            <h1 style={{ 
              fontSize: '3.85rem', 
              fontWeight: 800, 
              color: '#0f172a', 
              marginBottom: '1.25rem', 
              lineHeight: 1.15, 
              letterSpacing: '-0.03em',
              fontFamily: "'Playfair Display', serif",
              whiteSpace: 'nowrap'
            }}>
              Hệ thống Chấm điểm <span style={{ 
                background: 'linear-gradient(135deg, #0284c7 30%, #6366f1 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 900
              }}>PD</span>
            </h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
              <div style={{ width: '12px', height: '2px', backgroundColor: '#0284c7', borderRadius: '1px' }}></div>
              <h2 style={{ 
                fontSize: '2.2rem', 
                fontWeight: 800, 
                letterSpacing: '-0.03em', 
                margin: 0,
                background: 'linear-gradient(90deg, #0f172a 0%, #0284c7 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                display: 'inline-block'
              }}>
                Định lượng rủi ro bằng AI thế hệ mới
              </h2>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '3.5rem', alignItems: 'stretch' }}>
              <div style={{ width: '4px', background: 'linear-gradient(180deg, #0284c7, #818cf8)', borderRadius: '2px' }}></div>
              <p style={{ fontSize: '1.2rem', color: 'var(--ink-500)', lineHeight: 1.6, maxWidth: '580px', fontWeight: 500, margin: 0 }}>
                Nền tảng phân tích Xác suất Vỡ nợ (Probability of Distress) ứng dụng học máy chuyên biệt, đo lường sức khỏe tài chính doanh nghiệp với độ chính xác định lượng cao.
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* Xem thêm Pill Button */}
              <Link to="/pd-scoring" className="btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2.75rem', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)' }}>
                Xem thêm
              </Link>
              {/* Mua ngay Text Link Vibe */}
              <Link to="/portfolio" style={{ 
                fontSize: '1rem', 
                fontWeight: 700, 
                color: '#000000', 
                textDecoration: 'none', 
                borderBottom: '2px solid #000000',
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.25rem',
                marginLeft: '2rem',
                paddingBottom: '2px',
                transition: 'opacity 0.2s'
              }}
              className="text-link-hover"
              >
                Khám phá dữ liệu mẫu <ChevronRight size={18} />
              </Link>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center' }} className="reveal active">
            <Meteor3DCard />
          </div>
        </div>
      </section>

      {/* Interactive Process Section */}
      <section style={{ 
        padding: '8rem 4rem', 
        background: 'transparent', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ maxWidth: '1200px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '6rem' }} className="reveal">
            <h2 style={{ fontSize: '2.75rem', fontWeight: 900, color: '#000000', marginBottom: '1.25rem', letterSpacing: '-0.03em' }}>
              Quy trình hoạt động thông minh
            </h2>
            <p style={{ color: 'var(--ink-500)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto', fontWeight: 500 }}>
              Chuyển đổi dữ liệu báo cáo tài chính thô thành các điểm số rủi ro định lượng trực quan qua 3 bước tinh giản.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }} className="reveal">
              <div style={{ fontSize: '3rem', fontWeight: 900, background: 'linear-gradient(180deg, #000000, transparent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1, marginBottom: '1rem', fontFamily: "'Playfair Display', serif" }}>
                01
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', padding: '2rem', borderRadius: '50%', marginBottom: '2rem', color: '#000000', border: '1px solid rgba(255, 255, 255, 1)', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.02)' }}>
                <FileInput size={36} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1rem', color: '#000000', letterSpacing: '-0.01em' }}>Khai báo số liệu</h3>
              <p style={{ color: 'var(--ink-500)', fontSize: '0.975rem', lineHeight: 1.6, padding: '0 1rem', fontWeight: 500 }}>
                Điền 5 chỉ tiêu tài chính cơ bản từ báo cáo kết quả kinh doanh và bảng cân đối kế toán hoặc nạp dữ liệu mẫu tức thời.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }} className="reveal">
              <div style={{ fontSize: '3rem', fontWeight: 900, background: 'linear-gradient(180deg, var(--teal-500), transparent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1, marginBottom: '1rem', fontFamily: "'Playfair Display', serif" }}>
                02
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', padding: '2rem', borderRadius: '50%', marginBottom: '2rem', color: 'var(--teal-500)', border: '1px solid rgba(255, 255, 255, 1)', boxShadow: '0 8px 24px rgba(2, 132, 199, 0.03)' }}>
                <BrainCircuit size={36} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1rem', color: '#000000', letterSpacing: '-0.01em' }}>Phân tích đa chiều</h3>
              <p style={{ color: 'var(--ink-500)', fontSize: '0.975rem', lineHeight: 1.6, padding: '0 1rem', fontWeight: 500 }}>
                Thuật toán Machine learning tự động chuẩn hóa tỷ số tài chính, tính toán tương quan quy mô và dự phóng biến động.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }} className="reveal">
              <div style={{ fontSize: '3rem', fontWeight: 900, background: 'linear-gradient(180deg, var(--success), transparent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1, marginBottom: '1rem', fontFamily: "'Playfair Display', serif" }}>
                03
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', padding: '2rem', borderRadius: '50%', marginBottom: '2rem', color: 'var(--success)', border: '1px solid rgba(255, 255, 255, 1)', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.03)' }}>
                <ShieldAlert size={36} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1rem', color: '#000000', letterSpacing: '-0.01em' }}>Nhận diện rủi ro</h3>
              <p style={{ color: 'var(--ink-500)', fontSize: '0.975rem', lineHeight: 1.6, padding: '0 1rem', fontWeight: 500 }}>
                Nhận điểm số xác suất vỡ nợ (PD) định lượng trực quan kèm biểu đồ phân tách các nhân tố ảnh hưởng trọng yếu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section style={{ padding: '8rem 4rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '1200px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }} className="reveal">
            <h2 style={{ fontSize: '2.75rem', fontWeight: 900, color: '#000000', marginBottom: '1.25rem', letterSpacing: '-0.03em' }}>
              Kiến trúc công nghệ vượt trội
            </h2>
            <p style={{ color: 'var(--ink-500)', fontSize: '1.125rem', fontWeight: 500 }}>
              Được thiết kế để tối ưu hóa năng lực giám sát và giảm thiểu sai lệch định giá rủi ro.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem' }}>
            <div className="card card-glow reveal" style={{ display: 'flex', flexDirection: 'column', padding: '3rem 2.5rem' }}>
              <div style={{ backgroundColor: 'rgba(2, 132, 199, 0.05)', padding: '1.25rem', borderRadius: '16px', marginBottom: '2rem', color: 'var(--teal-500)', alignSelf: 'flex-start', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.02)' }}>
                <Activity size={28} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem', color: '#000000' }}>Phản hồi tức thì</h3>
              <p style={{ color: 'var(--ink-500)', fontSize: '0.975rem', lineHeight: 1.6 }}>
                Điểm số PD và các phân tích cơ cấu rủi ro được cập nhật ngay lập tức sau mỗi lần thay đổi thông số đầu vào.
              </p>
            </div>

            <div className="card card-glow reveal" style={{ display: 'flex', flexDirection: 'column', padding: '3rem 2.5rem' }}>
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '1.25rem', borderRadius: '16px', marginBottom: '2rem', color: 'var(--success)', alignSelf: 'flex-start', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.02)' }}>
                <ShieldCheck size={28} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem', color: '#000000' }}>Định lượng chuẩn xác</h3>
              <p style={{ color: 'var(--ink-500)', fontSize: '0.975rem', lineHeight: 1.6 }}>
                Mô hình Logistic Regression kết hợp hiệu số quy mô (Log Assets) giúp giảm thiểu sai lệch xếp hạng cho các Blue-chips hàng đầu.
              </p>
            </div>

            <div className="card card-glow reveal" style={{ display: 'flex', flexDirection: 'column', padding: '3rem 2.5rem' }}>
              <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', padding: '1.25rem', borderRadius: '16px', marginBottom: '2rem', color: 'var(--warning)', alignSelf: 'flex-start', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.02)' }}>
                <TrendingUp size={28} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem', color: '#000000' }}>Giám sát xu hướng</h3>
              <p style={{ color: 'var(--ink-500)', fontSize: '0.975rem', lineHeight: 1.6 }}>
                Theo dõi biến động liên tiếp qua các quý giúp phát hiện sớm và đưa ra cảnh báo sớm về xu hướng suy kiệt dòng tiền.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing Call to Action */}
      <section style={{ 
        padding: '8rem 4rem', 
        background: 'radial-gradient(circle at 50% 70%, rgba(2, 132, 199, 0.05) 0%, transparent 60%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ maxWidth: '800px' }} className="reveal">
          <h2 style={{ fontSize: '3.25rem', fontWeight: 900, color: '#000000', marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>
            Nâng tầm phân tích rủi ro tín dụng
          </h2>
          <p style={{ color: 'var(--ink-500)', fontSize: '1.15rem', marginBottom: '3.5rem', lineHeight: 1.6, fontWeight: 500 }}>
            Bắt đầu khám phá sức mạnh định lượng rủi ro bằng AI ngay hôm nay để đưa ra các quyết định đầu tư và tín dụng an toàn, tối ưu.
          </p>
          <Link to="/pd-scoring" className="btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 3.5rem', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)' }}>
            Truy cập Dashboard
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderTop: '1px solid var(--border-color)', color: 'var(--ink-500)', padding: '4rem 4rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '1200px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, color: '#000000', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>PD SCORING SYSTEM</p>
            <p style={{ color: 'var(--ink-500)', fontSize: '0.85rem' }}>Dự án Prototype - Nhóm 3 - AI-Quantum Challenge 2026</p>
          </div>
          <p style={{ color: 'var(--ink-500)', fontSize: '0.85rem' }}>© 2026 Nhóm 3. Học thuật & Nghiên cứu rủi ro tín dụng.</p>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        .hero-image-hover:hover {
          transform: perspective(1200px) rotateY(-4deg) rotateX(4deg) rotateZ(0deg) scale(1.02) !important;
          box-shadow: 0 40px 100px rgba(2, 132, 199, 0.12), 0 10px 40px rgba(0, 0, 0, 0.06) !important;
          border-color: rgba(2, 132, 199, 0.25) !important;
        }
        .text-link-hover:hover {
          opacity: 0.7;
        }
        .pd-badge-glow {
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .pd-badge-glow:hover {
          transform: translateY(-6px) scale(1.03) !important;
          box-shadow: 0 12px 35px rgba(2, 132, 199, 0.2), inset 0 2px 4px rgba(255, 255, 255, 1) !important;
          border-color: rgba(2, 132, 199, 0.45) !important;
        }
        @keyframes pulse-glowing {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(2, 132, 199, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(2, 132, 199, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(2, 132, 199, 0); }
        }
      `}} />
    </div>
  );
};

export default Landing;
