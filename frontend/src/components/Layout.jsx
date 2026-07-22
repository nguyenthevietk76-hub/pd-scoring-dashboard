import { Outlet, useLocation } from 'react-router-dom';
import TopNavbar from './TopNavbar';

const Layout = () => {
  const location = useLocation();

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

      <TopNavbar />

      <main className="main-content" key={location.pathname}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
