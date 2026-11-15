import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ZapOff,
  Droplets,
  Info
} from 'lucide-react';
import { getNetwork, getPowerFailureImpact } from '../api/twinApi';
import NetworkGraphSVG from '../components/network/NetworkGraphSVG';

export function PowerFailurePage() {
  const [network, setNetwork] = useState({ nodes: [], pipes: [], transformers: [], depends_on: {} });
  const [selectedTransformerId, setSelectedTransformerId] = useState('');
  const [cascadeData, setCascadeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Load initial network and transformer list
  useEffect(() => {
    const controller = new AbortController();
    async function loadData() {
      try {
        setLoading(true);
        const netData = await getNetwork(controller.signal);
        setNetwork(netData);
        if (netData.transformers && netData.transformers.length > 0) {
          setSelectedTransformerId(netData.transformers[0].id);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load network power topology');
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
    return () => controller.abort();
  }, []);

  // 2. Load transformer power failure impact when selection changes
  useEffect(() => {
    if (!selectedTransformerId) return;
    const controller = new AbortController();
    async function fetchCascade() {
      try {
        const data = await getPowerFailureImpact(selectedTransformerId, controller.signal);
        setCascadeData(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to simulate transformer outage');
        }
      }
    }
    fetchCascade();
    return () => controller.abort();
  }, [selectedTransformerId]);

  if (loading) {
    return (
      <div className="analyzer-loading-state">
        <Activity className="spinning" size={32} color="#2563eb" />
        <p>Loading electrical & hydraulic grid cross-layer dependencies...</p>
      </div>
    );
  }

  // Find pipes whose water supply is cut off by this power outage
  const waterCutNodeNames = new Set(cascadeData?.water_cascade || []);
  const waterCutPipes = network.pipes
    .filter((pipe) => {
      const u = network.nodes.find((n) => n.id === pipe.from);
      const v = network.nodes.find((n) => n.id === pipe.to);
      return (u && waterCutNodeNames.has(u.name)) || (v && waterCutNodeNames.has(v.name));
    })
    .map((p) => p.id);

  return (
    <div className="power-failure-page-root">
      {/* Header */}
      <div className="power-header-row">
        <div>
          <h2 className="power-page-title">Power Grid Outage & Hydraulic Cascade Simulator</h2>
          <p className="power-page-subtitle">
            Simulate substation and transformer trips to project cyber-physical cascades across water pumping stations and public health facilities.
          </p>
        </div>
      </div>

      {error && (
        <div className="analyzer-error-banner">
          <AlertTriangle size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      {/* Simulator Control Card */}
      <section className="power-control-card">
        <div className="power-control-inner">
          <div className="power-select-wrap">
            <label htmlFor="transformer-select" className="control-label">
              Select Substation Transformer:
            </label>
            <select
              id="transformer-select"
              className="control-select"
              value={selectedTransformerId}
              onChange={(e) => setSelectedTransformerId(e.target.value)}
            >
              {network.transformers.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.id} — {tr.name} ({Math.round((tr.load || 0.7) * 100)}% load)
                </option>
              ))}
            </select>
          </div>

          <div className="power-status-indicator-box">
            <span className="power-pill-label">Simulated State:</span>
            <span className="power-status-badge badge-tripped">
              <ZapOff size={14} /> Outage Simulated (Trip)
            </span>
          </div>
        </div>
      </section>

      {/* Cascade Impact Results Grid */}
      <section className="power-impact-cards-grid">
        {/* Direct Power Loss */}
        <div className="power-result-card card-electricity">
          <div className="card-top-header">
            <div className="icon-badge badge-amber">
              <ZapOff size={20} />
            </div>
            <div>
              <h3 className="card-result-title">Direct Electricity Outage</h3>
              <span className="card-result-subtitle">Facilities directly losing primary power feed</span>
            </div>
          </div>

          <div className="card-result-body">
            {cascadeData?.power_loss && cascadeData.power_loss.length > 0 ? (
              <div className="outage-list">
                {cascadeData.power_loss.map((asset) => (
                  <div key={asset} className="outage-asset-item">
                    <ZapOff size={15} color="#dc2626" />
                    <span className="asset-name-text">{asset}</span>
                    <span className="asset-tag-crit">Emergency Power Only</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="safe-feedback-row">
                <Info size={16} color="#64748b" />
                <span>No critical public facilities directly mapped to this transformer feed.</span>
              </div>
            )}
          </div>
        </div>

        {/* Downstream Water Cascade */}
        <div className="power-result-card card-water">
          <div className="card-top-header">
            <div className="icon-badge badge-teal">
              <Droplets size={20} />
            </div>
            <div>
              <h3 className="card-result-title">Downstream Water Supply Loss</h3>
              <span className="card-result-subtitle">Pumping stations halted causing hydraulic drop</span>
            </div>
          </div>

          <div className="card-result-body">
            {cascadeData?.water_cascade && cascadeData.water_cascade.length > 0 ? (
              <div className="water-cascade-tags-wrap">
                {cascadeData.water_cascade.map((nodeName) => (
                  <span key={nodeName} className="water-cut-chip">
                    <Droplets size={13} color="#0284c7" />
                    <span>{nodeName}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="safe-feedback-row">
                <Info size={16} color="#64748b" />
                <span>Pumping stations retain uninterrupted grid power.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Network Schematic with Power Failure Overlay */}
      <section className="power-schematic-section">
        <div className="schematic-header">
          <div>
            <h3 className="schematic-title">Cross-Domain Failure Topology</h3>
            <p className="schematic-subtitle">
              Visualizing electrical failure consequences on water distribution: water-cut pipes turn dashed grey, pump facilities are highlighted in red.
            </p>
          </div>
        </div>

        <div className="schematic-svg-card">
          <NetworkGraphSVG
            nodes={network.nodes}
            pipes={network.pipes}
            highlightedNodeNames={cascadeData?.water_cascade || []}
            disabledNodeNames={cascadeData?.power_loss || []}
            highlightedPipeIds={waterCutPipes}
            width={620}
            height={500}
          />
        </div>
      </section>
    </div>
  );
}

export default PowerFailurePage;
