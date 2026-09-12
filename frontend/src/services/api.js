import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const decodeUriFully = (uri) => {
  try {
    let cur = uri;
    let prev = '';
    while (cur !== prev) {
      prev = cur;
      try { cur = decodeURIComponent(cur); } catch { break; }
    }
    return cur;
  } catch { return uri; }
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  try {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result;
      if (typeof res === 'string' && res.startsWith('data:')) resolve(res);
      else reject(new Error('FileReader result not data URI'));
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  } catch (e) { reject(e); }
});

const fileUriToDataUri = async (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  if (uri.startsWith('data:')) return uri;
  if (Platform.OS === 'web' || (!uri.startsWith('file://') && !uri.startsWith('content://') && !uri.startsWith('/'))) {
    return uri;
  }
  const candidates = [uri, decodeUriFully(uri)];
  if (uri.startsWith('/') && !uri.startsWith('file://')) candidates.push(`file://${uri}`);
  const uniq = [...new Set(candidates.filter(Boolean))];
  for (const cand of uniq) {
    // Try new expo-file-system File API (SDK 57+)
    try {
      const FS = await import('expo-file-system').catch(() => null);
      const FileClass = FS?.File || FS?.default?.File;
      if (FileClass) {
        try {
          const file = new FileClass(cand);
          if (file?.exists) {
            const exists = await file.exists().catch(() => true);
            if (exists === false) continue;
          }
          if (typeof file?.base64 === 'function') {
            const b64 = await file.base64();
            if (b64 && b64.length > 100) {
              // File.base64() may return raw base64 or data URI
              if (b64.startsWith('data:')) return b64;
              return `data:image/jpeg;base64,${b64}`;
            }
          }
          if (typeof file?.text === 'function') {
            // fallback via arrayBuffer
            const buf = await file.arrayBuffer?.().catch(() => null);
            if (buf && buf.byteLength > 100) {
              const b64 = Buffer.from(buf).toString('base64');
              if (b64.length > 100) return `data:image/jpeg;base64,${b64}`;
            }
          }
        } catch {}
      }
    } catch {}
    // Try legacy readAsStringAsync
    try {
      let FS = null;
      try {
        FS = await import('expo-file-system/legacy');
        FS = FS.default || FS;
      } catch {
        const mod = await import('expo-file-system').catch(() => null);
        FS = mod?.default || mod;
      }
      if (FS?.readAsStringAsync && FS.EncodingType?.Base64) {
        const info = await FS.getInfoAsync?.(cand).catch(() => ({ exists: true }));
        if (info && info.exists === false) continue;
        const base64 = await FS.readAsStringAsync(cand, { encoding: FS.EncodingType.Base64 });
        if (base64 && base64.length > 100) return `data:image/jpeg;base64,${base64}`;
      }
    } catch {}
    try {
      const resp = await fetch(cand);
      if (resp.ok) {
        const blob = await resp.blob();
        if (blob && blob.size > 0) {
          const dataUri = await blobToBase64(blob);
          if (dataUri && dataUri.startsWith('data:')) return dataUri;
        }
      }
    } catch {}
  }
  return '';
};

const PRIMARY_PORT = '5000';
const FALLBACK_PORT = '5001';

export const getHostAddress = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      return window.location.hostname;
    }
    return 'localhost';
  }
  try {
    const Constants = require('expo-constants').default || require('expo-constants');
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.hostUri || Constants?.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
    }
  } catch {}
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const parsed = scriptURL.split('://')[1]?.split('/')[0]?.split(':')[0];
      if (parsed && parsed !== 'localhost' && parsed !== '127.0.0.1') {
        return parsed;
      }
    }
  } catch (e) {}
  if (Platform.OS === 'android') return '10.0.2.2';
  return '172.28.6.97';
};

export const getBaseUrl = (port = PRIMARY_PORT) => {
  const host = getHostAddress();
  return `http://${host}:${port}/api`;
};

export const API_BASE_URL = getBaseUrl();

