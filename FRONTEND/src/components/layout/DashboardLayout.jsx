import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export function DashboardLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString() + ' UTC';
  });
  const location = useLocation();

  const handleManualRefresh = () => {
    const now = new Date();
    setLastUpdated(now.toLocaleTimeString() + ' UTC');
  };

  const getBreadcrumb = () => {
    switch (location.pathname) {
      case '/network-graph':
        return {
          section: 'Network Graph',
          title: 'Municipal Topology & Live Sensor Mesh'
        };
      case '/repair-plan':
        return {
          section: 'Repair Plan',
          title: 'Priority Maintenance & Replacement Schedule'
        };
      case '/power-failure':
        return {
          section: 'Power Failure',
          title: 'Cross-Domain Substation Cascade Simulation'
        };
      case '/':
      default:
        return {
          section: 'Analyzer',
          title: 'Pipe Pressure & Hydraulic Risk Simulation'
        };
    }
  };

  const currentCrumb = getBreadcrumb();

  return (
    <div className={`dashboard-root ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      {/* Responsive Left Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="dashboard-main-wrapper">
        {/* Top Navigation Bar */}
        <TopNav
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onRefreshData={handleManualRefresh}
        />

        {/* Dashboard Hero Header */}
        <section className="dashboard-hero-header">
          <div className="hero-header-content">
            <div className="hero-breadcrumbs">
              <span>{currentCrumb.section}</span>
              <span className="crumb-separator">/</span>
              <span className="crumb-active">{currentCrumb.title}</span>
            </div>
            <div className="hero-title-row">
              <div className="hero-title-wrap">
                <h1 className="hero-title">
                  {location.pathname === '/network-graph'
                    ? 'Network Topology & Telemetry'
                    : location.pathname === '/repair-plan'
                    ? 'Hydraulic Repair Priority Schedule'
                    : location.pathname === '/power-failure'
                    ? 'Substation Grid & Outage Cascade'
                    : 'Pipe Pressure Analyzer'}
                </h1>
                <p className="hero-subtitle">
                  {location.pathname === '/network-graph'
                    ? 'Interactive visual graph of Rampur municipal pipelines, nodes, and live sensor readings.'
                    : location.pathname === '/repair-plan'
                    ? 'Deterministic maintenance queue calculated from pipe aging, live telemetry, and facility criticality.'
                    : location.pathname === '/power-failure'
                    ? 'Cross-layer cyber-physical simulation of electrical substation trips on municipal water distribution.'
                    : 'Simulate live telemetry on the water distribution network to detect leaks, calculate risk, and preview maintenance priorities.'}
                </p>
              </div>

              <div className="hero-actions">
                <div className="last-sync-badge">
                  <span className="sync-pulse"></span>
                  <span>Engine Sync: {lastUpdated}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content View Container */}
        <main className="dashboard-content-container">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
