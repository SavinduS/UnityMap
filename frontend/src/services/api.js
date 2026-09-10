import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Convert a local file:// or content:// uri (camera photo) to a data URI for JSON fallback.
 * This guarantees the photo can still be uploaded via uploadDataUriToCloudinary when FormData serialization fails
 * (e.g. large camera photo causing timeout or invalid MIME).
 */
const fileUriToDataUri = async (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  if (uri.startsWith('data:')) return uri;
  // Only attempt conversion for local file URIs on native
  if (Platform.OS === 'web' || (!uri.startsWith('file://') && !uri.startsWith('content://'))) {
    return uri;
  }
  try {
    const FileSystem = await import('expo-file-system').catch(() => null);
    const FS = FileSystem?.default || FileSystem;
    if (FS?.readAsStringAsync) {
      // Prefer legacy API if available, else new File API
      if (FS.EncodingType?.Base64) {
        const base64 = await FS.readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 });
        return `data:image/jpeg;base64,${base64}`;
      } else if (FS.File) {
        const file = new FS.File(uri);
        if (file?.base64) {
          const b64 = await file.base64();
          return `data:image/jpeg;base64,${b64}`;
        }
        // fallback to read
        const b64 = await file.text().catch(() => null);
        if (b64) return `data:image/jpeg;base64,${b64}`;
      }
    }
  } catch {}
  return uri;
};

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
    // Harden timeout for large photo uploads to Cloudinary — increased from 30000ms to 45000ms
    const timeoutMs = isFormData ? 45000 : 45000;
    // Explicit 45000ms timeout allows Cloudinary uploads to complete on slow Android networks
    const timeoutId = setTimeout(() => {
      try {
        controller.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError'));
      } catch {
        controller.abort();
      }
    }, timeoutMs);

    console.log(`[API Request] Fetching: ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to parse error body for more context
        let errorBody = '';
        try {
          const text = await response.text();
          errorBody = text ? ` - ${text.slice(0, 300)}` : '';
        } catch {}
        throw new Error(`API Request Failed: ${response.status} ${response.statusText}${errorBody}`);
      }

      const data = await response.json();
      console.log(`[API Success] ${cleanEndpoint} (from ${baseUrl})`);
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      // Normalize AbortError / TimeoutError / Canceled to a user-friendly message so UI can handle it
      // React Native fetch on Android throws "Fetch request has been canceled" for abort/timeout
      if (err && (err.name === 'AbortError' || err.name === 'TimeoutError' || /aborted|abort|timeout|canceled|cancelled|cancel/i.test(err.message || ''))) {
        const timeoutErr = new Error(`Request to ${cleanEndpoint} timed out or was aborted — please check your network and try again. (original: ${err.message})`);
        timeoutErr.name = 'TimeoutError';
        timeoutErr.cause = err;
        throw timeoutErr;
      }
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
      // If native mobile failed, try exhaustive last-resort hosts:
      // 10.0.2.2 (Android emulator), localhost, and common LAN IPs
      if (Platform.OS !== 'web') {
        const lastResortHosts = [
          `http://10.0.2.2:${PRIMARY_PORT}/api`,
          `http://localhost:${PRIMARY_PORT}/api`,
          `http://192.168.8.183:${PRIMARY_PORT}/api`,
          `http://192.168.1.177:${PRIMARY_PORT}/api`,
          `http://192.168.0.100:${PRIMARY_PORT}/api`,
        ];
        // Avoid retrying the same host already tried (getBaseUrl)
        const tried = new Set([getBaseUrl(PRIMARY_PORT), getBaseUrl(FALLBACK_PORT)]);
        for (const host of lastResortHosts) {
          if (tried.has(host)) continue;
          try {
            return await tryFetch(host);
          } catch (_) {
            tried.add(host);
          }
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
 * Form fields mirror report form image: name, locationName, coordinates, category, rating (1-5 kept), condition, notes, capturedAt — reporterName removed.
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

  // Harden FormData Construction: wrap serialization in inner try/catch before JSON fallback
  let formData;
  try {
    formData = new FormData();

    if (Platform.OS === 'web') {
      // Web: browser FormData accepts File/Blob
      if (photoFile instanceof File || photoFile instanceof Blob) {
        const fileName = String(photoFile.name || `photo_${Date.now()}.jpg`);
        formData.append('photo', photoFile, fileName);
      } else if (typeof photoFile === 'object' && photoFile !== null && typeof photoFile.uri === 'string') {
        const uri = String(photoFile.uri);
        const name = String(photoFile.name || `photo_${Date.now()}.jpg`);
        const type = String(photoFile.type || 'image/jpeg');
        if (uri.startsWith('blob:') || uri.startsWith('data:')) {
          try {
            const resp = await fetch(uri);
            const blob = await resp.blob();
            const file = new File([blob], name, { type: String(blob.type || type) });
            formData.append('photo', file, name);
          } catch {
            return apiRequest('/reports', {
              method: 'POST',
              body: JSON.stringify({ ...reportData, photoUrl: String(uri) }),
            });
          }
        } else {
          try {
            const resp = await fetch(uri);
            const blob = await resp.blob();
            const file = new File([blob], name, { type: String(blob.type || type) });
            formData.append('photo', file, name);
          } catch {
            return apiRequest('/reports', {
              method: 'POST',
              body: JSON.stringify({ ...reportData, photoUrl: String(uri) }),
            });
          }
        }
      } else if (typeof photoFile === 'string' && (photoFile.startsWith('blob:') || photoFile.startsWith('data:'))) {
        try {
          const resp = await fetch(photoFile);
          const blob = await resp.blob();
          const file = new File([blob], String(`photo_${Date.now()}.jpg`), { type: String(blob.type || 'image/jpeg') });
          formData.append('photo', file, file.name);
        } catch {
          return apiRequest('/reports', {
            method: 'POST',
            body: JSON.stringify({ ...reportData, photoUrl: String(photoFile) }),
          });
        }
      } else {
        formData.append('photo', photoFile);
      }
    } else {
      // React Native: strictly format the photo object to { uri, name, type } with type: 'image/jpeg'
      if (typeof photoFile === 'object' && photoFile !== null && typeof photoFile.uri === 'string') {
        const formattedPhoto = {
          uri: String(photoFile.uri),
          name: String(photoFile.name || `photo_${Date.now()}.jpg`),
          type: 'image/jpeg',
        };
        formData.append('photo', formattedPhoto);
      } else if (typeof File !== 'undefined' && photoFile instanceof File) {
        const formattedPhoto = {
          uri: String(photoFile.uri || `file:///tmp/photo_${Date.now()}.jpg`),
          name: String(photoFile.name || `photo_${Date.now()}.jpg`),
          type: 'image/jpeg',
        };
        formData.append('photo', formattedPhoto);
      } else if (typeof Blob !== 'undefined' && photoFile instanceof Blob) {
        return apiRequest('/reports', {
          method: 'POST',
          body: JSON.stringify({ ...reportData, photoUrl: String(reportData.photoUrl || '') }),
        });
      } else if (typeof photoFile === 'string') {
        const formattedPhoto = {
          uri: String(photoFile),
          name: String(`photo_${Date.now()}.jpg`),
          type: 'image/jpeg',
        };
        formData.append('photo', formattedPhoto);
      } else {
        return apiRequest('/reports', {
          method: 'POST',
          body: JSON.stringify({ ...reportData, photoUrl: String(reportData.photoUrl || String(photoFile || '')) }),
        });
      }
    }

    // Append text fields with explicit type guards and String() conversions
    const appendString = (key, value) => {
      if (value === undefined || value === null || value === '') return;
      formData.append(key, String(value));
    };
    const appendJson = (key, value) => {
      if (value === undefined || value === null) return;
      if (value instanceof Date) formData.append(key, value.toISOString());
      else if (typeof value === 'object') formData.append(key, JSON.stringify(value));
      else formData.append(key, String(value));
    };

    const category = reportData.category;
    const ratingStr = reportData.rating !== undefined && reportData.rating !== null ? String(reportData.rating) : undefined;
    const lat = reportData.coordinates?.latitude ?? reportData.latitude ?? reportData.lat;
    const lng = reportData.coordinates?.longitude ?? reportData.longitude ?? reportData.lon;
    const rawCaptured =
      reportData.capturedAt ??
      reportData.timestamp ??
      reportData.photoTakenAt ??
      reportData.exifMetadata?.timestamp ??
      reportData.exifResult?.timestamp ??
      photoFile?.timestamp ??
      photoFile?.creationTime ??
      photoFile?.exif?.timestamp;
    let capturedIso;
    if (rawCaptured !== undefined && rawCaptured !== null && rawCaptured !== '') {
      if (rawCaptured instanceof Date) capturedIso = rawCaptured.toISOString();
      else {
        const d = new Date(rawCaptured);
        if (!Number.isNaN(d.getTime())) capturedIso = d.toISOString();
      }
    }

    appendString('name', reportData.name || '');
    appendString('locationName', reportData.locationName || reportData.location || '');
    appendString('condition', reportData.condition || 'bad');
    appendString('category', String(category || ''));
    appendString('rating', ratingStr !== undefined ? String(ratingStr) : undefined);
    appendString('notes', reportData.notes ?? reportData.note ?? '');
    if (lat !== undefined && lat !== null) appendString('latitude', String(lat));
    if (lng !== undefined && lng !== null) appendString('longitude', String(lng));
    if (capturedIso) appendString('capturedAt', String(capturedIso));
    appendJson('coordinates', reportData.coordinates || (lat !== undefined && lng !== undefined ? { latitude: Number(lat), longitude: Number(lng) } : undefined));
    appendJson('exifMetadata', reportData.exifMetadata);
    if (reportData.reporterId) appendString('reporterId', String(reportData.reporterId));
    if (reportData.photoUrl) appendString('photoUrl', String(reportData.photoUrl));
  } catch (serializationErr) {
    console.warn('[createReport] FormData serialization failed, falling back to JSON:', serializationErr.message);
    const rawFallback = reportData.photoUrl || (typeof photoFile === 'object' && photoFile?.uri ? String(photoFile.uri) : typeof photoFile === 'string' ? String(photoFile) : '');
    // Convert camera file:// uri to data URI so backend uploadDataUriToCloudinary can handle it
    const fallbackPhotoUrl = rawFallback ? await fileUriToDataUri(String(rawFallback)) : '';
    return apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify({ ...reportData, photoUrl: String(fallbackPhotoUrl || reportData.photoUrl || '') }),
    });
  }

  try {
    return await apiRequest('/reports', {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    const msg = err?.message || '';
    if (/Unsupported FormDataPart|FormData/i.test(msg)) {
      console.warn('[createReport] FormData serialization failed, falling back to JSON:', msg);
      const rawFallback = reportData.photoUrl || (typeof photoFile === 'object' && photoFile?.uri ? String(photoFile.uri) : typeof photoFile === 'string' ? String(photoFile) : '');
      const fallbackPhotoUrl = rawFallback ? await fileUriToDataUri(String(rawFallback)) : '';
      return apiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify({ ...reportData, photoUrl: String(fallbackPhotoUrl || reportData.photoUrl || '') }),
      });
    }
    throw err;
  }
};

