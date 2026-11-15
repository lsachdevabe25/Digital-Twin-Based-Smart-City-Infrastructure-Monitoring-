/**
 * API helper for FastAPI Digital Twin Backend
 * Base URL defaults to http://127.0.0.1:8000 via VITE_API_URL
 */

const RAW_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const BASE_URL = RAW_URL.replace(/\/+$/, '');

/**
 * Generic fetch wrapper with JSON parsing, error management, and AbortSignal
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  let response;
  try {
    response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err;
    }
    throw new Error(`Failed to connect to twin backend at ${BASE_URL}: ${err.message}`);
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text().catch(() => '');
    }
    throw new Error(`API error ${response.status}: ${errorDetail || response.statusText}`);
  }

  return response.json();
}

/**
 * GET /network
 * Returns full network topology: nodes (id, name, type, x, y), pipes (with road), transformers, depends_on
 */
export async function getNetwork(signal) {
  return apiRequest('/network', { signal });
}

/**
 * POST /analyze
 * Dry-run analysis for a simulated pipe pressure reading
 * Body: { pipe_id, pressure_bar }
 */
export async function postAnalyze(pipeId, pressureBar, signal) {
  return apiRequest('/analyze', {
    method: 'POST',
    body: JSON.stringify({
      pipe_id: pipeId,
      pressure_bar: parseFloat(pressureBar)
    }),
    signal
  });
}

/**
 * POST /sensor
 * Applies a live sensor reading update
 * Body: { asset_id, metric, value }
 */
export async function postSensorReading(assetId, value, metric = 'pressure_bar', signal) {
  return apiRequest('/sensor', {
    method: 'POST',
    body: JSON.stringify({
      asset_id: assetId,
      metric,
      value: parseFloat(value)
    }),
    signal
  });
}

/**
 * GET /power-failure/{transformer_id}
 * Returns power loss assets and downstream water cascade
 */
export async function getPowerFailureImpact(transformerId, signal) {
  const encodedId = encodeURIComponent(transformerId);
  return apiRequest(`/power-failure/${encodedId}`, { signal });
}

/**
 * GET /status
 * Returns live status and pressure keyed by pipe ID
 */
export async function getStatus(signal) {
  return apiRequest('/status', { signal });
}

/**
 * GET /alerts
 * Returns live pipe alerts
 */
export async function getAlerts(signal) {
  return apiRequest('/alerts', { signal });
}

/**
 * GET /repair-plan
 * Returns live ranked repair priorities
 */
export async function getRepairPlan(signal) {
  return apiRequest('/repair-plan', { signal });
}

/**
 * GET /impact/{pipe_id}
 * Returns impact details for a single pipe failure
 */
export async function getImpact(pipeId, signal) {
  const encodedId = encodeURIComponent(pipeId);
  return apiRequest(`/impact/${encodedId}`, { signal });
}

/**
 * GET / (Health check)
 */
export async function checkBackendHealth(signal) {
  return apiRequest('/', { signal });
}
