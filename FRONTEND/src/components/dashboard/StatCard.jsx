import React from 'react';
import {
  Zap,
  Factory,
  Activity,
  Cpu,
  TrendingUp
} from 'lucide-react';
import Badge from '../common/Badge';

const ICONS = {
  Zap,
  Factory,
  Activity,
  Cpu
};

export function StatCard({
  label,
  value,
  trend,
  isPositiveTrend = true,
  trendDescription,
  statusText,
  badgeType = 'info',
  iconName = 'Activity',
  accentColor = 'blue',
  detail
}) {
  const IconComponent = ICONS[iconName] || Activity;
  const isTeal = accentColor === 'teal';

  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className="stat-card-label-group">
          <span className="stat-card-label">{label}</span>
          {statusText && (
            <Badge variant={badgeType} size="sm">
              {statusText}
            </Badge>
          )}
        </div>
        <div
          className={`stat-card-icon-container ${
            isTeal ? 'accent-teal-icon' : 'accent-blue-icon'
          }`}
        >
          <IconComponent
            size={18}
            strokeWidth={2.2}
            color={isTeal ? 'var(--accent-teal)' : 'var(--accent-blue)'}
          />
        </div>
      </div>

      <div className="stat-card-body">
        <div className="stat-card-value-row">
          <span className="stat-card-value">{value}</span>
        </div>

        <div className="stat-card-meta-row">
          <div
            className={`stat-card-trend ${
              isPositiveTrend ? 'trend-positive' : 'trend-neutral'
            }`}
          >
            {isPositiveTrend ? (
              <TrendingUp size={14} strokeWidth={2.2} />
            ) : (
              <Activity size={14} strokeWidth={2} />
            )}
            <span className="trend-number">{trend}</span>
          </div>
          {trendDescription && (
            <span className="stat-card-trend-desc">{trendDescription}</span>
          )}
        </div>
      </div>

      {detail && (
        <div className="stat-card-footer">
          <span className="stat-card-detail">{detail}</span>
        </div>
      )}
    </div>
  );
}

export default StatCard;
