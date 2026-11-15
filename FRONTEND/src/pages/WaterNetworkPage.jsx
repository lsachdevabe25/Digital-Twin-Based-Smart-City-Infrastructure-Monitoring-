import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Droplets,
  AlertTriangle,
  RefreshCw,
  Send,
  CheckCircle2,
  ServerOff,
  Activity,
  ArrowRight
} from 'lucide-react';
import {
  getStatus,
  getAlerts,
  getRepairPlan,
  getHistory,
  postWhatIf,
  postSensorReading
} from '../api/twinApi';
import { useBackendStatus } from '../context/BackendStatusContext';
import Badge from '../components/common/Badge';
import '../styles/waterNetwork.css';

// Default topological layout coordinates for Rampur Water Network
const DEFAULT_TOPOLOGY = {
  nodes: {
    'N-Reservoir': { id: 'N-Reservoir', label: 'Main Reservoir', x: 70, y: 160, type: 'reservoir' },
    'N-Tank': { id: 'N-Tank', label: 'Elevated Tank', x: 230, y: 70, type: 'tank' },
    'N-Junction1': { id: 'N-Junction1', label: 'Junction Core', x: 230, y: 160, type: 'junction' },
    'N-Junction2': { id: 'N-Junction2', label: 'South Junction', x: 230, y: 260, type: 'junction' },
    'N-Hospital': { id: 'N-Hospital', label: 'Hospital Zone', x: 390, y: 70, type: 'hospital' },
    'N-School': { id: 'N-School', label: 'School Sector', x: 390, y: 190, type: 'school' },
    'N-Industrial': { id: 'N-Industrial', label: 'Industrial Park', x: 400, y: 270, type: 'industrial' },
    'N-Residential': { id: 'N-Residential', label: 'East Residential', x: 530, y: 140, type: 'residential' }
  },
  pipes: {
    'P-01': { from: 'N-Reservoir', to: 'N-Junction1', road: 'MG Road Trunk', material: 'Ductile Iron', year: 2012 },
    'P-02': { from: 'N-Junction1', to: 'N-Tank', road: 'Ridge Tank Ascent', material: 'Cast Iron', year: 2004 },
    'P-03': { from: 'N-Tank', to: 'N-Hospital', road: 'Civil Lines Boulevard', material: 'Steel', year: 2018 },
    'P-04': { from: 'N-Junction1', to: 'N-School', road: 'Nehru Colony Lane', material: 'HDPE', year: 2020 },
    'P-05': { from: 'N-Junction1', to: 'N-Junction2', road: 'Ring Road Bypass', material: 'Ductile Iron', year: 2014 },
    'P-06': { from: 'N-Junction2', to: 'N-Industrial', road: 'GIDC Connector', material: 'Cast Iron', year: 2001 },
    'P-07': { from: 'N-School', to: 'N-Residential', road: 'Gandhi Chowk Way', material: 'HDPE', year: 2021 },
    'P-08': { from: 'N-Hospital', to: 'N-Residential', road: 'Subhash Marg Loop', material: 'Steel', year: 2017 }
  }
};

