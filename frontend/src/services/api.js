import { Platform, NativeModules } from 'react-native';

/**
 * UnityMap Centralized API Service
 * Connects React Native / Web frontend to Node.js / Express backend with MongoDB.
 */

const PRIMARY_PORT = '5000'; // Matches backend/.env PORT
const FALLBACK_PORT = '5001';

/**
 * Dynamically resolves the host IP for mobile devices and web browsers.
 * Extracts the Metro bundler IP from scriptURL when running on physical devices/emulators.
 */
export const getHostAddress = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      return window.location.hostname;
    }
    return 'localhost';
  }

  // React Native dev server host detection
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const parsed = scriptURL.split('://')[1]?.split('/')[0]?.split(':')[0];
      if (parsed && parsed !== 'localhost' && parsed !== '127.0.0.1') {
        return parsed;
      }
    }
  } catch (e) {}

  // Fallback to local network IP or Android emulator localhost
  return '192.168.8.183';
};

export const getBaseUrl = (port = PRIMARY_PORT) => {
  const host = getHostAddress();
  return `http://${host}:${port}/api`;
};

export const API_BASE_URL = getBaseUrl();

export const apiRequest = async (endpoint, options = {}) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const tryFetch = async (baseUrl) => {
    const url = `${baseUrl}${cleanEndpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    console.log(`[API Request] Fetching: ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API Request Failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[API Success] ${cleanEndpoint} (from ${baseUrl})`);
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  // Try primary configured port
  try {
    return await tryFetch(getBaseUrl(PRIMARY_PORT));
  } catch (primaryErr) {
    console.warn(
      `[API Warning] Endpoint ${cleanEndpoint} unreachable on port ${PRIMARY_PORT} (${primaryErr.message}). Retrying fallback...`
    );

    // Try fallback port (5001)
    try {
      return await tryFetch(getBaseUrl(FALLBACK_PORT));
    } catch (fallbackErr) {
      // If native mobile failed on LAN IP, try localhost / 10.0.2.2 as last resort
      if (Platform.OS !== 'web') {
        try {
          return await tryFetch(`http://10.0.2.2:${PRIMARY_PORT}/api`);
        } catch (emuErr) {
          try {
            return await tryFetch(`http://localhost:${PRIMARY_PORT}/api`);
          } catch (_) {}
        }
      }

      console.error(
        `[API Error] All connection attempts failed for ${cleanEndpoint}:`,
        primaryErr.message
      );
      throw primaryErr;
    }
  }
};

// Node & Destination Endpoints
export const getNodes = (floorLevel) => {
  const query = floorLevel !== undefined ? `?floorLevel=${floorLevel}` : '';
  return apiRequest(`/nodes${query}`);
};

export const getNearbyNodes = (lng, lat, maxDistance = 1000) => {
  return apiRequest(`/nodes/nearby?lng=${lng}&lat=${lat}&maxDistance=${maxDistance}`);
};

export const createNode = (nodeData) => {
  return apiRequest('/nodes', {
    method: 'POST',
    body: JSON.stringify(nodeData),
  });
};

// Obstacle & Barrier Endpoints
export const getObstacles = (isActive = true, obstacleType) => {
  const params = new URLSearchParams();
  if (isActive !== undefined) params.append('isActive', String(isActive));
  if (obstacleType) params.append('obstacleType', obstacleType);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/obstacles${query}`);
};

export const getNearbyObstacles = (lng, lat, maxDistance = 1000) => {
  return apiRequest(`/obstacles/nearby?lng=${lng}&lat=${lat}&maxDistance=${maxDistance}`);
};

/**
 * Snaps a GPS coordinate to the nearest routable DB node.
 * Used by tap-to-route: tap → nearest node → getRoute().
 * Returns the first node in the nearby result, or null.
 */
export const getNearestNode = async (lng, lat, maxDistance = 500) => {
  const res = await apiRequest(`/nodes/nearby?lng=${lng}&lat=${lat}&maxDistance=${maxDistance}`);
  const nodes = res?.data ?? res;
  return Array.isArray(nodes) && nodes.length > 0 ? nodes[0] : null;
};

export const createObstacle = (obstacleData) => {
  return apiRequest('/obstacles', {
    method: 'POST',
    body: JSON.stringify(obstacleData),
  });
};

// Elevators & Pathways
export const getElevators = () => apiRequest('/elevators');
export const getElevatorOverview = () => apiRequest('/elevators/overview');

export const getPathways = (options = {}) => {
  if (typeof options === 'boolean') {
    return apiRequest(`/pathways?wheelchairAccessible=${options}`);
  }
  const params = new URLSearchParams();
  if (options && options.wheelchairAccessible !== undefined) {
    params.append('wheelchairAccessible', String(options.wheelchairAccessible));
  }
  if (options && options.pathType) {
    params.append('pathType', options.pathType);
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/pathways${query}`);
};

/**
 * SPT-102 — Fetch a computed route between two nodes.
 */
export const getRoute = (originNodeId, destinationNodeId, wheelchairAccessible = false) => {
  const params = new URLSearchParams({
    originNodeId,
    destinationNodeId,
    wheelchairAccessible: String(wheelchairAccessible),
  });
  return apiRequest(`/pathways/route?${params.toString()}`);
};

/**
 * Fetches real road and pathway routing geometry and distance along the street network via OSRM.
 * Matches OpenStreetMap road networks and returns road curve coordinates & exact distance.
 */
export const getRoadRoute = async (originLng, originLat, destLng, destLat) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const url = `https://router.project-osrm.org/route/v1/foot/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`OSRM HTTP error: ${response.status}`);
    const data = await response.json();
    if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      const coords = primaryRoute.geometry?.coordinates?.map(([lng, lat]) => [Number(lat), Number(lng)]) || [];
      return {
        success: true,
        distanceMeters: Number(primaryRoute.distance) || 0,
        durationSeconds: Number(primaryRoute.duration) || 0,
        coordinates: coords,
      };
    }
  } catch (err) {
    console.warn('[API] OSRM road routing error:', err.message);
  }
  return null;
};

export const checkHealth = () => apiRequest('/health');

export default {
  API_BASE_URL,
  getBaseUrl,
  getHostAddress,
  apiRequest,
  getNodes,
  getNearbyNodes,
  getNearestNode,
  createNode,
  getObstacles,
  getNearbyObstacles,
  createObstacle,
  getElevators,
  getElevatorOverview,
  getPathways,
  getRoute,
  getRoadRoute,
  checkHealth,
};
