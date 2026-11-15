import React, { useState } from 'react';
import {
  Menu,
  RefreshCw,
  Radio,
  ServerOff,
  LogOut,
  Layers
} from 'lucide-react';
import { useBackendStatus } from '../../context/BackendStatusContext';
import { useAuth } from '../../context/AuthContext';

export function TopNav({
  onOpenMobileSidebar,
  onRefreshData
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { status: backendStatus } = useBackendStatus();
  const { user, logout, getInitials } = useAuth();

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefreshData) onRefreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const avatarInitials = getInitials();

  return (
    <header className="topnav">
      <div className="topnav-left">
        {/* Mobile menu button */}
        <button
          type="button"
          className="topnav-icon-btn mobile-menu-btn"
          onClick={onOpenMobileSidebar}
          aria-label="Open sidebar navigation"
        >
          <Menu size={20} />
        </button>

        {/* Project Header Tag */}
        <div className="topnav-title-badge">
          <Layers size={16} color="var(--accent-blue)" />
          <span className="topnav-system-heading">Digital Twin-Based Smart City Infrastructure Monitoring</span>
        </div>
      </div>

      <div className="topnav-right">
        {/* Real Backend Status Badge */}
        {backendStatus === 'live' ? (
          <div className="topnav-live-pill" title="Backend connected at VITE_API_URL">
            <Radio size={13} color="#059669" />
            <span className="topnav-pill-label">Live API</span>
          </div>
        ) : backendStatus === 'offline' ? (
          <div className="topnav-offline-pill" title="Backend disconnected or unreachable">
            <ServerOff size={13} color="#dc2626" />
            <span className="topnav-pill-label">Offline</span>
          </div>
        ) : (
          <div className="topnav-connecting-pill" title="Checking backend connection...">
            <span className="topnav-status-indicator connecting"></span>
            <span className="topnav-pill-label">Connecting...</span>
          </div>
        )}

        {/* Refresh Action */}
        <button
          type="button"
          className={`topnav-icon-btn ${isRefreshing ? 'spinning' : ''}`}
          onClick={handleRefreshClick}
          title="Refresh telemetry"
          aria-label="Refresh telemetry"
        >
          <RefreshCw size={17} />
        </button>

        <div className="topnav-divider" />

        {/* User profile identifier with computed initials and Logout button */}
        <div className="topnav-user-profile">
          <div className="user-avatar" title={user?.name || 'Operator'}>
            {avatarInitials}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'Operator'}</span>
            <span className="user-role">{user?.email || 'operator@twin.local'}</span>
          </div>
          <button
            type="button"
            className="topnav-logout-btn"
            onClick={logout}
            title="Log out of console"
            aria-label="Log out"
          >
            <LogOut size={16} />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopNav;
