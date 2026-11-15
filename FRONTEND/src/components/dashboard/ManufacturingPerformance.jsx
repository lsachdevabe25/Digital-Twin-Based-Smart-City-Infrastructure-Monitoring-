import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Factory,
  Gauge,
  CheckCircle2,
  Clock,
  TrendingUp
} from 'lucide-react';
import { MANUFACTURING_METRICS } from '../../data/dashboardData';
import Badge from '../common/Badge';

function CustomBarTooltip({ active, payload, label }) {
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
          {label}
        </p>
        {payload.map((entry, index) => (
          <div
            key={`bar-tooltip-${index}`}
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
                borderRadius: '2px',
                backgroundColor: entry.color
              }}
            />
            <span>
              {entry.name}: <strong style={{ color: 'var(--text-primary)' }}>{entry.value} units</strong>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function ManufacturingPerformance() {
  const { facility, shiftProduction, productionLines } = MANUFACTURING_METRICS;

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div className="section-title-wrap">
          <div className="section-icon-badge">
            <Factory size={18} color="var(--accent-teal)" strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="section-title">Industrial Manufacturing Performance</h2>
            <p className="section-subtitle">
              Robotics cyber-physical twin, shift throughput vs target, and line-level OEE
            </p>
          </div>
        </div>

        <div className="section-actions">
          <Badge variant="teal" size="sm">
            Facility OEE: {facility.overallOEE}%
          </Badge>
        </div>
      </div>

      {/* OEE Breakdown Cards Row */}
      <div className="oee-metrics-grid">
        <div className="oee-card">
          <div className="oee-card-title-row">
            <span className="oee-card-label">Overall Plant OEE</span>
            <Gauge size={16} color="var(--accent-teal)" />
          </div>
          <div className="oee-card-value-row">
            <span className="oee-value">{facility.overallOEE}%</span>
            <span className="oee-delta positive">+3.2% vs target</span>
          </div>
          <div className="oee-progress-track">
            <div
              className="oee-progress-fill teal"
              style={{ width: `${facility.overallOEE}%` }}
            />
          </div>
        </div>

        <div className="oee-card">
          <div className="oee-card-title-row">
            <span className="oee-card-label">Availability Rate</span>
            <Clock size={16} color="var(--accent-blue)" />
          </div>
          <div className="oee-card-value-row">
            <span className="oee-value">{facility.availability}%</span>
            <span className="oee-delta">Uptime 99.4%</span>
          </div>
          <div className="oee-progress-track">
            <div
              className="oee-progress-fill blue"
              style={{ width: `${facility.availability}%` }}
            />
          </div>
        </div>

        <div className="oee-card">
          <div className="oee-card-title-row">
            <span className="oee-card-label">Performance Efficiency</span>
            <TrendingUp size={16} color="var(--accent-teal)" />
          </div>
          <div className="oee-card-value-row">
            <span className="oee-value">{facility.performance}%</span>
            <span className="oee-delta positive">Nominal speed</span>
          </div>
          <div className="oee-progress-track">
            <div
              className="oee-progress-fill teal"
              style={{ width: `${facility.performance}%` }}
            />
          </div>
        </div>

        <div className="oee-card">
          <div className="oee-card-title-row">
            <span className="oee-card-label">First-Pass Quality</span>
            <CheckCircle2 size={16} color="var(--accent-blue)" />
          </div>
          <div className="oee-card-value-row">
            <span className="oee-value">{facility.qualityRate}%</span>
            <span className="oee-delta">Scrap rate: 0.8%</span>
          </div>
          <div className="oee-progress-track">
            <div
              className="oee-progress-fill blue"
              style={{ width: `${facility.qualityRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Production Output Chart and Line Level Status Split */}
      <div className="manufacturing-content-split">
        {/* Left: Shift Output Recharts Bar Chart */}
        <div className="mfg-chart-panel panel-card">
          <div className="panel-card-header">
            <div>
              <h3 className="panel-card-title">Cumulative Shift Output (Units)</h3>
              <p className="panel-card-subtitle">Actual manufactured volume vs planned production schedule</p>
            </div>
            <div className="chart-legend-simple">
              <span className="legend-item">
                <span className="legend-color-dot" style={{ backgroundColor: 'var(--accent-teal)' }}></span>
                Actual Units
              </span>
              <span className="legend-item">
                <span className="legend-color-dot" style={{ backgroundColor: '#cbd5e1' }}></span>
                Planned Target
              </span>
            </div>
          </div>

          <div className="panel-card-chart-wrap" style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={shiftProduction}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                barGap={6}
              >
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="shift"
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
                  domain={[0, 2600]}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar
                  dataKey="planned"
                  name="Planned Target"
                  fill="#cbd5e1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="actual"
                  name="Actual Units"
                  fill="var(--accent-teal)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Active Production Lines Detailed Cards */}
        <div className="mfg-lines-panel panel-card">
          <div className="panel-card-header">
            <div>
              <h3 className="panel-card-title">Production Lines Real-Time Status</h3>
              <p className="panel-card-subtitle">Active line efficiency and cycle duration</p>
            </div>
            <Badge variant="teal" size="sm">
              3 Running • 1 Calibrating
            </Badge>
          </div>

          <div className="production-lines-list">
            {productionLines.map((line) => {
              const isRunning = line.status === 'Running';

              return (
                <div key={line.id} className="production-line-card">
                  <div className="line-card-header">
                    <div className="line-identity">
                      <span className="line-name">{line.name}</span>
                      <span className="line-category">{line.category}</span>
                    </div>
                    <Badge
                      variant={isRunning ? 'success' : 'warning'}
                      size="sm"
                    >
                      {line.status}
                    </Badge>
                  </div>

                  <div className="line-metrics-grid">
                    <div className="line-metric-item">
                      <span className="metric-tag">Throughput</span>
                      <span className="metric-number">{line.unitsPerHour}</span>
                      <span className="metric-sub">target: {line.targetRate}</span>
                    </div>

                    <div className="line-metric-item">
                      <span className="metric-tag">Line Efficiency</span>
                      <span className="metric-number">{line.efficiencyPct}%</span>
                      <span className="metric-sub">OEE normalized</span>
                    </div>

                    <div className="line-metric-item">
                      <span className="metric-tag">Cycle Time</span>
                      <span className="metric-number">{line.cycleTime}</span>
                      <span className="metric-sub">per assembly</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ManufacturingPerformance;
