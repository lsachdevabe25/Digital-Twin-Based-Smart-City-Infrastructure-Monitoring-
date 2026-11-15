import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Send,
  Zap,
  MapPin,
  TrendingDown,
  ShieldAlert
} from 'lucide-react';
import { getNetwork, postAnalyze, postSensorReading } from '../api/twinApi';
import NetworkGraphSVG from '../components/network/NetworkGraphSVG';

const CURRENT_YEAR = new Date().getFullYear();

export function AnalyzerPage() {
  const [networkData, setNetworkData] = useState({ nodes: [], pipes: [], transformers: [], depends_on: {} });
  const [selectedPipeId, setSelectedPipeId] = useState('');
  const [pressure, setPressure] = useState(2.2);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  // 1. Fetch initial network data
  useEffect(() => {
    const controller = new AbortController();
    async function loadNetwork() {
      try {
        setLoading(true);
        const data = await getNetwork(controller.signal);
        setNetworkData(data);
        if (data.pipes && data.pipes.length > 0) {
          const firstPipe = data.pipes[0].id;
          setSelectedPipeId(firstPipe);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load network topology');
        }
      } finally {
        setLoading(false);
      }
    }
    loadNetwork();
    return () => controller.abort();
  }, []);

  // 2. Run analysis dry run
  const runAnalysis = useCallback(async (pipeId, pressureVal) => {
    if (!pipeId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setError(null);

    try {
      const result = await postAnalyze(pipeId, pressureVal, controller.signal);
      setAnalysis(result);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Analysis failed');
      }
    }
  }, []);

  // Trigger analysis when selected pipe or pressure changes
  useEffect(() => {
    if (selectedPipeId) {
      void runAnalysis(selectedPipeId, pressure);
    }
  }, [selectedPipeId, pressure, runAnalysis]);

  // Handle preset clicks
  const handlePreset = (val) => {
    setPressure(val);
  };

  // Handle Apply as live reading
  const handleApplyLive = async () => {
    if (!selectedPipeId) return;
    setApplying(true);
    try {
      await postSensorReading(selectedPipeId, pressure);
      setToastMessage({
        type: 'success',
        text: `Live reading applied for ${selectedPipeId} at ${pressure.toFixed(1)} bar. State updated in twin engine.`
      });
      setTimeout(() => setToastMessage(null), 5000);
      // Re-run analysis
      void runAnalysis(selectedPipeId, pressure);
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: `Failed to apply live sensor reading: ${err.message}`
      });
      setTimeout(() => setToastMessage(null), 6000);
    } finally {
      setApplying(false);
    }
  };

  const selectedPipeObj = networkData.pipes.find((p) => p.id === selectedPipeId);

  // Criticality color helper
  const getCriticalityBadge = (crit) => {
    if (crit === 'HIGH') return <span className="crit-badge crit-high">HIGH</span>;
    if (crit === 'MEDIUM') return <span className="crit-badge crit-medium">MEDIUM</span>;
    return <span className="crit-badge crit-low">LOW</span>;
  };

  // Action chip helper
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

  if (loading) {
    return (
      <div className="analyzer-loading-state">
        <Activity className="spinning" size={32} color="#2563eb" />
        <p>Connecting to digital twin hydraulic model...</p>
      </div>
    );
  }

  // Top 5 pipes by risk from hypothetical repair plan
  const top5RiskPipes = analysis?.repair_plan ? analysis.repair_plan.slice(0, 5) : [];

  return (
    <div className="analyzer-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`analyzer-toast toast-${toastMessage.type}`} role="alert">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} color="#059669" />
          ) : (
            <AlertTriangle size={18} color="#dc2626" />
          )}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setToastMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* 1. Header with Apply Live Reading */}
      <section className="analyzer-section analyzer-header-card">
        <div className="analyzer-header-left">
          <h2 className="analyzer-title">Pipe Pressure Analyzer</h2>
          <p className="analyzer-subtitle">
            Simulate live telemetry on the water distribution network to detect leaks, calculate risk, and preview maintenance priorities.
          </p>
        </div>
        <div className="analyzer-header-right">
          <button
            type="button"
            className="action-button primary-btn"
            onClick={handleApplyLive}
            disabled={applying || !selectedPipeId}
            title="Commit simulated pressure to twin backend"
          >
            <Send size={15} />
            <span>{applying ? 'Applying...' : 'Apply as Live Reading'}</span>
          </button>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="analyzer-error-banner">
          <AlertTriangle size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Controls Bar */}
      <section className="analyzer-section analyzer-controls-card">
        <div className="controls-grid">
          {/* Pipe Selector */}
          <div className="control-item">
            <label htmlFor="pipe-select" className="control-label">
              Select Hydraulic Pipe
            </label>
            <select
              id="pipe-select"
              className="control-select"
              value={selectedPipeId}
              onChange={(e) => setSelectedPipeId(e.target.value)}
            >
              {networkData.pipes.map((pipe) => {
                const roadStr = pipe.road ? ` (${pipe.road})` : '';
                return (
                  <option key={pipe.id} value={pipe.id}>
                    {pipe.id}{roadStr}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Pressure Input */}
          <div className="control-item">
            <label htmlFor="pressure-input" className="control-label">
              Simulated Pressure (bar)
            </label>
            <div className="pressure-stepper-wrap">
              <button
                type="button"
                className="step-btn"
                onClick={() => setPressure((prev) => Math.max(0, parseFloat((prev - 0.1).toFixed(1))))}
                aria-label="Decrease pressure by 0.1"
              >
                -
              </button>
              <input
                id="pressure-input"
                type="number"
                step="0.1"
                min="0"
                max="10"
                className="control-input-number"
                value={pressure}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0 && val <= 10) {
                    setPressure(parseFloat(val.toFixed(1)));
                  }
                }}
              />
              <button
                type="button"
                className="step-btn"
                onClick={() => setPressure((prev) => Math.min(10, parseFloat((prev + 0.1).toFixed(1))))}
                aria-label="Increase pressure by 0.1"
              >
                +
              </button>
            </div>
          </div>

          {/* Presets & Trigger */}
          <div className="control-item presets-item">
            <span className="control-label">Simulation Presets</span>
            <div className="preset-buttons-row">
              <button
                type="button"
                className={`preset-btn ${pressure === 2.4 ? 'preset-active' : ''}`}
                onClick={() => handlePreset(2.4)}
              >
                Normal (2.4 bar)
              </button>
              <button
                type="button"
                className={`preset-btn ${pressure === 1.2 ? 'preset-active' : ''}`}
                onClick={() => handlePreset(1.2)}
              >
                Low (1.2 bar)
              </button>
              <button
                type="button"
                className={`preset-btn ${pressure === 0.4 ? 'preset-active' : ''}`}
                onClick={() => handlePreset(0.4)}
              >
                Leak (0.4 bar)
              </button>
              <button
                type="button"
                className={`preset-btn ${pressure === 0.0 ? 'preset-active' : ''}`}
                onClick={() => handlePreset(0.0)}
              >
                Critical (0.0 bar)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Status Chip + Reason */}
      {analysis && (
        <section className="analyzer-section analyzer-status-card">
          <div className="status-header-row">
            <div className={`analyzer-status-pill status-${analysis.status === 'operational' ? 'green' : 'red'}`}>
              {analysis.status === 'operational' ? (
                <CheckCircle2 size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
              <span className="status-text">{analysis.status.toUpperCase()}</span>
            </div>
            <p className="status-reason-text">{analysis.reason}</p>
          </div>
        </section>
      )}

      {/* 4. Four Metrics Cards */}
      {analysis && (
        <section className="analyzer-section analyzer-metrics-grid" aria-label="Simulated Telemetry Metrics">
          {/* Health Score */}
          <div className="metric-box">
            <span className="metric-label">Health Score</span>
            <div className="metric-value-row">
              <span
                className="metric-value"
                style={{
                  color:
                    analysis.health_score >= 0.75
                      ? '#059669'
                      : analysis.health_score >= 0.5
                        ? '#d97706'
                        : '#dc2626'
                }}
              >
                {Math.round(analysis.health_score * 100)}%
              </span>
            </div>
            <p className="metric-subtitle">
              Calculated from {selectedPipeObj?.material || 'pipe'} age ({selectedPipeObj ? CURRENT_YEAR - selectedPipeObj.install_year : '--'} yrs) and {Number(pressure ?? 0).toFixed(2)} bar pressure.
            </p>
          </div>

          {/* Failure Chance */}
          <div className="metric-box">
            <span className="metric-label">Failure Chance</span>
            <div className="metric-value-row">
              <span className="metric-value" style={{ color: '#0f172a' }}>
                {Math.round(analysis.failure_chance * 100)}%
              </span>
              <TrendingDown size={20} color="#64748b" />
            </div>
            <p className="metric-subtitle">
              Inverse probability of pipe integrity loss (1.0 - health score).
            </p>
          </div>

          {/* Criticality */}
          <div className="metric-box">
            <span className="metric-label">Network Criticality</span>
            <div className="metric-value-row">
              {getCriticalityBadge(analysis.criticality)}
            </div>
            <p className="metric-subtitle">
              {analysis.impact && analysis.impact.length > 0
                ? `Feeds: ${analysis.impact.join(', ')}`
                : 'Alternate redundant path available.'}
            </p>
          </div>

          {/* Risk */}
          <div className="metric-box">
            <span className="metric-label">Maintenance Risk Score</span>
            <div className="metric-value-row">
              <span className="metric-value" style={{ color: analysis.risk >= 0.5 ? '#dc2626' : '#2563eb' }}>
                {Number(analysis.risk ?? 0).toFixed(2)}
              </span>
              <span className="metric-threshold-badge">Threshold: 0.50</span>
            </div>
            <div className="metric-progress-track">
              <div
                className="metric-progress-fill"
                style={{
                  width: `${Math.min(100, analysis.risk * 100)}%`,
                  backgroundColor: analysis.risk >= 0.5 ? '#dc2626' : '#2563eb'
                }}
              />
            </div>
            <p className="metric-subtitle">
              Calculated from failure chance × criticality weight. Values above 0.5 require scheduled repair.
            </p>
          </div>
        </section>
      )}

      {/* 5, 6, 7. Impact, Power Dependency & Advice Boxes */}
      {analysis && (
        <section className="analyzer-section analyzer-details-grid">
          {/* Impact Box */}
          <div className="detail-panel">
            <div className="panel-title-wrap">
              <MapPin size={18} color="#0d9488" />
              <h3 className="panel-title">Downstream Hydraulic Impact</h3>
            </div>
            <div className="panel-content">
              {analysis.impact && analysis.impact.length > 0 ? (
                <div className="impact-loss-warning">
                  <span className="impact-loss-tag">Water Loss Affected Nodes:</span>
                  <div className="affected-chips-list">
                    {analysis.impact.map((nodeName) => (
                      <span key={nodeName} className="affected-node-chip">
                        {nodeName}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="impact-safe-message">
                  <CheckCircle2 size={16} color="#059669" />
                  <span>No downstream water loss (alternate route available).</span>
                </div>
              )}

              {/* Road Impact */}
              <div className="road-impact-box">
                <span className="road-impact-title">Municipal Right of Way:</span>
                <p className="road-impact-text">
                  {analysis.road_impact
                    ? `Runs under: ${analysis.road_impact}. Coordinate excavation with local municipal works.`
                    : 'Unmapped surface route.'}
                </p>
              </div>
            </div>
          </div>

          {/* Power Failure Dependency Box */}
          <div className="detail-panel">
            <div className="panel-title-wrap">
              <Zap size={18} color="#d97706" />
              <h3 className="panel-title">Power Grid Dependency</h3>
            </div>
            <div className="panel-content">
              {!analysis
                ? (
                  <p className="power-dep-hint">Run Analyze to see power dependency.</p>
                )
                : (analysis?.power_failure_impact?.length ?? 0) === 0
                ? (
                  <div className="power-dep-none">
                    <CheckCircle2 size={16} color="#059669" />
                    <span>No transformer dependency for this pipe.</span>
                  </div>
                )
                : (
                  <div className="power-dep-active">
                    {(analysis.power_failure_impact ?? []).map((item, idx) => (
                      <div key={item?.transformer ?? idx} className="power-dep-item">
                        <div className="power-dep-transformer-id">
                          <Zap size={14} color="#d97706" />
                          <strong>{item?.transformer}</strong>
                        </div>
                        {(item?.power_loss?.length ?? 0) > 0 && (
                          <div className="power-dep-row">
                            <span className="power-dep-row-label">Loses power:</span>
                            <div className="power-dep-chips">
                              {item.power_loss.map((name) => (
                                <span key={name} className="power-chip power-chip-electricity">{name}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(item?.water_cascade?.length ?? 0) > 0 && (
                          <div className="power-dep-row">
                            <span className="power-dep-row-label">Loses water:</span>
                            <div className="power-dep-chips">
                              {item.water_cascade.map((name) => (
                                <span key={name} className="power-chip power-chip-water">{name}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {item?.backup_note && (
                          <p className="power-dep-backup-note">{item.backup_note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          </div>

          {/* Advice Box */}
          <div className="detail-panel">
            <div className="panel-title-wrap">
              <ShieldAlert size={18} color="#2563eb" />
              <h3 className="panel-title">Twin Engine Recommendation</h3>
            </div>
            <div className="panel-content">
              <div className="advice-action-row">
                <span className="advice-label">Recommended Action:</span>
                {getActionChip(analysis.advice?.action)}
              </div>
              <p className="advice-reason-text">{analysis.advice?.reason}</p>
              {analysis.advice?.road_note && (
                <div className="advice-road-note">
                  <span>{analysis.advice.road_note}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 8. Repair Plan Ranked Table + Horizontal Risk Bar Chart */}
      {analysis?.repair_plan && (
        <section className="analyzer-section analyzer-plan-section">
          <div className="plan-section-header">
            <div>
              <h3 className="plan-section-title">Hypothetical Maintenance Priority Queue</h3>
              <p className="plan-section-subtitle">
                System-wide repair ranking with simulated pipe placed in its hypothetical position.
              </p>
            </div>
          </div>

          {/* Mini Horizontal Risk Bar Chart: Top 5 Pipes */}
          <div className="top5-risk-chart-card">
            <h4 className="chart-heading">Top 5 Highest Risk Assets</h4>
            <div className="risk-bars-container">
              {top5RiskPipes.map((row) => {
                const isCurrent = row.pipe === selectedPipeId;
                const pct = Math.round(row.risk * 100);
                return (
                  <div key={row.pipe} className="risk-bar-row">
                    <span className={`bar-pipe-id ${isCurrent ? 'bar-id-current' : ''}`}>
                      {row.pipe} {isCurrent && '(Analyzed)'}
                    </span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isCurrent ? '#2563eb' : row.risk >= 0.5 ? '#dc2626' : '#64748b'
                        }}
                      />
                    </div>
                    <span className="bar-val-text">{Number(row.risk ?? 0).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ranked Table */}
          <div className="plan-table-responsive-wrap">
            <table className="plan-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Pipe ID</th>
                  <th>Context</th>
                  <th>Material</th>
                  <th>Age</th>
                  <th>Sim. Press.</th>
                  <th>Health</th>
                  <th>Fail Chance</th>
                  <th>Criticality</th>
                  <th>Risk Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {analysis.repair_plan.map((row) => {
                  const isCurrent = row.pipe === selectedPipeId;
                  return (
                    <tr key={row.pipe} className={isCurrent ? 'row-analyzed-pipe' : ''}>
                      <td className="cell-rank">#{row.rank}</td>
                      <td className="cell-pipe-id">{row.pipe}</td>
                      <td>
                        {isCurrent ? (
                          <span className="badge-analyzed">Analyzed Pipe</span>
                        ) : (
                          <span className="badge-live">Live</span>
                        )}
                      </td>
                      <td className="cell-material">{row.material}</td>
                      <td>{row.age} yrs</td>
                      <td>{Number(row.pressure_bar ?? 0).toFixed(2)} bar</td>
                      <td>
                        <span
                          className={`health-tag ${row.health >= 0.75
                            ? 'tag-green'
                            : row.health >= 0.5
                              ? 'tag-amber'
                              : 'tag-red'
                            }`}
                        >
                          {Math.round(row.health * 100)}%
                        </span>
                      </td>
                      <td>{Math.round(row.failure_chance * 100)}%</td>
                      <td>{getCriticalityBadge(row.criticality)}</td>
                      <td className="cell-risk">
                        <div className="mini-risk-cell">
                          <span className="risk-num">{Number(row.risk ?? 0).toFixed(2)}</span>
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
                      <td>{getActionChip(row.action)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 9. Network Graph Highlight Section */}
      <section className="analyzer-section analyzer-graph-section">
        <div className="graph-section-header">
          <div>
            <h3 className="plan-section-title">Network Topology & Failure Projection</h3>
            <p className="plan-section-subtitle">
              Visual hydraulic schematic highlighting selected pipe <span className="highlight-id">{selectedPipeId}</span> and downstream cutoffs in red.
            </p>
          </div>
        </div>

        <div className="graph-wrapper-card">
          <NetworkGraphSVG
            nodes={networkData.nodes}
            pipes={networkData.pipes}
            selectedPipeId={selectedPipeId}
            highlightedNodeNames={analysis?.impact || []}
            onSelectPipe={(pipe) => setSelectedPipeId(pipe.id)}
            statusMap={
              analysis && selectedPipeId
                ? {
                  [selectedPipeId]: {
                    status: analysis.status,
                    pressure_bar: pressure
                  }
                }
                : {}
            }
          />
        </div>
      </section>
    </div>
  );
}

export default AnalyzerPage;
