import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  Network,
  Wrench,
  Zap,
  ChevronLeft,
  ChevronRight,
  Layers,
  Radio,
  ServerOff
} from 'lucide-react';
import { useBackendStatus } from '../../context/BackendStatusContext';

const NAV_ITEMS = [
  {
    id: 'analyzer',
    label: 'Analyzer',
    path: '/',
    icon: Activity
  },
  {
    id: 'network-graph',
    label: 'Network Graph',
    path: '/network-graph',
    icon: Network
  },
  {
    id: 'repair-plan',
    label: 'Repair Plan',
    path: '/repair-plan',
    icon: Wrench
  },
  {
    id: 'power-failure',
    label: 'Power Failure',
    path: '/power-failure',
    icon: Zap
  }
];

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}) {
  const location = useLocation();
  const { status: backendStatus } = useBackendStatus();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${
          mobileOpen ? 'mobile-open' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="sidebar-header">
          <Link to="/" className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Layers size={20} color="var(--accent-blue)" strokeWidth={2.2} />
            </div>
            {!collapsed && (
              <div className="sidebar-brand-text">
                <span className="sidebar-brand-title">Digital Twin-Based</span>
                <span className="sidebar-brand-subtitle">Smart City Monitoring</span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            className="sidebar-collapse-btn desktop-only"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-section-label">
            {!collapsed && <span>DIGITAL TWIN CONSOLE</span>}
          </div>
          <ul className="sidebar-menu">
            {NAV_ITEMS.map((item) => {
              const IconComponent = item.icon;
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

              return (
                <li key={item.id} className="sidebar-menu-item">
                  <Link
                    to={item.path}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile();
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="sidebar-icon-wrap">
                      <IconComponent
                        size={18}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        color={isActive ? 'var(--accent-blue)' : 'var(--text-muted)'}
                      />
                    </span>
                    {!collapsed && (
                      <span className="sidebar-link-label">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Backend Connection Status Pill at Bottom */}
        <div className="sidebar-footer">
          {!collapsed ? (
            <div className={`sidebar-backend-card backend-${backendStatus}`}>
              <div className="backend-status-row">
                {backendStatus === 'live' ? (
                  <Radio size={14} color="#059669" />
                ) : backendStatus === 'offline' ? (
                  <ServerOff size={14} color="#dc2626" />
                ) : (
                  <span className="telemetry-ping-dot"></span>
                )}
                <span className="backend-status-title">FastAPI Backend</span>
                <span className={`backend-badge-chip chip-${backendStatus}`}>
                  {backendStatus === 'live'
                    ? 'Live'
                    : backendStatus === 'offline'
                    ? 'Offline'
                    : 'Connecting'}
                </span>
              </div>
              <p className="backend-port-text">127.0.0.1:8000</p>
            </div>
          ) : (
            <div
              className={`sidebar-footer-collapsed-dot dot-${backendStatus}`}
              title={`Twin Engine: ${backendStatus}`}
            />
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
