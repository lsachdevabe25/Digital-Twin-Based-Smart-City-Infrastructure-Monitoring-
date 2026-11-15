import React from 'react';

/**
 * Renders the hydraulic network topology graph from backend /network data.
 * Backend coordinates range roughly x: 80-530, y: 80-430, so the viewBox
 * below is sized to fit that range, and all sizes are scaled to match.
 */
export function NetworkGraphSVG({
  nodes = [],
  pipes = [],
  selectedPipeId = null,
  highlightedPipeIds = [],
  highlightedNodeNames = [],
  disabledNodeNames = [],
  onSelectPipe = null,
  statusMap = {},
  className = '',
}) {
  const nodeMap = React.useMemo(() => {
    const map = {};
    for (const n of nodes) map[n.id] = n;
    return map;
  }, [nodes]);

  const getPipeColor = (pipe) => {
    const liveStatus = statusMap[pipe.id]?.status || pipe.status;
    if (selectedPipeId === pipe.id) return '#2563eb';
    if (liveStatus === 'leak suspected') return '#dc2626';
    if (liveStatus === 'no flow (power)' || highlightedPipeIds.includes(pipe.id)) return '#94a3b8';
    return '#0d9488';
  };

  const getNodeFill = (node) => {
    if (highlightedNodeNames.includes(node.name)) return '#fecaca';
    switch (node.type) {
      case 'reservoir': return '#e0f2fe';
      case 'hospital':  return '#fee2e2';
      case 'school':    return '#fef3c7';
      default:          return '#f1f5f9';
    }
  };

  const getNodeStroke = (node) => {
    if (highlightedNodeNames.includes(node.name)) return '#b91c1c';
    switch (node.type) {
      case 'reservoir': return '#0284c7';
      case 'hospital':  return '#dc2626';
      case 'school':    return '#d97706';
      default:          return '#64748b';
    }
  };

  const getGlyph = (node) => {
    switch (node.type) {
      case 'reservoir': return 'T';
      case 'hospital':  return '+';
      case 'school':    return 'S';
      default:          return null;
    }
  };

  return (
    <div
      className={`network-graph-container ${className}`}
      style={{ width: '100%', height: '460px' }}
    >
      <svg
        viewBox="30 40 560 430"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
        role="img"
        aria-label="Hydraulic Distribution Network Graph"
      >
        {/* Pipe lines (drawn first so nodes appear on top) */}
        <g>
          {pipes.map((pipe) => {
            const u = nodeMap[pipe.from];
            const v = nodeMap[pipe.to];
            if (!u || !v) return null;
            const color = getPipeColor(pipe);
            const isSelected = selectedPipeId === pipe.id;
            const liveStatus = statusMap[pipe.id]?.status || pipe.status;
            const isDashed = liveStatus === 'no flow (power)' || highlightedPipeIds.includes(pipe.id);
            return (
              <g
                key={pipe.id}
                onClick={() => onSelectPipe && onSelectPipe(pipe)}
                style={{ cursor: onSelectPipe ? 'pointer' : 'default' }}
              >
                {/* Wide invisible hit area */}
                <line
                  x1={u.x} y1={u.y}
                  x2={v.x} y2={v.y}
                  stroke="transparent"
                  strokeWidth="24"
                />
                {/* Visible pipe */}
                <line
                  x1={u.x} y1={u.y}
                  x2={v.x} y2={v.y}
                  stroke={color}
                  strokeWidth={isSelected ? 8 : 4.5}
                  strokeDasharray={isDashed ? '9 9' : 'none'}
                  strokeLinecap="round"
                />
                {/* Pipe ID label at midpoint, only for selected pipe */}
                {isSelected && (
                  <text
                    x={(u.x + v.x) / 2}
                    y={(u.y + v.y) / 2 - 9}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#1d4ed8"
                    stroke="#fff"
                    strokeWidth="3"
                    paintOrder="stroke"
                  >
                    {pipe.id}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node) => {
            const fill = getNodeFill(node);
            const stroke = getNodeStroke(node);
            const isAffected = highlightedNodeNames.includes(node.name);
            const isDisabled = disabledNodeNames.includes(node.name);
            const glyph = getGlyph(node);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                opacity={isDisabled ? 0.4 : 1}
              >
                {/* Affected halo ring */}
                {isAffected && (
                  <circle
                    r={25}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="3.5"
                    strokeDasharray="6 6"
                    opacity="0.85"
                  />
                )}

                {/* Main node circle */}
                <circle
                  r={15}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="3"
                />

                {/* Type glyph inside circle */}
                {glyph && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="10"
                    fontWeight="700"
                    fill={stroke}
                    stroke="#fff"
                    strokeWidth="2"
                    paintOrder="stroke"
                  >
                    {glyph}
                  </text>
                )}

                {/* Junction dot */}
                {node.type === 'junction' && (
                  <circle r={5} fill={stroke} />
                )}

                {/* Node name label below the circle, with white halo */}
                <text
                  y={30}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="600"
                  fill="#0f172a"
                  stroke="#fff"
                  strokeWidth="3.5"
                  paintOrder="stroke"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

export default NetworkGraphSVG;