export const apiRequest = async (endpoint, options = {}) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const isFormData =
    typeof FormData !== 'undefined' &&
    options.body != null &&
    (options.body instanceof FormData || typeof options.body.append === 'function');
  const defaultHeaders = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
  };
  const tryFetch = async (baseUrl) => {
    const url = `${baseUrl}${cleanEndpoint}`;
    const controller = new AbortController();
    const isReportsPost = cleanEndpoint === '/reports' && options?.method === 'POST';
    const timeoutMs = isReportsPost || isFormData ? 60000 : 15000;
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
      if (err && (err.name === 'AbortError' || err.name === 'TimeoutError' || /aborted|abort|timeout|canceled|cancelled|cancel/i.test(err.message || ''))) {
        const timeoutErr = new Error(`Request to ${cleanEndpoint} timed out or was aborted — please check your network and try again. (original: ${err.message})`);
        timeoutErr.name = 'TimeoutError';
        timeoutErr.cause = err;
        throw timeoutErr;
      }
      throw err;
    }
  };
  // Don't retry on client errors (400/422) - they will not succeed on another host
  const isClientError = (err) => /400|401|403|422|photo is required/i.test(err?.message || '');
  try {
    return await tryFetch(getBaseUrl(PRIMARY_PORT));
  } catch (primaryErr) {
    if (isClientError(primaryErr)) {
      console.error(`[API Error] Client error for ${cleanEndpoint} - not retrying:`, primaryErr.message);
      throw primaryErr;
    }
    // Only warn + retry for true network/unreachable or server errors or FormData serialization errors that might succeed via JSON fallback
    const shouldRetryFormData = /Unsupported FormDataPart/i.test(primaryErr?.message || '');
    if (!shouldRetryFormData) {
      console.warn(
        `[API Warning] Endpoint ${cleanEndpoint} unreachable on port ${PRIMARY_PORT} (${primaryErr.message}). Retrying fallback...`
      );
    } else {
      console.warn(`[API Warning] FormData failed on primary: ${primaryErr.message} - trying JSON fallback via fallback port if applicable`);
    }
    try {
      return await tryFetch(getBaseUrl(FALLBACK_PORT));
    } catch (fallbackErr) {
      if (isClientError(fallbackErr) || isClientError(primaryErr)) {
        console.error(`[API Error] Client error for ${cleanEndpoint}:`, fallbackErr.message || primaryErr.message);
        throw fallbackErr.message ? fallbackErr : primaryErr;
      }
      if (Platform.OS !== 'web') {
        const isLargePost = cleanEndpoint === '/reports' && options?.method === 'POST';
        const lastResortHosts = isLargePost
          ? [
              `http://10.0.2.2:${PRIMARY_PORT}/api`,
              `http://172.28.6.97:${PRIMARY_PORT}/api`,
              `http://192.168.8.183:${PRIMARY_PORT}/api`,
            ]
          : [
              `http://10.0.2.2:${PRIMARY_PORT}/api`,
              `http://localhost:${PRIMARY_PORT}/api`,
              `http://172.28.6.97:${PRIMARY_PORT}/api`,
              `http://192.168.8.183:${PRIMARY_PORT}/api`,
              `http://192.168.1.177:${PRIMARY_PORT}/api`,
              `http://192.168.0.100:${PRIMARY_PORT}/api`,
            ];
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

export const getRoute = (originNodeId, destinationNodeId, wheelchairAccessible = false, options = {}) => {
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

export const getReports = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/reports${query ? `?${query}` : ''}`);
};

export const getReportById = (id) => apiRequest(`/reports/${id}`);

export const createReport = async (reportData, photoFile) => {
  if (!photoFile) {
    return apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }
  // Prefer JSON data URI for native (most reliable) — avoids RN FormData Unsupported errors.
  // Try to convert file:// to data: URI first; if that fails or is too large, fallback to multipart.
  if (Platform.OS !== 'web' && photoFile) {
    try {
      const rawUriForData = typeof photoFile === 'object' && photoFile?.uri ? String(photoFile.uri) : typeof photoFile === 'string' ? String(photoFile) : '';
      if (rawUriForData && (rawUriForData.startsWith('file://') || rawUriForData.startsWith('content://') || rawUriForData.startsWith('/'))) {
        console.log(`[createReport] Trying data URI conversion for ${rawUriForData.slice(0,50)}...`);
        const dataUri = await fileUriToDataUri(rawUriForData);
        if (dataUri && dataUri.startsWith('data:image') && dataUri.length > 100 && dataUri.length < 8 * 1024 * 1024) {
          console.log(`[createReport] Data URI success (${(dataUri.length/1024).toFixed(1)}KB), sending JSON`);
          return apiRequest('/reports', {
            method: 'POST',
            body: JSON.stringify({ ...reportData, photoUrl: dataUri }),
          });
        } else if (dataUri && dataUri.startsWith('data:image')) {
          console.warn(`[createReport] Data URI too large (${(dataUri.length/1024).toFixed(1)}KB), falling back to multipart`);
        } else {
          console.warn('[createReport] Data URI conversion failed or empty, falling back to multipart');
        }
      }
    } catch (e) {
      console.warn('[createReport] Data URI attempt failed, falling back to multipart:', e?.message);
    }
  }
  let formData;
  try {
    formData = new FormData();
    if (Platform.OS === 'web') {
      if (photoFile instanceof File || photoFile instanceof Blob) {
        const fileName = String(photoFile.name || `photo_${Date.now()}.jpg`);
        console.log(`[createReport][web] Appending File/Blob: ${fileName} ${photoFile.type} ${photoFile.size} bytes`);
        formData.append('photo', photoFile, fileName);
      } else if (typeof photoFile === 'object' && photoFile !== null && typeof photoFile.uri === 'string') {
        let uri = String(photoFile.uri).trim();
        let name = String(photoFile.name || `photo_${Date.now()}.jpg`);
        if (!name.toLowerCase().endsWith('.jpg') && !name.toLowerCase().endsWith('.jpeg')) name = name.replace(/\.[^/.]+$/, '') + '.jpg';
        let type = String(photoFile.type || 'image/jpeg');
        if (!type.startsWith('image/')) type = 'image/jpeg';
        // On web, expo-image-picker often returns data: or blob:. Handle data: directly as photoUrl to avoid fetch issues
        if (uri.startsWith('data:image')) {
          console.log('[createReport][web] data: URI detected - sending as photoUrl JSON for Cloudinary');
          return apiRequest('/reports', {
            method: 'POST',
            body: JSON.stringify({ ...reportData, photoUrl: uri }),
          });
        }
        if (uri.startsWith('blob:') || uri.startsWith('data:')) {
          try {
            console.log(`[createReport][web] Fetching ${uri.slice(0,30)}... to File`);
            const resp = await fetch(uri);
            if (!resp.ok) throw new Error(`fetch blob/data failed: ${resp.status}`);
            const blob = await resp.blob();
            if (!blob || blob.size === 0) throw new Error('empty blob');
            const file = new File([blob], name, { type: String(blob.type || type) });
            console.log(`[createReport][web] Converted ${uri.slice(0,20)} -> File ${file.name} ${file.size} bytes`);
            formData.append('photo', file, name);
          } catch (e) {
            console.warn('[createReport][web] blob/data fetch failed, falling back to photoUrl:', e?.message);
            // Try fileUriToDataUri as fallback, then direct blob uri as last resort
            try {
              const dataUri = await fileUriToDataUri(uri);
              if (dataUri && dataUri.startsWith('data:')) {
                return apiRequest('/reports', {
                  method: 'POST',
                  body: JSON.stringify({ ...reportData, photoUrl: dataUri }),
                });
              }
            } catch {}
            return apiRequest('/reports', {
              method: 'POST',
              body: JSON.stringify({ ...reportData, photoUrl: String(uri) }),
            });
          }
        } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
          return apiRequest('/reports', {
            method: 'POST',
            body: JSON.stringify({ ...reportData, photoUrl: uri }),
          });
        } else {
          // file:// or content:// should not happen on web, but handle
          try {
            console.log(`[createReport][web] Trying fetch for uri: ${uri.slice(0,50)}`);
            const resp = await fetch(uri);
            if (!resp.ok) throw new Error(`fetch failed ${resp.status}`);
            const blob = await resp.blob();
            if (!blob || blob.size===0) throw new Error('empty blob');
            const file = new File([blob], name, { type: String(blob.type || type) });
            formData.append('photo', file, name);
          } catch (e) {
            console.warn('[createReport][web] fetch uri failed, sending as photoUrl:', e?.message);
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
      // Native (Android/iOS): directly append RN file descriptor — React Native handles multipart.
      // RN FormData ONLY supports {uri, name, type} where uri is file:// or content://. Blob/File/data:/blob: are unsupported -> Unsupported FormDataPart.
      if (typeof photoFile === 'object' && photoFile !== null && typeof photoFile.uri === 'string') {
        let rawUri = String(photoFile.uri).trim();
        let name = String(photoFile.name || `photo_${Date.now()}.jpg`);
        if (!name.toLowerCase().endsWith('.jpg') && !name.toLowerCase().endsWith('.jpeg')) {
          name = name.replace(/\.[^/.]+$/, '') + '.jpg';
        }
        let type = String(photoFile.type || 'image/jpeg');
        if (!type.startsWith('image/')) type = 'image/jpeg';
        // If uri is http/data/blob on native, we cannot send as multipart file - fallback to JSON photoUrl
        if (rawUri.startsWith('http://') || rawUri.startsWith('https://') || rawUri.startsWith('data:')) {
          console.warn(`[createReport] Native photo uri is ${rawUri.slice(0,20)} - sending as photoUrl JSON fallback`);
          return apiRequest('/reports', {
            method: 'POST',
            body: JSON.stringify({ ...reportData, photoUrl: rawUri }),
          });
        }
        if (rawUri.startsWith('blob:')) {
          console.warn('[createReport] blob: uri on native is unsupported - attempting dataUri fallback');
          try {
            const dataUri = await fileUriToDataUri(reportData.photoUrl || rawUri);
            if (dataUri && dataUri.startsWith('data:')) {
              return apiRequest('/reports', {
                method: 'POST',
                body: JSON.stringify({ ...reportData, photoUrl: dataUri }),
              });
            }
          } catch {}
          return apiRequest('/reports', {
            method: 'POST',
            body: JSON.stringify({ ...reportData, photoUrl: String(reportData.photoUrl || '') }),
          });
        }
        if (!rawUri.startsWith('file://') && !rawUri.startsWith('content://')) {
          // Expo may return file:// without prefix on some devices - add it
          if (rawUri.startsWith('/')) rawUri = `file://${rawUri}`;
        }
        const formattedPhoto = { uri: rawUri, name, type };
        console.log(`[createReport] Appending native photo: ${name} (${type}) ${rawUri.slice(0,60)}...`);
        // Validate file exists before append (helps catch stale content:// or revoked blob: early)
        try {
          const FS = await import('expo-file-system').catch(() => null);
          if (FS?.getInfoAsync) {
            const info = await FS.getInfoAsync(rawUri).catch(() => null);
            if (info && info.exists === false) {
              console.warn(`[createReport] File does not exist at ${rawUri}, will fallback to JSON`);
              const dataUri = await fileUriToDataUri(rawUri).catch(() => '');
              if (dataUri && dataUri.startsWith('data:')) {
                return apiRequest('/reports', { method: 'POST', body: JSON.stringify({ ...reportData, photoUrl: dataUri }) });
              }
              throw new Error(`Photo file not found at ${rawUri.slice(0,40)}. Please retake photo.`);
            }
          }
        } catch (e) {
          if (e?.message?.includes('Photo file not found')) throw e;
          // ignore validation errors, proceed to append
        }
        formData.append('photo', formattedPhoto);
      } else if (typeof File !== 'undefined' && photoFile instanceof File) {
        // File on native should not happen - convert to descriptor
        const rawUri = String(photoFile.uri || photoFile.name || `file:///tmp/photo_${Date.now()}.jpg`);
        const name = String(photoFile.name || `photo_${Date.now()}.jpg`).replace(/\.[^/.]+$/, '') + '.jpg';
        const formattedPhoto = { uri: rawUri.startsWith('file://') ? rawUri : `file://${rawUri}`, name, type: 'image/jpeg' };
        console.warn('[createReport] Converting File instance to native descriptor', formattedPhoto);
        formData.append('photo', formattedPhoto);
      } else if (typeof Blob !== 'undefined' && photoFile instanceof Blob) {
        console.warn('[createReport] Blob on native unsupported - falling back to JSON');
        try {
          const dataUri = await blobToBase64(photoFile);
          if (dataUri) {
            return apiRequest('/reports', {
              method: 'POST',
              body: JSON.stringify({ ...reportData, photoUrl: dataUri }),
            });
          }
        } catch {}
        return apiRequest('/reports', {
          method: 'POST',
          body: JSON.stringify({ ...reportData, photoUrl: String(reportData.photoUrl || '') }),
        });
      } else if (typeof photoFile === 'string') {
        const raw = String(photoFile).trim();
        if (raw.startsWith('data:') || raw.startsWith('http')) {
          return apiRequest('/reports', {
            method: 'POST',
            body: JSON.stringify({ ...reportData, photoUrl: raw }),
          });
        }
        if (raw.startsWith('blob:')) {
          console.warn('[createReport] string blob: on native - fallback to JSON');
          return apiRequest('/reports', {
            method: 'POST',
            body: JSON.stringify({ ...reportData, photoUrl: String(reportData.photoUrl || '') }),
          });
        }
        const name = `photo_${Date.now()}.jpg`;
        const uri = raw.startsWith('file://') || raw.startsWith('content://') ? raw : raw.startsWith('/') ? `file://${raw}` : raw;
        const formattedPhoto = { uri, name, type: 'image/jpeg' };
        formData.append('photo', formattedPhoto);
      } else {
        console.warn('[createReport] Unknown photoFile type on native, falling back to JSON', typeof photoFile, photoFile);
        return apiRequest('/reports', {
          method: 'POST',
          body: JSON.stringify({ ...reportData, photoUrl: String(reportData.photoUrl || String(photoFile || '')) }),
        });
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
    let fallbackPhotoUrl = '';
    if (rawFallback) {
      try {
        fallbackPhotoUrl = await fileUriToDataUri(String(rawFallback));
        console.log(`[createReport] fileUriToDataUri fallback result: ${fallbackPhotoUrl ? fallbackPhotoUrl.slice(0,30)+'...' : 'empty'}`);
      } catch (e) {
        console.warn('[createReport] fileUriToDataUri error:', e?.message);
      }
    }
    const finalPhotoUrl = String(fallbackPhotoUrl || reportData.photoUrl || rawFallback || '');
    if (!finalPhotoUrl || finalPhotoUrl.length < 10) {
      throw new Error('Failed to process photo file (empty after fallback). Please retake or choose a different image.');
    }
    return apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify({ ...reportData, photoUrl: finalPhotoUrl }),
    });
  }
  // Log FormData contents for debugging (RN: _parts)
  try {
    const parts = formData?._parts || [];
    console.log(`[createReport] Sending FormData with ${parts.length} parts, photo:`, typeof photoFile==='object' ? photoFile?.uri?.slice(0,50) : photoFile);
  } catch {}
  try {
    return await apiRequest('/reports', {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    const msg = err?.message || '';
    if (/Unsupported FormDataPart|FormData/i.test(msg)) {
      console.warn('[createReport] FormData unsupported, falling back to JSON:', msg, 'photoFile:', JSON.stringify(photoFile)?.slice(0,200));
      const rawFallback = reportData.photoUrl || (typeof photoFile === 'object' && photoFile?.uri ? String(photoFile.uri) : typeof photoFile === 'string' ? String(photoFile) : '');
      let fallbackPhotoUrl = '';
      if (rawFallback) {
        try {
          fallbackPhotoUrl = await fileUriToDataUri(String(rawFallback));
          console.log(`[createReport] Unsupported fallback fileUriToDataUri: ${fallbackPhotoUrl ? fallbackPhotoUrl.slice(0,30)+'...' : 'empty'}`);
        } catch (e) {
          console.warn('[createReport] fallback fileUriToDataUri error:', e?.message);
        }
      }
      const finalPhotoUrl = String(fallbackPhotoUrl || reportData.photoUrl || rawFallback || '');
      if (!finalPhotoUrl || finalPhotoUrl.length < 10) {
        throw new Error('Photo upload failed: Unsupported file format. Please try taking a new photo or choose from gallery.');
      }
      // If data: URI is huge (>6MB), backend may hit 10mb limit, try to send as is and let backend handle
      return apiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify({ ...reportData, photoUrl: finalPhotoUrl }),
      });
    }
    throw err;
  }
};

