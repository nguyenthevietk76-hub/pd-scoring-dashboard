import { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Home, MessageCircle, LayoutDashboard,
  Search, Compass, Activity, GitCompareArrows, Scale, ScatterChart,
  Briefcase, Bell, LayoutGrid, Newspaper,
  FileText, Download, Database,
  Menu, X, ChevronDown
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Navigation data structure — single source of truth
   ───────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: 'Tổng quan',
    items: [
      { label: 'Trang chủ', icon: Home, route: '/' },
      { label: 'Hỏi FinBot', icon: MessageCircle, route: '/chatbot', badge: { text: 'MỚI', variant: 'red' } },
      { label: 'Market Overview', icon: LayoutDashboard, route: '/market-overview' },
    ],
  },
  {
    label: 'Phân tích rủi ro',
    items: [
      { label: 'Tra cứu doanh nghiệp', icon: Search, route: '/search-company', badge: { text: 'MỚI', variant: 'green' } },
      { label: 'PD Scoring', icon: Compass, route: '/pd-scoring' },
      { label: 'Xu hướng rủi ro', icon: Activity, route: '/trends' },
      { label: 'So sánh chỉ số', icon: GitCompareArrows, route: '/compare' },
      { label: 'So sánh Altman Z', icon: Scale, route: '/altman-z' },
      { label: 'Biểu đồ tùy chỉnh', icon: ScatterChart, route: '/custom-chart', badge: { text: 'MỚI', variant: 'green' } },
    ],
  },
  {
    label: 'Danh mục',
    items: [
      { label: 'Portfolio Monitor', icon: Briefcase, route: '/portfolio' },
      { label: 'Cảnh báo sớm', icon: Bell, route: '/alerts', badge: { text: 'HOT', variant: 'red' } },
      { label: 'Bảng xếp hạng', icon: LayoutGrid, route: '/rankings' },
      { label: 'Phân tích tin tức', icon: Newspaper, route: '/news', badge: { text: 'MỚI', variant: 'green' } },
    ],
  },
  {
    label: 'Báo cáo',
    items: [
      { label: 'Credit Report', icon: FileText, route: '/credit-report' },
      { label: 'Xuất dữ liệu', icon: Download, route: '/export' },
      { label: 'SQL Explorer', icon: Database, route: '/sql', badge: { text: 'PRO', variant: 'red' } },
    ],
  },
];

const TopNavbar = () => {
  const [openGroup, setOpenGroup] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState(null);
  const closeTimerRef = useRef(null);
  const location = useLocation();

  /* Cleanup timer on unmount */
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  /* Close everything on route change */
  useEffect(() => {
    setMobileOpen(false);
    setMobileAccordion(null);
    setOpenGroup(null);
  }, [location.pathname]);

  /* Global Escape key handler */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  /* Lock body scroll when mobile menu is open */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  /* ── Hover handlers (desktop) ── */
  const handleGroupEnter = useCallback((idx) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpenGroup(idx);
  }, []);

  const handleGroupLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setOpenGroup(null);
      closeTimerRef.current = null;
    }, 150);
  }, []);

  /* ── Keyboard handler ── */
  const handleKeyDown = useCallback((e, idx) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpenGroup((prev) => (prev === idx ? null : idx));
    }
  }, []);

  /* ── Active-state detection ── */
  const isGroupActive = useCallback(
    (group) =>
      group.items.some((item) => {
        if (item.route === '/') return location.pathname === '/';
        return location.pathname === item.route;
      }),
    [location.pathname],
  );

  /* ── Mobile accordion ── */
  const toggleMobileAccordion = useCallback((idx) => {
    setMobileAccordion((prev) => (prev === idx ? null : idx));
  }, []);

  /* ── Render ── */
  return (
    <>
      <nav className="topnav" role="navigation" aria-label="Main navigation">
        <div className="topnav-inner">
          {/* Logo */}
          <Link to="/" className="topnav-logo">
            PD Scoring
          </Link>

          {/* ── Desktop groups ── */}
          <div className="topnav-groups">
            {NAV_GROUPS.map((group, idx) => (
              <div
                className="topnav-group"
                key={idx}
                onMouseEnter={() => handleGroupEnter(idx)}
                onMouseLeave={handleGroupLeave}
              >
                <button
                  className={`topnav-group-trigger${isGroupActive(group) ? ' active' : ''}`}
                  aria-expanded={openGroup === idx}
                  aria-haspopup="true"
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  tabIndex={0}
                >
                  {group.label}
                  <ChevronDown
                    size={14}
                    className={`topnav-chevron${openGroup === idx ? ' rotated' : ''}`}
                  />
                </button>

                <div
                  className="topnav-dropdown"
                  data-state={openGroup === idx ? 'open' : 'closed'}
                  role="menu"
                  aria-label={group.label}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.route}
                        to={item.route}
                        end={item.route === '/'}
                        className={({ isActive }) =>
                          `topnav-item${isActive ? ' active' : ''}`
                        }
                        role="menuitem"
                        onClick={() => setOpenGroup(null)}
                      >
                        <Icon size={18} className="topnav-item-icon" />
                        <span className="topnav-item-label">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`topnav-badge topnav-badge-${item.badge.variant}`}
                          >
                            {item.badge.text}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="topnav-hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="topnav-mobile-overlay"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="topnav-mobile-menu"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_GROUPS.map((group, idx) => (
              <div className="topnav-mobile-group" key={idx}>
                <button
                  className={`topnav-mobile-group-trigger${isGroupActive(group) ? ' active' : ''}`}
                  onClick={() => toggleMobileAccordion(idx)}
                  aria-expanded={mobileAccordion === idx}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={16}
                    className={`topnav-chevron${mobileAccordion === idx ? ' rotated' : ''}`}
                  />
                </button>

                <div
                  className="topnav-mobile-items"
                  data-state={mobileAccordion === idx ? 'open' : 'closed'}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.route}
                        to={item.route}
                        end={item.route === '/'}
                        className={({ isActive }) =>
                          `topnav-mobile-item${isActive ? ' active' : ''}`
                        }
                        onClick={() => setMobileOpen(false)}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span
                            className={`topnav-badge topnav-badge-${item.badge.variant}`}
                          >
                            {item.badge.text}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default TopNavbar;
