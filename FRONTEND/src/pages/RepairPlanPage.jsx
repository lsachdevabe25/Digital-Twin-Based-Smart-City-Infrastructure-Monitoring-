import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Wrench,
  ShieldAlert,
  HeartPulse,
  Building,
  RefreshCw
} from 'lucide-react';
import { getRepairPlan } from '../api/twinApi';

export function RepairPlanPage() {
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlan = async (signal) => {
    try {
      const data = await getRepairPlan(signal);
      setPlan(data);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load repair plan');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchPlan(controller.signal);
    return () => controller.abort();
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchPlan();
  };

  // Summary Metrics calculations
  const totalPipes = plan.length;
  const immediateActionPipes = plan.filter(
    (p) => p.risk >= 0.5 || p.status === 'leak suspected'
  ).length;
  const avgHealth =
    totalPipes > 0
      ? Math.round((plan.reduce((sum, p) => sum + p.health, 0) / totalPipes) * 100)
      : 0;
  const criticalAtRisk = plan.filter(
    (p) => p.criticality === 'HIGH' && (p.risk >= 0.4 || p.status === 'leak suspected')
  ).length;

  const getActionChip = (action) => {
    switch (action) {
      case 'REPLACE IMMEDIATELY':
        return <span className="action-chip chip-replace">REPLACE IMMEDIATELY</span>;
      case 'INSPECT TODAY':
        return <span className="action-chip chip-inspect">INSPECT TODAY</span>;
      case 'SCHEDULE MAINTENANCE':
        return <span className="action-chip chip-schedule">SCHEDULE MAINTENANCE</span>;
      case 'MONITOR':
      default:
        return <span className="action-chip chip-monitor">MONITOR</span>;
    }
  };

  const getCriticalityBadge = (crit) => {
    if (crit === 'HIGH') return <span className="crit-badge crit-high">HIGH</span>;
    if (crit === 'MEDIUM') return <span className="crit-badge crit-medium">MEDIUM</span>;
    return <span className="crit-badge crit-low">LOW</span>;
  };

  if (loading) {
    return (
      <div className="analyzer-loading-state">
        <Activity className="spinning" size={32} color="#2563eb" />
        <p>Evaluating hydraulic risks and compiling repair plan...</p>
      </div>
    );
  }

  return (
    <div className="repair-plan-page-root">
      {/* Header */}
      <div className="plan-header-row">
        <div>
          <h2 className="plan-title">Hydraulic Repair & Maintenance Priority Plan</h2>
          <p className="plan-subtitle">
            Ranked priority schedule based on pipe age, material deterioration, live pressure, and institution criticality.
          </p>
        </div>
        <button
          type="button"
          className="action-button secondary-btn"
          onClick={handleManualRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
          <span>{refreshing ? 'Updating...' : 'Refresh Plan'}</span>
        </button>
      </div>

      {error && (
        <div className="analyzer-error-banner">
          <AlertTriangle size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <section className="repair-summary-grid" aria-label="Repair Priority Summary">
        <div className="summary-card">
          <div className="summary-icon-wrap icon-blue">
            <Wrench size={20} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Pipelines</span>
            <span className="summary-val">{totalPipes}</span>
            <span className="summary-sub">Mapped in digital twin</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon-wrap icon-red">
            <ShieldAlert size={20} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Immediate Action Required</span>
            <span className="summary-val" style={{ color: immediateActionPipes > 0 ? '#dc2626' : '#059669' }}>
              {immediateActionPipes}
            </span>
            <span className="summary-sub">Risk ≥ 0.50 or active leak</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon-wrap icon-teal">
            <HeartPulse size={20} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Fleet Average Health</span>
            <span className="summary-val">{avgHealth}%</span>
            <span className="summary-sub">Age & pressure composite</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon-wrap icon-amber">
            <Building size={20} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Critical Infrastructure at Risk</span>
            <span className="summary-val" style={{ color: criticalAtRisk > 0 ? '#d97706' : '#059669' }}>
              {criticalAtRisk}
            </span>
            <span className="summary-sub">Hospitals & schools affected</span>
          </div>
        </div>
      </section>

      {/* Live Ranked Repair Plan Table */}
      <section className="repair-table-card">
        <div className="table-header-block">
          <h3 className="card-table-title">Live Ranked Priority Queue</h3>
          <span className="table-caption-badge">Ranked by Risk Score Descending</span>
        </div>

        <div className="plan-table-responsive-wrap">
          <table className="plan-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Pipe ID</th>
                <th>Material</th>
                <th>Age</th>
                <th>Current Status</th>
                <th>Pressure</th>
                <th>Health Score</th>
                <th>Criticality</th>
                <th>Risk Score</th>
                <th>Action Recommendation</th>
                <th>Alternate Route</th>
                <th>Road Right-of-Way</th>
              </tr>
            </thead>
            <tbody>
              {plan.map((row) => (
                <tr key={row.pipe}>
                  <td className="cell-rank">#{row.rank}</td>
                  <td className="cell-pipe-id">{row.pipe}</td>
                  <td className="cell-material">{row.material}</td>
                  <td>{row.age} yrs</td>
                  <td>
                    <span
                      className={`status-chip-inline ${
                        row.status === 'operational'
                          ? 'chip-green'
                          : row.status === 'leak suspected'
                          ? 'chip-red'
                          : 'chip-slate'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td>{row.pressure_bar ? row.pressure_bar.toFixed(1) : '--'} bar</td>
                  <td>
                    <span
                      className={`health-tag ${
                        row.health >= 0.75
                          ? 'tag-green'
                          : row.health >= 0.5
                          ? 'tag-amber'
                          : 'tag-red'
                      }`}
                    >
                      {Math.round(row.health * 100)}%
                    </span>
                  </td>
                  <td>{getCriticalityBadge(row.criticality)}</td>
                  <td className="cell-risk">
                    <div className="mini-risk-cell">
                      <span className="risk-num">{row.risk.toFixed(2)}</span>
                      <div className="mini-risk-bar">
                        <div
                          className="mini-bar-fill"
                          style={{
                            width: `${Math.min(100, row.risk * 100)}%`,
                            backgroundColor: row.risk >= 0.5 ? '#dc2626' : '#2563eb'
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>{getActionChip(row.advice)}</td>
                  <td>
                    <span className={`badge-bool ${row.backup ? 'bool-yes' : 'bool-no'}`}>
                      {row.backup ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="cell-road">{row.road || 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default RepairPlanPage;

