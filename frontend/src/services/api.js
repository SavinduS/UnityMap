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

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const defaultHeaders = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
  };

  const tryFetch = async (baseUrl) => {
    const url = `${baseUrl}${cleanEndpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

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
 * SPT-106 — Optionally include spoken summary via includeSpeech & locale (en only).
 */
export const getRoute = (originNodeId, destinationNodeId, wheelchairAccessible = false, options = {}) => {
  // Backward compat: wheelchairAccessible may be options object
  let includeSpeech = false;
  let locale = 'en';
  if (typeof wheelchairAccessible === 'object' && wheelchairAccessible !== null) {
    options = wheelchairAccessible;
    wheelchairAccessible = false;
  }
  if (options.includeSpeech) includeSpeech = options.includeSpeech;
  if (options.locale) locale = options.locale;

  const params = new URLSearchParams({
    originNodeId,
    destinationNodeId,
    wheelchairAccessible: String(wheelchairAccessible),
  });
  if (includeSpeech) {
    params.append('includeSpeech', 'true');
    params.append('locale', locale);
  }
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

// Speech & Audio Cue Endpoints (SPT-007 / SPT-104)
export const getSpeechPrompts = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/speech/prompts${query ? `?${query}` : ''}`);
};

export const getLauncherPrompt = (locale = 'en') => {
  return apiRequest(`/speech/prompts?triggerType=launcher_prompt&locale=${locale}`);
};

export const getAudioCues = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/audio/cues${query ? `?${query}` : ''}`);
};

export const previewSpeech = (body) => {
  return apiRequest('/speech/preview', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

// ——— Barrier Report Endpoints (Cloudinary photo upload) ———

/**
 * Get barrier reports with optional filters
 */
export const getReports = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/reports${query ? `?${query}` : ''}`);
};

export const getReportById = (id) => apiRequest(`/reports/${id}`);

/**
 * Create a barrier report — photo is uploaded to Cloudinary via backend.
 *
 * @param {object} reportData - { name, locationName, coordinates:{latitude,longitude}, category, rating(1-5 kept), condition:'good'|'bad', notes/note, exifMetadata, capturedAt/timestamp, reporterId }
 * @param {File|Blob|{uri:string, name?:string, type?:string}} [photoFile] - image file to upload (field `photo`)
 * If photoFile is provided, request is sent as multipart/form-data; photoUrl is ignored (server uploads to Cloudinary).
 * If no photoFile, photoUrl must be inside reportData.
 */
export const createReport = async (reportData, photoFile) => {
  // If no file, fallback to JSON (backward compat)
  if (!photoFile) {
    return apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }

  const formData = new FormData();

  // File field must be `photo` to match backend upload.single('photo')
  if (typeof photoFile === 'object' && photoFile.uri) {
    // React Native / Expo uri object
    const uri = photoFile.uri;
    const name = photoFile.name || `photo_${Date.now()}.jpg`;
    const type = photoFile.type || 'image/jpeg';
    // React Native FormData needs { uri, name, type } blob-like object
    formData.append('photo', { uri, name, type });
  } else if (photoFile instanceof File || photoFile instanceof Blob) {
    const fileName = photoFile.name || `photo_${Date.now()}.jpg`;
    formData.append('photo', photoFile, fileName);
  } else {
    // Fallback: treat as blob
    formData.append('photo', photoFile);
  }

  // Append all other fields — stringify objects for multipart transport
  // Backend parseJsonField handles JSON-stringified values
  const appendField = (key, value) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'object' && !(value instanceof Date)) {
      formData.append(key, JSON.stringify(value));
    } else if (value instanceof Date) {
      formData.append(key, value.toISOString());
    } else {
      formData.append(key, String(value));
    }
  };

  appendField('name', reportData.name);
  appendField('locationName', reportData.locationName || reportData.location);
  appendField('coordinates', reportData.coordinates);
  appendField('category', reportData.category);
  appendField('rating', reportData.rating);
  appendField('condition', reportData.condition);
  // notes supports both `notes` and `note` alias
  appendField('notes', reportData.notes ?? reportData.note);
  appendField('exifMetadata', reportData.exifMetadata);
  // timestamp aliases: capturedAt / timestamp / photoTakenAt — all map to capturedAt server-side
  const ts = reportData.capturedAt ?? reportData.timestamp ?? reportData.photoTakenAt;
  appendField('capturedAt', ts instanceof Date ? ts.toISOString() : ts);
  appendField('reporterId', reportData.reporterId);
  // If caller also passed photoUrl explicitly without file, include it
  if (reportData.photoUrl) appendField('photoUrl', reportData.photoUrl);

  return apiRequest('/reports', {
    method: 'POST',
    body: formData,
  });
};

/**
 * Simple JSON barrier report submission (Prompt 2 spec).
 */
export const createBarrierReport = (reportData) =>
  apiRequest('/reports', {
    method: 'POST',
    body: JSON.stringify(reportData),
  });

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
  getSpeechPrompts,
  getLauncherPrompt,
  getAudioCues,
  previewSpeech,
  getReports,
  getReportById,
  createReport,
  createBarrierReport,
};
