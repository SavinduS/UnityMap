import { Platform } from 'react-native';

/**
 * UnityMap Centralized API Service
 * Connects React Native / Web frontend to Node.js / Express backend with MongoDB.
 */

const LOCAL_LAN_IP = '192.168.8.183';
const BACKEND_PORT = '5000';

export const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return `http://localhost:${BACKEND_PORT}/api`;
  }
  // For Expo Go on mobile devices and emulators
  return `http://${LOCAL_LAN_IP}:${BACKEND_PORT}/api`;
};

export const API_BASE_URL = getBaseUrl();

export const apiRequest = async (endpoint, options = {}) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API Request Failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // Graceful error handling for offline/network issues
    console.warn(`[API Info] ${endpoint} unreachable, using offline fallback:`, error.message);
    throw error;
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
  const params = [];
  if (isActive !== undefined) params.push(`isActive=${isActive}`);
  if (obstacleType) params.push(`obstacleType=${encodeURIComponent(obstacleType)}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return apiRequest(`/obstacles${query}`);
};

export const getNearbyObstacles = (lng, lat, maxDistance = 1000) => {
  return apiRequest(`/obstacles/nearby?lng=${lng}&lat=${lat}&maxDistance=${maxDistance}`);
};

export const createObstacle = (obstacleData) => {
  return apiRequest('/obstacles', {
    method: 'POST',
    body: JSON.stringify(obstacleData),
  });
};

// Elevators & Pathways
export const getElevators = () => apiRequest('/elevators');
export const getPathways = () => apiRequest('/pathways');

/**
 * SPT-102 — Fetch a computed route between two nodes.
 * @param {string} originNodeId
 * @param {string} destinationNodeId
 * @param {boolean} wheelchairAccessible — when true the backend runs the step-free filter
 */
export const getRoute = (originNodeId, destinationNodeId, wheelchairAccessible = false) => {
  const params = new URLSearchParams({
    originNodeId,
    destinationNodeId,
    wheelchairAccessible: String(wheelchairAccessible),
  });
  return apiRequest(`/pathways/route?${params.toString()}`);
};

export const checkHealth = () => apiRequest('/health');

export default {
  API_BASE_URL,
  apiRequest,
  getNodes,
  getNearbyNodes,
  createNode,
  getObstacles,
  getNearbyObstacles,
  createObstacle,
  getElevators,
  getPathways,
  getRoute,
  checkHealth,
};

