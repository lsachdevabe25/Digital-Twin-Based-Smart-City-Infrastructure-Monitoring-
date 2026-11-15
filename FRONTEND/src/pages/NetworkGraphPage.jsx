import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Info, MapPin, Gauge, Shield, RefreshCw } from 'lucide-react';
import { getNetwork, getStatus, getImpact, getRepairPlan } from '../api/twinApi';
import NetworkGraphSVG from '../components/network/NetworkGraphSVG';

const CURRENT_YEAR = new Date().getFullYear();

export function NetworkGraphPage() {
  const [network, setNetwork] = useState({ nodes: [], pipes: [], transformers: [], depends_on: {} });
  const [statusMap, setStatusMap] = useState({});
  const [selectedPipe, setSelectedPipe] = useState(null);
  const [pipeImpact, setPipeImpact] = useState(null);
  const [repairPlanMap, setRepairPlanMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Initial load: network and repair plan
  useEffect(() => {
    const controller = new AbortController();
    async function loadInitial() {
      try {
        setLoading(true);
        const [netData, planData] = await Promise.all([
          getNetwork(controller.signal),
          getRepairPlan(controller.signal)
        ]);

        setNetwork(netData);
        if (netData.pipes && netData.pipes.length > 0) {
          setSelectedPipe(netData.pipes[0]);
        }

        const pMap = {};
        for (const row of planData) {
          pMap[row.pipe] = row;
        }
        setRepairPlanMap(pMap);

        const sMap = {};
        for (const p of netData.pipes) {
          sMap[p.id] = { status: p.status, pressure_bar: p.pressure_bar };
        }
        setStatusMap(sMap);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load network topology');
        }
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
    return () => controller.abort();
  }, []);

  // Fetch single pipe impact when selected
  useEffect(() => {
    if (!selectedPipe) {
      setPipeImpact(null);
      return;
    }
    const controller = new AbortController();
    async function fetchPipeImpact() {
      try {
        const impactData = await getImpact(selectedPipe.id, controller.signal);
        setPipeImpact(impactData);
      } catch {
        // Fallback gracefully
        setPipeImpact(null);
      }
    }
    fetchPipeImpact();
    return () => controller.abort();
  }, [selectedPipe]);

  // 5-second polling of GET /status (pause when tab hidden, clean up on unmount)
  useEffect(() => {
    let active = true;
    let pollController = null;

    const pollStatus = async () => {
      if (document.visibilityState !== 'visible' || !active) return;
      pollController = new AbortController();
      try {
        const liveStatuses = await getStatus(pollController.signal);
        if (active) {
          setStatusMap(liveStatuses);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } catch {
        // Ignore polling network blips
      }
    };

    const intervalId = setInterval(pollStatus, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void pollStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      clearInterval(intervalId);
      if (pollController) pollController.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const currentPlan = selectedPipe ? repairPlanMap[selectedPipe.id] : null;
  const currentLiveStatus = selectedPipe ? statusMap[selectedPipe.id]?.status || selectedPipe.status : 'operational';
  const currentLivePressure = selectedPipe ? statusMap[selectedPipe.id]?.pressure_bar ?? selectedPipe.pressure_bar : 0;

  if (loading) {
    return (
      <div className="analyzer-loading-state">
        <Activity className="spinning" size={32} color="#2563eb" />
        <p>Loading hydraulic network graph & telemetry...</p>
      </div>
    );
  }

  return (
    <div className="network-graph-page-root">
      {/* Top Banner / Sync Indicator */}
      <div className="graph-page-header">
        <div>
          <h2 className="graph-page-title">Hydraulic Network Topology</h2>
          <p className="graph-page-subtitle">
            Interactive schema of municipal pipelines, junctions, reservoirs, and public institutions.
          </p>
        </div>
        <div className="graph-polling-indicator">
          <RefreshCw size={13} className="spin-slow" color="#0d9488" />
          <span>Polling status every 5s • Last sync: {lastUpdated}</span>
        </div>
      </div>

      {error && (
        <div className="analyzer-error-banner">
          <AlertTriangle size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Interactive Graph + Details Inspector */}
      <div className="graph-layout-grid">
        {/* Left: SVG Diagram */}
        <div className="graph-main-card">
          <div className="graph-legend-bar">
            <span className="legend-item">
              <span className="legend-dot dot-teal" /> Operational
            </span>
            <span className="legend-item">
              <span className="legend-dot dot-red" /> Leak Suspected (&lt;1.0 bar)
            </span>
            <span className="legend-item">
              <span className="legend-dot dot-slate" /> Low Flow / No Power
            </span>
            <span className="legend-item">
              <span className="legend-box box-blue" /> Selected Pipe
            </span>
          </div>

          <NetworkGraphSVG
            nodes={network.nodes}
            pipes={network.pipes}
            selectedPipeId={selectedPipe?.id}
            statusMap={statusMap}
            highlightedNodeNames={pipeImpact?.affected || []}
            onSelectPipe={(pipe) => setSelectedPipe(pipe)}
            width={620}
            height={500}
          />
        </div>

        {/* Right: Details Inspector */}
        <div className="pipe-inspector-card">
          <div className="inspector-header">
            <Info size={18} color="#2563eb" />
            <h3 className="inspector-title">Pipe Telemetry Inspector</h3>
          </div>

          {selectedPipe ? (
            <div className="inspector-content">
              {/* Pipe ID & Live Status */}
              <div className="inspector-id-block">
                <span className="inspector-pipe-id">{selectedPipe.id}</span>
                <span
                  className={`inspector-status-chip status-${
                    currentLiveStatus === 'operational' ? 'green' : 'red'
                  }`}
                >
                  {currentLiveStatus.toUpperCase()}
                </span>
              </div>

              {/* Data Table */}
              <div className="inspector-spec-grid">
                <div className="spec-row">
                  <span className="spec-label">Material</span>
                  <span className="spec-val">{selectedPipe.material}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Install Year</span>
                  <span className="spec-val">
                    {selectedPipe.install_year} ({CURRENT_YEAR - selectedPipe.install_year} yrs)
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Live Pressure</span>
                  <span className="spec-val spec-pressure">
                    <Gauge size={14} />
                    {currentLivePressure.toFixed(2)} bar
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Municipal Road</span>
                  <span className="spec-val">{selectedPipe.road || 'Unmapped'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Health Score</span>
                  <span className="spec-val">
                    {currentPlan ? `${Math.round(currentPlan.health * 100)}%` : '--'}
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Calculated Risk</span>
                  <span className="spec-val spec-risk">
                    <Shield size={14} />
                    {currentPlan ? currentPlan.risk.toFixed(2) : '--'}
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Alternate Route</span>
                  <span className="spec-val">
                    {pipeImpact?.has_backup ? 'Available (Yes)' : 'None (No)'}
                  </span>
                </div>
              </div>

              {/* Downstream Water Loss Impact */}
              <div className="inspector-impact-section">
                <span className="impact-section-label">
                  <MapPin size={14} /> Downstream Impact if Failed:
                </span>
                {pipeImpact?.affected && pipeImpact.affected.length > 0 ? (
                  <div className="inspector-impact-tags">
                    {pipeImpact.affected.map((name) => (
                      <span key={name} className="impact-tag tag-warning">
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="impact-none-text">No service interruptions (failover active).</p>
                )}
              </div>

              {/* Engine Advice */}
              {currentPlan?.advice && (
                <div className="inspector-advice-box">
                  <span className="inspector-advice-label">Maintenance Queue:</span>
                  <span className="inspector-advice-action">Rank #{currentPlan.rank} • {currentPlan.advice}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="inspector-placeholder">Click any pipe in the graph to inspect live telemetry.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default NetworkGraphPage;
