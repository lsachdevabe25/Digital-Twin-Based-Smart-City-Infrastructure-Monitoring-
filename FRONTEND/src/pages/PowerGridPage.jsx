import React, { useState, useEffect } from 'react';
import {
  Zap,
  AlertTriangle,
  Droplets,
  Activity,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { getPowerFailureImpact } from '../api/twinApi';
import Badge from '../components/common/Badge';

const SAMPLE_TRANSFORMERS = [
  { id: 'TR-01', name: 'Substation Alpha - Civic & Hospital Grid', zone: 'Metro Core', capacity: '45 MVA' },
  { id: 'TR-02', name: 'Substation Beta - Water Treatment & Pump Facility', zone: 'Industrial Valley', capacity: '35 MVA' },
  { id: 'TR-03', name: 'Substation Gamma - East Residential & Logistics', zone: 'East Harbor', capacity: '25 MVA' },
  { id: 'TR-04', name: 'Substation Delta - North Technology Hub', zone: 'Tech Park', capacity: '50 MVA' }
];

export function PowerGridPage() {
  const [selectedTransformer, setSelectedTransformer] = useState('TR-02');
  const [loading, setLoading] = useState(false);
  const [impactData, setImpactData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchImpact = async () => {
      setLoading(true);
      try {
        const res = await getPowerFailureImpact(selectedTransformer);
        if (isMounted && res) {
          setImpactData(res);
        }
      } catch {
        // Fallback simulated projection if backend endpoint is not yet connected
        if (isMounted) {
          const isPumpStation = selectedTransformer === 'TR-02';
          const isHospital = selectedTransformer === 'TR-01';

          setImpactData({
            transformer_id: selectedTransformer,
            severity: isHospital ? 'High' : isPumpStation ? 'Critical' : 'Medium',
            assets_losing_power: isHospital
              ? ['Metro Civic Hospital Emergency Grid', 'Traffic Light Grid Central', 'Civic Communications Mast']
              : isPumpStation
              ? ['Water Treatment Facility #1', 'High-Pressure Booster Pump 04', 'Main Reservoir Tank Pump']
              : ['Commercial Harbor Crane Grid', 'Logistics Warehouse Bay 3', 'Street Lighting Sector 4'],
            downstream_water_impact: isPumpStation
              ? ['Primary pumps shut down: Pressure drops below 1.2 bar in Sector B', 'Tank supply drains in ~4 hours without auxiliary power', 'Water service interruption to ~14,200 residents']
              : isHospital
              ? ['Hospital auxiliary water booster engaged', 'No major municipal main disruptions']
              : ['No direct municipal water supply interruption projected'],
            estimated_repair_time: '2 - 3.5 hours',
            backup_generator_status: isHospital ? 'Engaged (99.8% load)' : 'Standby'
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchImpact();
    return () => {
      isMounted = false;
    };
  }, [selectedTransformer]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="water-header-row">
        <div className="water-header-left">
          <div className="water-icon-badge" style={{ backgroundColor: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
            <Zap size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="water-page-title">Power Grid & Transformer Cascade Analysis</h1>
            <p className="water-page-subtitle">
              Simulate electrical substation failures to project power loss and downstream water pumping impacts
            </p>
          </div>
        </div>

        <div className="water-header-actions">
          <Badge variant="teal" size="sm">
            Cascade Engine Active
          </Badge>
        </div>
      </div>

      {/* Grid Summary Row */}
      <div className="water-kpi-grid">
        <div className="water-kpi-card">
          <div className="water-kpi-top">
            <span className="water-kpi-label">Primary Transformers</span>
            <Zap size={16} color="var(--accent-blue)" />
          </div>
          <span className="water-kpi-value">4 Units</span>
          <span className="water-kpi-desc">Total capacity: 155 MVA</span>
        </div>

        <div className="water-kpi-card">
          <div className="water-kpi-top">
            <span className="water-kpi-label">Active Power Load</span>
            <Activity size={16} color="var(--accent-teal)" />
          </div>
          <span className="water-kpi-value">142.8 MW</span>
          <span className="water-kpi-desc">Load factor: 74.2%</span>
        </div>

        <div className="water-kpi-card">
          <div className="water-kpi-top">
            <span className="water-kpi-label">Grid Health Index</span>
            <ShieldCheck size={16} color="var(--accent-teal)" />
          </div>
          <span className="water-kpi-value">98.4%</span>
          <span className="water-kpi-desc">All substations nominal</span>
        </div>

        <div className="water-kpi-card">
          <div className="water-kpi-top">
            <span className="water-kpi-label">Water Pump Interdependence</span>
            <Droplets size={16} color="var(--accent-blue)" />
          </div>
          <span className="water-kpi-value">3 Pumping Stations</span>
          <span className="water-kpi-desc">Connected to Substation Beta</span>
        </div>
      </div>

      {/* Main Analysis Container */}
      <div className="water-split-grid">
        {/* Substation Selector & Details */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <h2 className="panel-card-title">Select Substation Transformer</h2>
              <p className="panel-card-subtitle">Choose an electrical node to evaluate power cascade</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {SAMPLE_TRANSFORMERS.map((tr) => {
              const isSelected = selectedTransformer === tr.id;
              return (
                <div
                  key={tr.id}
                  onClick={() => setSelectedTransformer(tr.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                    backgroundColor: isSelected ? 'var(--accent-blue-light)' : 'var(--bg-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {tr.id}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {tr.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Zone: {tr.zone} • Capacity: {tr.capacity}
                    </div>
                  </div>

                  <Badge variant={isSelected ? 'info' : 'neutral'} size="sm">
                    {isSelected ? 'Selected' : 'Simulate'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cascade Impact Results */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <h2 className="panel-card-title">Downstream Failure & Water Impact</h2>
              <p className="panel-card-subtitle">
                Projected losses when {selectedTransformer} undergoes outage
              </p>
            </div>
            {impactData && (
              <Badge
                variant={
                  impactData.severity === 'Critical'
                    ? 'warning'
                    : impactData.severity === 'High'
                    ? 'warning'
                    : 'teal'
                }
                size="sm"
              >
                Severity: {impactData.severity}
              </Badge>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={20} className="spinning" style={{ display: 'inline-block', marginBottom: '8px' }} />
              <div>Calculating power & water cascade models...</div>
            </div>
          ) : impactData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Assets losing power */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Critical Assets Losing Power:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {impactData.assets_losing_power?.map((asset, idx) => (
                    <div
                      key={`asset-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        backgroundColor: '#fef2f2',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid #fecaca',
                        fontSize: '12px',
                        color: '#991b1b',
                        fontWeight: 500
                      }}
                    >
                      <AlertTriangle size={13} />
                      <span>{asset}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Downstream water impact */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Downstream Hydraulic Water Impact:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {impactData.downstream_water_impact?.map((impact, idx) => (
                    <div
                      key={`water-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border-default)',
                        fontSize: '12px',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <Droplets size={13} color="var(--accent-blue)" />
                      <span>{impact}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status footer */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: 'var(--text-muted)'
                }}
              >
                <span>Estimated restoration time: <strong>{impactData.estimated_repair_time}</strong></span>
                <span>Auxiliary status: <strong>{impactData.backup_generator_status}</strong></span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default PowerGridPage;