/**
 * Create barrier report with FormData hardening and JSON fallback (also supports photo upload)
 * Hardened: explicit type guards, String() conversions, strict { uri, name, type: 'image/jpeg' } on RN, inner try/catch
 */
export const createBarrierReport = async (reportData, photoFile) => {
  // JSON-only path when no photoFile provided (explicit type guards via JSON.stringify)
  if (!photoFile) {
    return apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }

  // When photoFile is provided, harden FormData construction with same guards as createReport
  let formData;
  try {
    formData = new FormData();
    if (Platform.OS !== 'web') {
      // React Native: strictly format the photo object to { uri, name, type } with type: 'image/jpeg'
      if (typeof photoFile === 'object' && photoFile !== null && typeof photoFile.uri === 'string') {
        const formattedPhoto = {
          uri: String(photoFile.uri),
          name: String(photoFile.name || `photo_${Date.now()}.jpg`),
          type: 'image/jpeg',
        };
        formData.append('photo', formattedPhoto);
      } else if (typeof photoFile === 'string') {
        const formattedPhoto = {
          uri: String(photoFile),
          name: String(`photo_${Date.now()}.jpg`),
          type: 'image/jpeg',
        };
        formData.append('photo', formattedPhoto);
      } else {
        formData.append('photo', { uri: String(photoFile.uri), name: String(photoFile.name || `photo_${Date.now()}.jpg`), type: 'image/jpeg' });
      }
    } else {
      if (photoFile instanceof File || photoFile instanceof Blob) {
        formData.append('photo', photoFile, String(photoFile.name || `photo_${Date.now()}.jpg`));
      } else if (typeof photoFile === 'object' && typeof photoFile.uri === 'string') {
        const formattedPhoto = {
          uri: String(photoFile.uri),
          name: String(photoFile.name || `photo_${Date.now()}.jpg`),
          type: 'image/jpeg',
        };
        try {
          const resp = await fetch(String(photoFile.uri));
          const blob = await resp.blob();
          const file = new File([blob], formattedPhoto.name, { type: String(blob.type || 'image/jpeg') });
          formData.append('photo', file, formattedPhoto.name);
        } catch {
          formData.append('photo', formattedPhoto);
        }
      } else {
        formData.append('photo', photoFile);
      }
    }

    const appendString = (key, value) => {
      if (value === undefined || value === null || value === '') return;
      formData.append(key, String(value));
    };
    const appendJson = (key, value) => {
      if (value === undefined || value === null) return;
      if (value instanceof Date) formData.append(key, value.toISOString());
      else if (typeof value === 'object') formData.append(key, JSON.stringify(value));
      else formData.append(key, String(value));
    };

    appendString('name', reportData.name || '');
    appendString('locationName', reportData.locationName || reportData.location || '');
    appendString('condition', reportData.condition || 'bad');
    appendString('category', String(reportData.category || ''));
    if (reportData.rating !== undefined && reportData.rating !== null) appendString('rating', String(reportData.rating));
    appendString('notes', reportData.notes ?? reportData.note ?? '');
    const lat = reportData.coordinates?.latitude ?? reportData.latitude ?? reportData.lat;
    const lng = reportData.coordinates?.longitude ?? reportData.longitude ?? reportData.lon;
    if (lat !== undefined && lat !== null) appendString('latitude', String(lat));
    if (lng !== undefined && lng !== null) appendString('longitude', String(lng));
    if (reportData.capturedAt) appendString('capturedAt', String(reportData.capturedAt));
    else if (reportData.timestamp) appendString('capturedAt', String(reportData.timestamp));
    appendJson('coordinates', reportData.coordinates || (lat !== undefined && lng !== undefined ? { latitude: Number(lat), longitude: Number(lng) } : undefined));
    appendJson('exifMetadata', reportData.exifMetadata);
    if (reportData.reporterId) appendString('reporterId', String(reportData.reporterId));
    if (reportData.photoUrl) appendString('photoUrl', String(reportData.photoUrl));
  } catch (serializationErr) {
    console.warn('[createBarrierReport] FormData serialization failed, falling back to JSON:', serializationErr.message);
    const rawFallback = reportData.photoUrl || (typeof photoFile === 'object' ? String(photoFile.uri || '') : String(photoFile || ''));
    const fallbackPhotoUrl = rawFallback ? await fileUriToDataUri(String(rawFallback)) : '';
    return apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify({ ...reportData, photoUrl: String(fallbackPhotoUrl || reportData.photoUrl || '') }),
    });
  }

  try {
    return await apiRequest('/reports', {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    const msg = err?.message || '';
    if (/Unsupported FormDataPart|FormData/i.test(msg)) {
      console.warn('[createBarrierReport] FormData serialization failed, falling back to JSON:', msg);
      const rawFallback = reportData.photoUrl || (typeof photoFile === 'object' && photoFile?.uri ? String(photoFile.uri) : typeof photoFile === 'string' ? String(photoFile) : '');
      const fallbackPhotoUrl = rawFallback ? await fileUriToDataUri(String(rawFallback)) : '';
      return apiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify({ ...reportData, photoUrl: String(fallbackPhotoUrl || reportData.photoUrl || '') }),
      });
    }
    throw err;
  }
};

const getAuthHeaders = async () => {
  try {
    const stored = await AsyncStorage.getItem('@unitymap_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.token) {
        return { Authorization: `Bearer ${parsed.token}` };
      }
    }
  } catch (_) {}
  return {};
};

export const corroborateReport = async (reportId) => {
  const authHeaders = await getAuthHeaders();
  return apiRequest(`/reports/${reportId}/corroborate`, { method: 'POST', headers: authHeaders });
};

export const uncorroborateReport = async (reportId) => {
  const authHeaders = await getAuthHeaders();
  return apiRequest(`/reports/${reportId}/corroborate`, { method: 'DELETE', headers: authHeaders });
};

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
  corroborateReport,
  uncorroborateReport,
};
