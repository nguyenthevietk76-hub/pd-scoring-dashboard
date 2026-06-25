import { Outlet, NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Bell, Home } from 'lucide-react';
import ChatWidget from './ChatWidget';

const Layout = () => {
  return (
    <div className="layout-container" style={{ position: 'relative' }}>
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

      <aside className="sidebar">
        <Link to="/" style={{textDecoration: 'none'}}>
          <div className="sidebar-header" style={{cursor: 'pointer'}}>
            PD Scoring
          </div>
        </Link>
        <nav className="nav-links">
          <NavLink 
            to="/" 
            end
            className={({isActive}) => isActive ? "nav-item active" : "nav-item"}
          >
            <Home size={20} />
            <span>Trang chủ</span>
          </NavLink>
          <NavLink 
            to="/dashboard" 
            className={({isActive}) => isActive ? "nav-item active" : "nav-item"}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink 
            to="/portfolio" 
            className={({isActive}) => isActive ? "nav-item active" : "nav-item"}
          >
            <Briefcase size={20} />
            <span>Portfolio Demo</span>
          </NavLink>
          <NavLink 
            to="/alerts" 
            className={({isActive}) => isActive ? "nav-item active" : "nav-item"}
          >
            <Bell size={20} />
            <span>Cảnh báo</span>
          </NavLink>
        </nav>
      </aside>
      
      <main className="main-content">
        <Outlet />
      </main>

      {/* Chat Widget overlay */}
      <ChatWidget />
    </div>
  );
};

export default Layout;

