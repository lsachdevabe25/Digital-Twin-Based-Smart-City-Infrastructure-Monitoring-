import React from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Building2,
  Zap,
  Wind,
  Droplets,
  Car
} from 'lucide-react';
import { CITY_METRICS } from '../../data/dashboardData';
import Badge from '../common/Badge';

// Custom clean enterprise tooltip for Recharts
function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
          boxShadow: 'var(--shadow-sm)',
          fontSize: '12px',
          color: 'var(--text-primary)'
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
          Time: {label}
        </p>
        {payload.map((entry, index) => (
          <div
            key={`tooltip-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--text-secondary)'
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: entry.color
              }}
            />
            <span>
              {entry.name}: <strong style={{ color: 'var(--text-primary)' }}>{entry.value} MW</strong>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function CityOverview() {
  const { summary, gridLoadHourly, districts } = CITY_METRICS;

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div className="section-title-wrap">
          <div className="section-icon-badge">
            <Building2 size={18} color="var(--accent-blue)" strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="section-title">Smart City Infrastructure Overview</h2>
            <p className="section-subtitle">
              Sample municipal grid, air and water sensor, and transit data.
            </p>
          </div>
        </div>

        <div className="section-actions">
          <Badge variant="teal" size="sm">
            Sample Telemetry
          </Badge>
        </div>
      </div>

      {/* Sector Quick Indicators Grid */}
      <div className="city-sectors-grid">
        <div className="sector-pill-card">
          <div className="sector-icon blue">
            <Zap size={16} />
          </div>
          <div className="sector-details">
            <span className="sector-label">Municipal Grid Load</span>
            <div className="sector-val-row">
              <span className="sector-value">{summary.totalPowerDemand}</span>
              <span className="sector-hint">Base: {summary.powerBaseline}</span>
            </div>
          </div>
        </div>

        <div className="sector-pill-card">
          <div className="sector-icon teal">
            <Wind size={16} />
          </div>
          <div className="sector-details">
            <span className="sector-label">Environmental Air Quality</span>
            <div className="sector-val-row">
              <span className="sector-value">{summary.airQualityIndex}</span>
              <span className="sector-hint">{summary.airQualityStatus}</span>
            </div>
          </div>
        </div>

        <div className="sector-pill-card">
          <div className="sector-icon blue">
            <Droplets size={16} />
          </div>
          <div className="sector-details">
            <span className="sector-label">Water Distribution Network</span>
            <div className="sector-val-row">
              <span className="sector-value">{summary.potableWaterPressure}</span>
              <span className="sector-hint">{summary.waterPressureStatus}</span>
            </div>
          </div>
        </div>

        <div className="sector-pill-card">
          <div className="sector-icon teal">
            <Car size={16} />
          </div>
          <div className="sector-details">
            <span className="sector-label">Intelligent Mobility Fleet</span>
            <div className="sector-val-row">
              <span className="sector-value">{summary.activeTransitUnits}</span>
              <span className="sector-hint">{summary.transitStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Load Chart & District Breakdown split container */}
      <div className="city-content-split">
        {/* Left: Recharts 24-Hour Municipal Power Curve */}
        <div className="city-chart-panel panel-card">
          <div className="panel-card-header">
            <div>
              <h3 className="panel-card-title">24-Hour Municipal Grid Telemetry (MW)</h3>
              <p className="panel-card-subtitle">Sample load demand vs planned municipal baseline. (Y-axis: MW, axis starts at 60 MW)</p>
            </div>
            <div className="chart-legend-simple">
              <span className="legend-item">
                <span className="legend-color-dot" style={{ backgroundColor: 'var(--accent-blue)' }}></span>
                Actual Load
              </span>
              <span className="legend-item">
                <span className="legend-color-dot" style={{ backgroundColor: '#94a3b8' }}></span>
                Baseline Target
              </span>
            </div>
          </div>

          <div className="panel-card-chart-wrap" style={{ height: 230, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={gridLoadHourly}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gridLoadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  domain={[60, 180]}
                  unit=" MW"
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="actualLoad"
                  name="Actual Load"
                  stroke="var(--accent-blue)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gridLoadGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  name="Baseline"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
            Note: Y-axis zoomed (60–180 MW) to display intraday municipal load fluctuations clearly.
          </div>
        </div>

        {/* Right: District Level Infrastructure Grid List */}
        <div className="city-districts-panel panel-card">
          <div className="panel-card-header">
            <div>
              <h3 className="panel-card-title">District Infrastructure Telemetry</h3>
              <p className="panel-card-subtitle">Active sensor telemetry across municipal zones</p>
            </div>
            <Badge variant="neutral" size="sm">
              Sample
            </Badge>
          </div>

          <div className="districts-list">
            {districts.map((d) => (
              <div key={d.id} className="district-row-item">
                <div className="district-info">
                  <div className="district-name-row">
                    <span className="district-name">{d.name}</span>
                    <span className="district-zone-tag">{d.zoneCode}</span>
                  </div>
                  <div className="district-metrics-row">
                    <span className="district-metric">
                      <strong>{d.connectedNodes.toLocaleString()}</strong> nodes
                    </span>
                    <span className="district-separator">•</span>
                    <span className="district-metric">
                      <strong>{d.powerDemand}</strong> draw
                    </span>
                    <span className="district-separator">•</span>
                    <span className="district-metric">{d.trafficFlow}</span>
                  </div>
                </div>

                {/* Removed repeated Sample badge so AQI is cleanly visible without overlap */}
                <div className="district-status-wrap">
                  <span className="district-aqi" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {d.airQuality}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CityOverview;