export const createBarrierReport = async (reportData, photoFile) => {
  if (!photoFile) {
    return apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }
  // Prefer JSON data URI for native (most reliable) — fallback to multipart
  if (Platform.OS !== 'web' && photoFile) {
    try {
      const rawUriForData = typeof photoFile === 'object' && photoFile?.uri ? String(photoFile.uri) : typeof photoFile === 'string' ? String(photoFile) : '';
      if (rawUriForData && (rawUriForData.startsWith('file://') || rawUriForData.startsWith('content://') || rawUriForData.startsWith('/'))) {
        console.log(`[createBarrierReport] Trying data URI conversion for ${rawUriForData.slice(0,50)}...`);
        const dataUri = await fileUriToDataUri(rawUriForData);
        if (dataUri && dataUri.startsWith('data:image') && dataUri.length > 100 && dataUri.length < 8 * 1024 * 1024) {
          console.log(`[createBarrierReport] Data URI success (${(dataUri.length/1024).toFixed(1)}KB), sending JSON`);
          return apiRequest('/reports', {
            method: 'POST',
            body: JSON.stringify({ ...reportData, photoUrl: dataUri }),
          });
        } else if (dataUri && dataUri.startsWith('data:image')) {
          console.warn(`[createBarrierReport] Data URI too large (${(dataUri.length/1024).toFixed(1)}KB), falling back to multipart`);
        }
      }
    } catch (e) {
      console.warn('[createBarrierReport] Data URI attempt failed, falling back to multipart:', e?.message);
    }
  }
  let formData;
  try {
    formData = new FormData();
    if (Platform.OS !== 'web') {
      if (typeof photoFile === 'object' && photoFile !== null && typeof photoFile.uri === 'string') {
        let rawUri = String(photoFile.uri).trim();
        let name = String(photoFile.name || `photo_${Date.now()}.jpg`);
        if (!name.toLowerCase().endsWith('.jpg') && !name.toLowerCase().endsWith('.jpeg')) name = name.replace(/\.[^/.]+$/, '') + '.jpg';
        let type = String(photoFile.type || 'image/jpeg');
        if (!type.startsWith('image/')) type = 'image/jpeg';
        if (rawUri.startsWith('http') || rawUri.startsWith('data:')) {
          return apiRequest('/reports', { method: 'POST', body: JSON.stringify({ ...reportData, photoUrl: rawUri }) });
        }
        if (rawUri.startsWith('blob:')) {
          return apiRequest('/reports', { method: 'POST', body: JSON.stringify({ ...reportData, photoUrl: String(reportData.photoUrl || '') }) });
        }
        if (!rawUri.startsWith('file://') && !rawUri.startsWith('content://') && rawUri.startsWith('/')) rawUri = `file://${rawUri}`;
        const formattedPhoto = { uri: rawUri, name, type };
        console.log(`[createBarrierReport] Appending native photo: ${name} (${type})`);
        formData.append('photo', formattedPhoto);
      } else if (typeof photoFile === 'string') {
        const raw = String(photoFile).trim();
        if (raw.startsWith('data:') || raw.startsWith('http')) {
          return apiRequest('/reports', { method: 'POST', body: JSON.stringify({ ...reportData, photoUrl: raw }) });
        }
        if (raw.startsWith('blob:')) {
          return apiRequest('/reports', { method: 'POST', body: JSON.stringify({ ...reportData, photoUrl: String(reportData.photoUrl || '') }) });
        }
        const uri = raw.startsWith('file://') || raw.startsWith('content://') ? raw : raw.startsWith('/') ? `file://${raw}` : raw;
        const formattedPhoto = { uri, name: `photo_${Date.now()}.jpg`, type: 'image/jpeg' };
        formData.append('photo', formattedPhoto);
      } else {
        const rawUri = String(photoFile.uri || `file:///tmp/photo_${Date.now()}.jpg`);
        const name = String(photoFile.name || `photo_${Date.now()}.jpg`).replace(/\.[^/.]+$/, '') + '.jpg';
        formData.append('photo', { uri: rawUri.startsWith('file://') ? rawUri : `file://${rawUri}`, name, type: 'image/jpeg' });
      }
    } else {
      if (photoFile instanceof File || photoFile instanceof Blob) {
        const fileName = String(photoFile.name || `photo_${Date.now()}.jpg`);
        console.log(`[createBarrierReport][web] Appending File/Blob: ${fileName} ${photoFile.type} ${photoFile.size} bytes`);
        formData.append('photo', photoFile, fileName);
      } else if (typeof photoFile === 'object' && typeof photoFile.uri === 'string') {
        let uri = String(photoFile.uri).trim();
        let name = String(photoFile.name || `photo_${Date.now()}.jpg`);
        if (!name.toLowerCase().endsWith('.jpg') && !name.toLowerCase().endsWith('.jpeg')) name = name.replace(/\.[^/.]+$/, '') + '.jpg';
        let type = String(photoFile.type || 'image/jpeg');
        if (!type.startsWith('image/')) type = 'image/jpeg';
        if (uri.startsWith('data:image')) {
          console.log('[createBarrierReport][web] data: URI - sending as photoUrl JSON');
          return apiRequest('/reports', { method: 'POST', body: JSON.stringify({ ...reportData, photoUrl: uri }) });
        }
        if (uri.startsWith('http://') || uri.startsWith('https://')) {
          return apiRequest('/reports', { method: 'POST', body: JSON.stringify({ ...reportData, photoUrl: uri }) });
        }
        try {
          console.log(`[createBarrierReport][web] Fetching ${uri.slice(0,30)}...`);
          const resp = await fetch(uri);
          if (!resp.ok) throw new Error(`fetch failed ${resp.status}`);
          const blob = await resp.blob();
          if (!blob || blob.size===0) throw new Error('empty blob');
          const file = new File([blob], name, { type: String(blob.type || type) });
          console.log(`[createBarrierReport][web] Converted -> File ${file.name} ${file.size} bytes`);
          formData.append('photo', file, name);
        } catch (e) {
          console.warn('[createBarrierReport][web] fetch failed, trying photoUrl fallback:', e?.message);
          try {
            const dataUri = await fileUriToDataUri(uri);
            if (dataUri && dataUri.startsWith('data:')) {
              return apiRequest('/reports', { method: 'POST', body: JSON.stringify({ ...reportData, photoUrl: dataUri }) });
            }
          } catch {}
          return apiRequest('/reports', { method: 'POST', body: JSON.stringify({ ...reportData, photoUrl: uri }) });
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