export function WaterNetworkPage() {
  // Data States
  const [pipeStatusMap, setPipeStatusMap] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [repairPlan, setRepairPlan] = useState([]);

  // Connection & Polling State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Inspector & History States
  const [selectedPipe, setSelectedPipe] = useState('P-01');
  const [pipeHistory, setPipeHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // What-If Simulator States
  const [selectedPipesForWhatIf, setSelectedPipesForWhatIf] = useState([]);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfError, setWhatIfError] = useState(null);

  // Send Test Reading Form States
  const [testPipeId, setTestPipeId] = useState('P-01');
  const [testPressure, setTestPressure] = useState('3.8');
  const [testInputError, setTestInputError] = useState(null);
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState(null);

  // Backend Context Reporter
  const { reportSuccess, reportFailure } = useBackendStatus();

  // In-flight guard to prevent multiple concurrent requests
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef(null);

  /**
   * Fetch all water network data
   */
  const fetchData = useCallback(async (isManual = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (isManual) setIsRefreshing(true);

    // Cancel prior request if ongoing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const [statusRes, alertsRes, repairPlanRes] = await Promise.all([
        getStatus(signal),
        getAlerts(signal).catch(() => []),
        getRepairPlan(signal).catch(() => [])
      ]);

      setPipeStatusMap(statusRes || {});
      setAlerts(Array.isArray(alertsRes) ? alertsRes : []);
      setRepairPlan(Array.isArray(repairPlanRes) ? repairPlanRes : []);
      setError(null);
      reportSuccess();

      // Ensure testPipeId and selectedPipe are set
      const pipeKeys = Object.keys(statusRes || {});
      if (pipeKeys.length > 0) {
        if (!testPipeId) setTestPipeId(pipeKeys[0]);
        if (!selectedPipe) setSelectedPipe(pipeKeys[0]);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch water network data:', err);
      setError(err.message || 'Cannot reach FastAPI backend server.');
      reportFailure();
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, [testPipeId, selectedPipe, reportSuccess, reportFailure]);

  /**
   * Fetch history readings for selected pipe
   */
  const fetchPipeHistory = useCallback(async (pipeId) => {
    if (!pipeId) return;
    setHistoryLoading(true);
    try {
      const res = await getHistory(pipeId, 50);
      if (Array.isArray(res)) {
        // Normalize history format
        const formatted = res.map((item, idx) => ({
          time: item.timestamp || item.time || `T-${res.length - idx}`,
          pressure: item.value ?? item.pressure_bar ?? 0
        }));
        setPipeHistory(formatted);
      } else {
        setPipeHistory([]);
      }
    } catch {
      // If endpoint not yet populated, set empty history
      setPipeHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Update history whenever selected pipe changes
  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      if (active) {
        await fetchPipeHistory(selectedPipe);
      }
    };
    void loadHistory();
    return () => {
      active = false;
    };
  }, [selectedPipe, fetchPipeHistory]);

  // 5-Second Polling with visibility awareness and cleanup
  useEffect(() => {
    let active = true;
    const initialFetch = async () => {
      if (active) {
        await fetchData();
      }
    };
    void initialFetch();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && active) {
        void fetchData();
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && active) {
        void fetchData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Derived Summary Metrics
  const pipeEntries = Object.entries(pipeStatusMap).map(([id, val]) => ({
    id,
    status: (val.status || 'operational').toLowerCase(),
    pressure_bar: val.pressure_bar ?? 0
  }));

  const totalPipes = pipeEntries.length;
  const leakSuspectedPipes = pipeEntries.filter(
    (p) => p.status.includes('leak') || p.status.includes('critical')
  );
  const watchPipes = pipeEntries.filter((p) => p.status.includes('watch'));
  const avgPressure = totalPipes > 0
    ? (pipeEntries.reduce((acc, p) => acc + (parseFloat(p.pressure_bar) || 0), 0) / totalPipes).toFixed(2)
    : '0.00';

  /**
   * Handle What-If Multi-Select Toggle
   */
  const handleTogglePipeSelection = (pipeId) => {
    setSelectedPipesForWhatIf((prev) =>
      prev.includes(pipeId)
        ? prev.filter((id) => id !== pipeId)
        : [...prev, pipeId]
    );
  };

  /**
   * Run What-If Simulation
   */
  const handleRunWhatIf = async () => {
    if (selectedPipesForWhatIf.length === 0) return;
    setWhatIfLoading(true);
    setWhatIfError(null);
    try {
      const result = await postWhatIf(selectedPipesForWhatIf);
      setWhatIfResult(result);
    } catch (err) {
      console.error('What-If simulation failed:', err);
      setWhatIfError(err.message || 'Simulation request failed.');
    } finally {
      setWhatIfLoading(false);
    }
  };

  /**
   * Handle Send Test Sensor Reading with Strict Input Validation
   */
  const handleSendTestReading = async (e) => {
    e.preventDefault();
    setTestInputError(null);
    setTestFeedback(null);

    // Validation
    const rawVal = testPressure.trim();
    if (!rawVal) {
      setTestInputError('Pressure value is required.');
      return;
    }

    const numVal = Number(rawVal);
    if (isNaN(numVal)) {
      setTestInputError('Pressure value must be a valid number.');
      return;
    }

    if (!isFinite(numVal)) {
      setTestInputError('Pressure value must be finite.');
      return;
    }

    if (numVal < 0) {
      setTestInputError('Pressure value cannot be negative.');
      return;
    }

    if (numVal > 15) {
      setTestInputError('Pressure exceeds maximum allowable sensor threshold (15.0 bar).');
      return;
    }

    setTestSending(true);
    try {
      await postSensorReading(testPipeId, numVal, 'pressure_bar');
      setTestFeedback({
        type: 'success',
        message: `Successfully transmitted ${numVal.toFixed(2)} bar for ${testPipeId}. Telemetry refreshing...`
      });
      // Refresh telemetry and history immediately
      await fetchData(true);
      fetchPipeHistory(testPipeId);
    } catch (err) {
      console.error('Post sensor reading error:', err);
      setTestFeedback({
        type: 'error',
        message: err.message || 'Failed to submit sensor reading.'
      });
    } finally {
      setTestSending(false);
      setTimeout(() => setTestFeedback(null), 5000);
    }
  };

  /**
   * Pipe Status Chip Renderer
   */
  const renderStatusChip = (statusStr) => {
    const s = (statusStr || '').toLowerCase();
    if (s.includes('leak') || s.includes('critical')) {
      return (
        <span className="pipe-status-chip chip-leak">
          <span className="chip-dot" />
          {statusStr || 'Leak Suspected'}
        </span>
      );
    }
    if (s.includes('watch') || s.includes('warn')) {
      return (
        <span className="pipe-status-chip chip-watch">
          <span className="chip-dot" />
          {statusStr || 'Watch'}
        </span>
      );
    }
    return (
      <span className="pipe-status-chip chip-operational">
        <span className="chip-dot" />
        {statusStr || 'Operational'}
      </span>
    );
  };

  // Lookup details for inspected pipe
  const selectedPipeData = pipeStatusMap[selectedPipe] || {};
  const selectedPipeMeta = DEFAULT_TOPOLOGY.pipes[selectedPipe] || {
    road: 'Central Municipal Route',
    material: 'Standard Ductile Iron',
    year: 2015
  };
  const selectedPipeRepair = repairPlan.find((r) => r.pipe === selectedPipe);

  /* ------------------------------------------------------------------------
     1. Initial Loading State
     ------------------------------------------------------------------------ */
  if (loading && totalPipes === 0 && !error) {
    return (
      <div className="water-state-card">
        <div className="water-state-icon loading">
          <RefreshCw size={22} className="spinning" />
        </div>
        <div>
          <h2 className="water-state-title">Connecting to Water Network Backend</h2>
          <p className="water-state-desc">
            Querying hydraulic telemetry from FastAPI endpoints at <code>http://127.0.0.1:8000</code>...
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------
     2. Backend Unreachable Error State with Retry Button
     ------------------------------------------------------------------------ */
  if (error && totalPipes === 0) {
    return (
      <div className="water-state-card">
        <div className="water-state-icon error">
          <ServerOff size={22} />
        </div>
        <div>
          <h2 className="water-state-title">Unable to Connect to Backend</h2>
          <p className="water-state-desc">
            Could not reach the FastAPI service at <code>http://127.0.0.1:8000</code>.
            Ensure your backend is running (`uvicorn main:app --reload`) and that CORS allows requests from this origin.
          </p>
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
            Error detail: {error}
          </div>
        </div>
        <button
          type="button"
          className="water-retry-btn"
          onClick={() => {
            setLoading(true);
            fetchData(true);
          }}
        >
          <RefreshCw size={14} />
          Retry Connection
        </button>
      </div>
    );
  }

  /* ------------------------------------------------------------------------
     3. Empty State
     ------------------------------------------------------------------------ */
  if (!loading && totalPipes === 0) {
    return (
      <div className="water-state-card">
        <div className="water-state-icon">
          <Droplets size={22} color="var(--accent-blue)" />
        </div>
        <div>
          <h2 className="water-state-title">No Water Network Data Available</h2>
          <p className="water-state-desc">
            The endpoint <code>/status</code> returned an empty dataset. Try sending a test sensor reading below to initialize nodes.
          </p>
        </div>
        <button
          type="button"
          className="water-retry-btn"
          onClick={() => fetchData(true)}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
    );
  }

  /* ------------------------------------------------------------------------
     4. Main Water Network Telemetry View
     ------------------------------------------------------------------------ */
  return (
    <div className="water-network-page">
      {/* Page Title & Connection Indicator Header */}
      <div className="water-header-row">
        <div className="water-header-left">
          <div className="water-icon-badge">
            <Droplets size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="water-page-title">Municipal Water Distribution Telemetry</h1>
            <p className="water-page-subtitle">
              Live hydraulic telemetry, pipe leak analysis, and automated repair schedules
            </p>
          </div>
        </div>

        <div className="water-header-actions">
          <div className="water-backend-badge">
            <span className="water-live-dot" />
            <span>FastAPI Connected (5s Polling)</span>
          </div>

          <button
            type="button"
            className="water-refresh-btn"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw size={13} className={isRefreshing ? 'spinning' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards Grid */}
      <div className="water-kpi-grid">
        <div className="water-kpi-card">
          <div className="water-kpi-top">
            <span className="water-kpi-label">Monitored Pipes</span>
            <Activity size={16} color="var(--accent-blue)" />
          </div>
          <span className="water-kpi-value">{totalPipes}</span>
          <span className="water-kpi-desc">Connected hydraulic segments</span>
        </div>

        <div className="water-kpi-card">
          <div className="water-kpi-top">
            <span className="water-kpi-label">Leak Suspected</span>
            <AlertTriangle size={16} color="#dc2626" />
          </div>
          <span className="water-kpi-value" style={{ color: leakSuspectedPipes.length > 0 ? '#dc2626' : 'var(--text-primary)' }}>
            {leakSuspectedPipes.length}
          </span>
          <span className="water-kpi-desc">3+ consecutive low readings</span>
        </div>

        <div className="water-kpi-card">
          <div className="water-kpi-top">
            <span className="water-kpi-label">Pipes on Watch</span>
            <AlertTriangle size={16} color="var(--status-warning-text)" />
          </div>
          <span className="water-kpi-value" style={{ color: watchPipes.length > 0 ? 'var(--status-warning-text)' : 'var(--text-primary)' }}>
            {watchPipes.length}
          </span>
          <span className="water-kpi-desc">Elevated risk or falling pressure</span>
        </div>

        <div className="water-kpi-card">
          <div className="water-kpi-top">
            <span className="water-kpi-label">Average Pressure</span>
            <Droplets size={16} color="var(--accent-teal)" />
          </div>
          <span className="water-kpi-value">{avgPressure} bar</span>
          <span className="water-kpi-desc">Normal baseline: 3.5 - 4.5 bar</span>
        </div>
      </div>

      {/* Pipe Network View (SVG Diagram) & Inspector Panel */}
      <div className="panel-card">
        <div className="panel-card-header">
          <div>
            <h2 className="panel-card-title">Interactive Pipe Network Topology Diagram</h2>
            <p className="panel-card-subtitle">
              Visual map of hydraulic pipes and nodal delivery points. Click any pipe to inspect telemetry.
            </p>
          </div>
          <Badge variant="teal" size="sm">
            SVG Topology Engine
          </Badge>
        </div>

        <div className="water-split-grid" style={{ alignItems: 'start' }}>
          {/* SVG Diagram Canvas */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <svg
              viewBox="0 0 600 340"
              style={{ width: '100%', height: 'auto', maxHeight: '340px' }}
            >
              <defs>
                <pattern id="networkGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2edf8" strokeWidth="0.8" />
                </pattern>
              </defs>

              <rect width="600" height="340" fill="url(#networkGrid)" />

              {/* Render Connecting Pipes */}
              {Object.entries(DEFAULT_TOPOLOGY.pipes).map(([pipeId, def]) => {
                const nodeFrom = DEFAULT_TOPOLOGY.nodes[def.from];
                const nodeTo = DEFAULT_TOPOLOGY.nodes[def.to];
                if (!nodeFrom || !nodeTo) return null;

                const status = (pipeStatusMap[pipeId]?.status || 'operational').toLowerCase();
                const isSelected = selectedPipe === pipeId;
                const isWhatIfSimulated = selectedPipesForWhatIf.includes(pipeId);

                let strokeColor = 'var(--accent-teal)'; // operational
                if (status.includes('leak') || status.includes('critical')) {
                  strokeColor = '#dc2626'; // leak
                } else if (status.includes('watch') || status.includes('warn')) {
                  strokeColor = 'var(--status-warning-text)'; // watch
                }

                if (isWhatIfSimulated) {
                  strokeColor = '#991b1b';
                }

                const midX = (nodeFrom.x + nodeTo.x) / 2;
                const midY = (nodeFrom.y + nodeTo.y) / 2;

                return (
                  <g
                    key={`topo-pipe-${pipeId}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedPipe(pipeId);
                      setTestPipeId(pipeId);
                    }}
                  >
                    {/* Pipe background click target */}
                    <line
                      x1={nodeFrom.x}
                      y1={nodeFrom.y}
                      x2={nodeTo.x}
                      y2={nodeTo.y}
                      stroke="transparent"
                      strokeWidth={16}
                    />
                    {/* Visual Pipe Line */}
                    <line
                      x1={nodeFrom.x}
                      y1={nodeFrom.y}
                      x2={nodeTo.x}
                      y2={nodeTo.y}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 5 : isWhatIfSimulated ? 4.5 : 3.5}
                      strokeDasharray={isWhatIfSimulated ? '6 4' : undefined}
                      strokeLinecap="round"
                    />
                    {/* Pipe Tag Pill */}
                    <rect
                      x={midX - 18}
                      y={midY - 9}
                      width={36}
                      height={18}
                      rx={4}
                      fill={isSelected ? 'var(--text-primary)' : '#ffffff'}
                      stroke={strokeColor}
                      strokeWidth={1.5}
                    />
                    <text
                      x={midX}
                      y={midY + 4}
                      fontSize={9}
                      fontWeight={700}
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                      fill={isSelected ? '#ffffff' : 'var(--text-primary)'}
                    >
                      {pipeId}
                    </text>
                  </g>
                );
              })}

              {/* Render Topological Delivery Nodes */}
              {Object.values(DEFAULT_TOPOLOGY.nodes).map((node) => {
                const isAffectedByWhatIf =
                  whatIfResult &&
                  whatIfResult.affected &&
                  (Array.isArray(whatIfResult.affected)
                    ? whatIfResult.affected.some((a) =>
                        a.toLowerCase().includes(node.label.toLowerCase()) ||
                        a.toLowerCase().includes(node.type.toLowerCase())
                      )
                    : String(whatIfResult.affected).toLowerCase().includes(node.label.toLowerCase()));

                return (
                  <g key={`topo-node-${node.id}`} transform={`translate(${node.x}, ${node.y})`}>
                    {/* Highlight circle if impacted by What-If simulation */}
                    {isAffectedByWhatIf && (
                      <circle r={22} fill="#fef2f2" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="3 3" />
                    )}
                    <circle
                      r={14}
                      fill="#ffffff"
                      stroke={isAffectedByWhatIf ? '#dc2626' : 'var(--border-default)'}
                      strokeWidth={2}
                    />
                    <circle
                      r={6}
                      fill={
                        node.type === 'reservoir'
                          ? 'var(--accent-blue)'
                          : node.type === 'hospital'
                          ? '#dc2626'
                          : isAffectedByWhatIf
                          ? '#dc2626'
                          : 'var(--accent-teal)'
                      }
                    />
                    <text
                      y={24}
                      fontSize={10}
                      fontWeight={600}
                      textAnchor="middle"
                      fill="var(--text-primary)"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div style={{ display: 'flex', gap: '14px', marginTop: '12px', fontSize: '11px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '12px', height: '3px', backgroundColor: 'var(--accent-teal)' }} /> Operational
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '12px', height: '3px', backgroundColor: 'var(--status-warning-text)' }} /> Watch
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '12px', height: '3px', backgroundColor: '#dc2626' }} /> Leak Suspected
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '12px', height: '3px', backgroundColor: '#991b1b', borderTop: '2px dashed' }} /> What-If Simulated
              </span>
            </div>
          </div>

          {/* Inspected Pipe Details Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--bg-subtle)',
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Selected Pipe</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {selectedPipe}
                </div>
              </div>
              {renderStatusChip(selectedPipeData.status)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Pressure: </span>
                <strong>{selectedPipeData.pressure_bar ?? '--'} bar</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Material: </span>
                <strong>{selectedPipeMeta.material}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Install Year: </span>
                <strong>{selectedPipeMeta.year}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Route: </span>
                <strong>{selectedPipeMeta.road}</strong>
              </div>
            </div>

            {selectedPipeRepair && (
              <div style={{ padding: '8px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-default)', fontSize: '11px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                  Repair Priority: Rank #{selectedPipeRepair.rank}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  Advice: {selectedPipeRepair.advice || 'Scheduled preventative inspection'}
                </div>
              </div>
            )}

            {/* Pressure History Chart */}
            <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Pressure History ({selectedPipe})
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  GET /history
                </span>
              </div>

              {historyLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                  Loading history...
                </div>
              ) : pipeHistory.length > 0 ? (
                <div style={{ height: '110px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pipeHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis domain={['auto', 'auto']} fontSize={10} stroke="#94a3b8" />
                      <Tooltip />
                      <Line type="monotone" dataKey="pressure" stroke="var(--accent-teal)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-default)' }}>
                  No historical pressure readings available for {selectedPipe} yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Split Section: Pipe Status Table (Left) + Alerts & Test Form (Right) */}
      <div className="water-split-grid">
        {/* Pipe Status Table */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <h2 className="panel-card-title">Hydraulic Pipe Status Table</h2>
              <p className="panel-card-subtitle">Real-time status and pressure across monitored sectors</p>
            </div>
            <Badge variant="teal" size="sm">
              Live Feed
            </Badge>
          </div>

          <div className="water-table-wrap">
            <table className="water-table">
              <thead>
                <tr>
                  <th>Pipe ID</th>
                  <th>Current Status</th>
                  <th>Pressure (bar)</th>
                  <th>Operational Threshold</th>
                </tr>
              </thead>
              <tbody>
                {pipeEntries.map((p) => {
                  const isSelected = selectedPipe === p.id;
                  return (
                    <tr
                      key={p.id}
                      style={{ cursor: 'pointer', backgroundColor: isSelected ? 'var(--accent-blue-light)' : undefined }}
                      onClick={() => {
                        setSelectedPipe(p.id);
                        setTestPipeId(p.id);
                      }}
                    >
                      <td className="water-pipe-code">{p.id}</td>
                      <td>{renderStatusChip(p.status)}</td>
                      <td className="water-pressure-cell">{p.pressure_bar} bar</td>
                      <td>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          3.2 - 4.8 bar
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Alerts List & Send Test Reading Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Alerts List */}
          <div className="panel-card">
            <div className="panel-card-header">
              <div>
                <h2 className="panel-card-title">Network Incident Alerts</h2>
                <p className="panel-card-subtitle">Recent pressure deviations & affected zones</p>
              </div>
              <Badge variant={alerts.length > 0 ? 'warning' : 'neutral'} size="sm">
                {alerts.length} Active
              </Badge>
            </div>

            <div className="alerts-list-container">
              {alerts.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <CheckCircle2 size={18} color="var(--accent-teal)" style={{ marginBottom: '6px', display: 'inline-block' }} />
                  <div>No critical pressure alerts recorded.</div>
                </div>
              ) : (
                alerts.map((alert, idx) => {
                  const isHigh = (alert.severity || '').toLowerCase() === 'high' || (alert.severity || '').toLowerCase() === 'critical';
                  const isMed = (alert.severity || '').toLowerCase() === 'medium';

                  return (
                    <div
                      key={`alert-${idx}`}
                      className={`alert-item-card ${isHigh ? 'alert-sev-high' : isMed ? 'alert-sev-med' : 'alert-sev-low'}`}
                    >
                      <div className="alert-item-top">
                        <span className="alert-pipe-label">{alert.pipe || 'Unknown Pipe'}</span>
                        <span className="alert-time">{alert.time || 'Recent'}</span>
                      </div>
                      <div className="alert-item-details">
                        <span>Pressure: <strong>{alert.pressure_bar ?? '--'} bar</strong></span>
                        <span className="alert-separator">•</span>
                        <span>Severity: <strong>{alert.severity || 'Normal'}</strong></span>
                        <span className="alert-separator">•</span>
                        <span>Road: {alert.road || 'Unspecified'}</span>
                      </div>
                      {alert.affected && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Affected: {Array.isArray(alert.affected) ? alert.affected.join(', ') : alert.affected}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Send Test Reading Form */}
          <div className="panel-card">
            <div className="panel-card-header">
              <div>
                <h2 className="panel-card-title">Test reading (changes backend state)</h2>
                <p className="panel-card-subtitle">Posts new telemetry to <code>POST /sensor</code></p>
              </div>
            </div>

            <form onSubmit={handleSendTestReading} className="test-reading-form">
              <div className="form-group">
                <label className="form-label" htmlFor="pipe-select">
                  Select Pipe ID
                </label>
                <select
                  id="pipe-select"
                  className="form-select"
                  value={testPipeId}
                  onChange={(e) => setTestPipeId(e.target.value)}
                  disabled={testSending}
                >
                  {pipeEntries.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} ({p.pressure_bar} bar)
                    </option>
                  ))}
                  {pipeEntries.length === 0 && <option value="P-01">P-01</option>}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="pressure-input">
                  Pressure (bar)
                </label>
                <input
                  id="pressure-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="15"
                  className="form-input"
                  value={testPressure}
                  onChange={(e) => {
                    setTestPressure(e.target.value);
                    if (testInputError) setTestInputError(null);
                  }}
                  disabled={testSending}
                />
              </div>

              <button
                type="submit"
                className="form-submit-btn"
                disabled={testSending || !testPipeId}
              >
                <Send size={13} />
                <span>{testSending ? 'Sending...' : 'Send'}</span>
              </button>
            </form>

            {/* Inline validation error message */}
            {testInputError && (
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  color: '#991b1b',
                  backgroundColor: '#fef2f2',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid #fecaca'
                }}
              >
                {testInputError}
              </div>
            )}

            {testFeedback && (
              <div
                style={{
                  marginTop: '10px',
                  fontSize: '11px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: testFeedback.type === 'success' ? 'var(--status-success-bg)' : '#fef2f2',
                  color: testFeedback.type === 'success' ? 'var(--status-success-text)' : '#991b1b',
                  border: `1px solid ${testFeedback.type === 'success' ? 'var(--status-success-border)' : '#fecaca'}`
                }}
              >
                {testFeedback.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Repair Plan Table */}
      <div className="panel-card">
        <div className="panel-card-header">
          <div>
            <h2 className="panel-card-title">Prioritized Pipe Repair Plan</h2>
            <p className="panel-card-subtitle">Automated work orders ranked by risk score & backup availability</p>
          </div>
          <Badge variant="teal" size="sm">
            {repairPlan.length} Tasks Scheduled
          </Badge>
        </div>

        <div className="water-table-wrap">
          <table className="water-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Pipe ID</th>
                <th>Status</th>
                <th>Risk Score</th>
                <th>Health</th>
                <th>Severity</th>
                <th>Backup Route</th>
                <th>Affected Road</th>
                <th>Engineering Advice</th>
              </tr>
            </thead>
            <tbody>
              {repairPlan.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No pending repair interventions scheduled.
                  </td>
                </tr>
              ) : (
                repairPlan
                  .slice()
                  .sort((a, b) => (a.rank || 0) - (b.rank || 0))
                  .map((item, idx) => {
                    const riskVal = typeof item.risk === 'number' ? item.risk : parseFloat(item.risk) || 0;
                    const riskClass = riskVal >= 70 ? 'risk-high' : riskVal >= 40 ? 'risk-med' : 'risk-low';

                    return (
                      <tr key={`repair-${item.pipe || idx}`}>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            #{item.rank ?? idx + 1}
                          </span>
                        </td>
                        <td className="water-pipe-code">{item.pipe || '--'}</td>
                        <td>{renderStatusChip(item.status)}</td>
                        <td>
                          <div className="risk-bar-container">
                            <div className="risk-bar-track">
                              <div
                                className={`risk-bar-fill ${riskClass}`}
                                style={{ width: `${Math.min(100, riskVal)}%` }}
                              />
                            </div>
                            <span className="risk-bar-label">{riskVal}%</span>
                          </div>
                        </td>
                        <td>{item.health ?? '--'}</td>
                        <td>
                          <Badge
                            variant={
                              (item.severity || '').toLowerCase() === 'high' ? 'warning' : 'neutral'
                            }
                            size="sm"
                          >
                            {item.severity || 'Normal'}
                          </Badge>
                        </td>
                        <td>
                          {item.backup ? (
                            <span className="backup-tag">
                              <CheckCircle2 size={11} />
                              {item.backup}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                              None
                            </span>
                          )}
                        </td>
                        <td>{item.road || '--'}</td>
                        <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {item.advice || 'Standard inspection'}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* What-If Simulation Panel */}
      <div className="panel-card">
        <div className="panel-card-header">
          <div>
            <h2 className="panel-card-title">What-If Network Failure Simulator</h2>
            <p className="panel-card-subtitle">
              Simulate pipe closures to evaluate downstream water cutoffs without modifying live state
            </p>
          </div>
          <Badge variant="blue" size="sm">
            Simulation Sandbox
          </Badge>
        </div>

        <div className="whatif-panel-content">
          <div className="whatif-notice">
            Select one or more pipes below to project hydraulic failure propagation. The simulator highlights affected pipes and delivery nodes on the SVG diagram above without triggering physical valves.
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Select Pipes for Simulated Failure:
            </div>
            <div className="whatif-pipe-selector">
              {pipeEntries.map((p) => {
                const isChecked = selectedPipesForWhatIf.includes(p.id);
                return (
                  <label
                    key={`whatif-pipe-${p.id}`}
                    className={`whatif-checkbox-pill ${isChecked ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePipeSelection(p.id)}
                    />
                    <span>{p.id}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="whatif-run-btn"
              onClick={handleRunWhatIf}
              disabled={whatIfLoading || selectedPipesForWhatIf.length === 0}
            >
              <Activity size={14} />
              <span>
                {whatIfLoading
                  ? 'Calculating Impact...'
                  : `Run What-If Simulation (${selectedPipesForWhatIf.length} selected)`}
              </span>
            </button>

            {selectedPipesForWhatIf.length > 0 && (
              <button
                type="button"
                style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => {
                  setSelectedPipesForWhatIf([]);
                  setWhatIfResult(null);
                  setWhatIfError(null);
                }}
              >
                Clear Selection
              </button>
            )}
          </div>

          {whatIfError && (
            <div
              style={{
                fontSize: '11px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca'
              }}
            >
              Simulation Error: {whatIfError}
            </div>
          )}

          {whatIfResult && (
            <div className="whatif-result-card">
              <div className="whatif-result-title">
                Simulation Projection Results
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Simulated Pipes: </span>
                  <strong>
                    {Array.isArray(whatIfResult.failed_pipes)
                      ? whatIfResult.failed_pipes.join(', ')
                      : String(whatIfResult.failed_pipes || selectedPipesForWhatIf.join(', '))}
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Resulting Severity: </span>
                  <Badge
                    variant={
                      (whatIfResult.severity || '').toLowerCase() === 'high' ? 'warning' : 'teal'
                    }
                    size="sm"
                  >
                    {whatIfResult.severity || 'Estimated Normal'}
                  </Badge>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Water Service Impact & Cutoffs:
                </span>
                <div className="whatif-affected-list" style={{ marginTop: '4px' }}>
                  {whatIfResult.affected && Array.isArray(whatIfResult.affected) && whatIfResult.affected.length > 0 ? (
                    whatIfResult.affected.map((item, idx) => (
                      <div key={`affected-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowRight size={12} color="#dc2626" />
                        <span>{item}</span>
                      </div>
                    ))
                  ) : whatIfResult.affected && typeof whatIfResult.affected === 'string' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ArrowRight size={12} color="#dc2626" />
                      <span>{whatIfResult.affected}</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>
                      No residential or commercial service disruptions projected for this pipe combination.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WaterNetworkPage;
