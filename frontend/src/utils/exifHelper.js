/**
 * SPT-008 EXIF Metadata Extraction Utility
 * Volunteer Barrier Reporting — reusable for SPT-108 Camera Capture & Automatic Extraction
 *
 * Responsibilities: read GPS latitude/longitude + captured timestamp from an image File.
 * Returns clean structured data mappable to BarrierReport:
 *   coordinates.latitude  <- latitude
 *   coordinates.longitude <- longitude
 *   capturedAt / exifMetadata.timestamp <- capturedAt
 *   exifMetadata.altitude <- altitude (optional)
 *
 * Zero UI, pure async, client-side only. Uses exifreader (open-source, no native deps).
 * Supports: File, Blob, ArrayBuffer, { uri: string } (Expo ImagePicker)
 */

import ExifReader from 'exifreader';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isValidLatitude = (v) => typeof v === 'number' && Number.isFinite(v) && v >= -90 && v <= 90;
const isValidLongitude = (v) => typeof v === 'number' && Number.isFinite(v) && v >= -180 && v <= 180;

/**
 * Convert EXIF rational values to number.
 * exifreader may store value as number, array of numbers, or array of [num,den].
 */
function rationalToNumber(r) {
  if (typeof r === 'number') return r;
  if (Array.isArray(r) && r.length === 2 && typeof r[0] === 'number' && typeof r[1] === 'number') {
    return r[1] === 0 ? 0 : r[0] / r[1];
  }
  return Number(r);
}

function toNumberArray(value) {
  if (!Array.isArray(value)) return null;
  return value.map(rationalToNumber);
}

/**
 * Convert DMS (degrees/minutes/seconds) + ref to decimal degrees.
 * @param {number[]} dms - [D, M, S]
 * @param {string} ref - N/S/E/W
 * @returns {number|null}
 */
export function dmsToDecimal(dms, ref) {
  if (!Array.isArray(dms) || dms.length < 3) return null;
  const [d, m, s] = dms;
  if (![d, m, s].every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  let dec = Math.abs(d) + m / 60 + s / 3600;
  if (ref === 'S' || ref === 'W') dec = -dec;
  return dec;
}

/**
 * Resolve tag value that may be stored as {value, description} or raw.
 */
function getTagValue(tags, key) {
  const tag = tags[key];
  if (!tag) return undefined;
  // exifreader tag shape: { value: ..., description: ... }
  if (typeof tag === 'object' && 'value' in tag) return tag.value;
  return tag;
}

function getTagDescription(tags, key) {
  const tag = tags[key];
  if (!tag) return undefined;
  if (typeof tag === 'object' && 'description' in tag) return tag.description;
  return undefined;
}

function getRefString(tags, key) {
  // GPS refs may be stored as string or array/object
  const v = getTagValue(tags, key);
  const d = getTagDescription(tags, key);
  if (typeof v === 'string' && v.length) return v.trim().charAt(0).toUpperCase();
  if (typeof d === 'string' && d.length) return d.trim().charAt(0).toUpperCase();
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0].charAt(0).toUpperCase();
  return undefined;
}

/**
 * Parse EXIF date string "YYYY:MM:DD HH:MM:SS" (or "YYYY-MM-DD ...") to Date.
 * Returns null on invalid.
 */
export function parseExifDate(dateStr) {
  if (typeof dateStr !== 'string' || !dateStr.trim()) return null;
  const s = dateStr.trim();
  // Normalize "2023:01:02 15:04:05" -> "2023-01-02T15:04:05"
  // Also handles subsec split: "2023:01:02 15:04:05.123"
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
    const ms = s.match(/\.(\d{1,3})/);
    const isoMs = ms ? `${iso}.${ms[1].padEnd(3, '0')}` : iso;
    const d = new Date(isoMs);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Fallback: try Date parse after replacing colons in date part
  const fallback = s.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').replace(' ', 'T');
  const d2 = new Date(fallback);
  return Number.isNaN(d2.getTime()) ? null : d2;
}

function parseGpsDateTime(tags) {
  const dateStamp = getTagDescription(tags, 'GPSDateStamp') || getTagValue(tags, 'GPSDateStamp');
  // GPSTimeStamp is array [H, M, S] rational
  const timeStampVal = getTagValue(tags, 'GPSTimeStamp');
  if (typeof dateStamp === 'string' && timeStampVal) {
    const timeArr = toNumberArray(timeStampVal);
    if (timeArr && timeArr.length === 3) {
      // dateStamp: "2023:01:02" -> "2023-01-02"
      const datePart = dateStamp.trim().replace(/:/g, '-');
      const hh = String(Math.floor(timeArr[0])).padStart(2, '0');
      const mm = String(Math.floor(timeArr[1])).padStart(2, '0');
      const ss = String(Math.floor(timeArr[2])).padStart(2, '0');
      const d = new Date(`${datePart}T${hh}:${mm}:${ss}Z`);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function extractGps(tags) {
  // Try direct decimal tags if present (some writers store as single rational)
  // Otherwise DMS + Ref
  let latitude = null;
  let longitude = null;
  let altitude = null;

  const latVal = getTagValue(tags, 'GPSLatitude');
  const latRef = getRefString(tags, 'GPSLatitudeRef');
  const lngVal = getTagValue(tags, 'GPSLongitude');
  const lngRef = getRefString(tags, 'GPSLongitudeRef');

  if (latVal !== undefined && lngVal !== undefined) {
    const latArr = toNumberArray(latVal);
    const lngArr = toNumberArray(lngVal);
    // exifreader may also give single decimal number for some files
    if (latArr && lngArr) {
      latitude = dmsToDecimal(latArr, latRef || 'N');
      longitude = dmsToDecimal(lngArr, lngRef || 'E');
    } else if (typeof latVal === 'number' && typeof lngVal === 'number') {
      latitude = latVal * (latRef === 'S' ? -1 : 1);
      longitude = lngVal * (lngRef === 'W' ? -1 : 1);
    } else if (typeof latVal === 'string' && typeof lngVal === 'string') {
      // fallback: description already decimal?
      const ld = getTagDescription(tags, 'GPSLatitude');
      const lgd = getTagDescription(tags, 'GPSLongitude');
      if (ld) latitude = parseFloat(ld);
      if (lgd) longitude = parseFloat(lgd);
    }
  }

  // GPSAltitude
  const altVal = getTagValue(tags, 'GPSAltitude');
  const altRefVal = getTagValue(tags, 'GPSAltitudeRef'); // 0 = above sea level, 1 = below
  if (altVal !== undefined) {
    if (typeof altVal === 'number') altitude = altVal;
    else if (Array.isArray(altVal) && altVal.length === 2) altitude = rationalToNumber(altVal);
    else if (Array.isArray(altVal) && altVal.length === 1) altitude = rationalToNumber(altVal[0]);
    if (typeof altitude === 'number' && altRefVal === 1) altitude = -Math.abs(altitude);
    if (typeof altitude === 'number' && (getTagDescription(tags, 'GPSAltitudeRef') || '').toLowerCase().includes('below')) {
      altitude = -Math.abs(altitude);
    }
  }

  if (!isValidLatitude(latitude)) latitude = null;
  if (!isValidLongitude(longitude)) longitude = null;
  if (typeof altitude === 'number' && !Number.isFinite(altitude)) altitude = null;

  return { latitude, longitude, altitude };
}

function extractTimestamp(tags) {
  // Priority: DateTimeOriginal > CreateDate > ModifyDate/DateTime > GPSDateStamp+Time
  const candidates = [
    getTagDescription(tags, 'DateTimeOriginal') || getTagValue(tags, 'DateTimeOriginal'),
    getTagDescription(tags, 'CreateDate') || getTagValue(tags, 'CreateDate'),
    getTagDescription(tags, 'DateTime') || getTagValue(tags, 'DateTime'),
    getTagDescription(tags, 'ModifyDate') || getTagValue(tags, 'ModifyDate'),
  ];
  for (const c of candidates) {
    const d = parseExifDate(c);
    if (d) return d;
  }
  const gpsDt = parseGpsDateTime(tags);
  if (gpsDt) return gpsDt;
  return null;
}

// ---------------------------------------------------------------------------
// ArrayBuffer resolver (supports File/Blob/ArrayBuffer/uri)
// ---------------------------------------------------------------------------

async function toArrayBuffer(input) {
  if (!input) throw new TypeError('extractExifData: input is required (File | Blob | ArrayBuffer | { uri })');

  if (input instanceof ArrayBuffer) return input;
  if (ArrayBuffer.isView(input)) return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);

  // File / Blob with arrayBuffer()
  if (typeof input.arrayBuffer === 'function') {
    return await input.arrayBuffer();
  }

  // Expo ImagePicker result: { uri: string }
  if (typeof input === 'object' && typeof input.uri === 'string') {
    const res = await fetch(input.uri);
    const blob = await res.blob();
    return await blob.arrayBuffer();
  }

  // Plain uri string (fallback)
  if (typeof input === 'string') {
    const res = await fetch(input);
    const blob = await res.blob();
    return await blob.arrayBuffer();
  }

  // Fallback via FileReader for older RN blobs without arrayBuffer()
  if (typeof FileReader !== 'undefined' && input instanceof Blob) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
      reader.readAsArrayBuffer(input);
    });
  }

  throw new TypeError('extractExifData: unsupported input type. Expected File, Blob, ArrayBuffer, or { uri: string }');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ExifResult
 * @property {number|null} latitude - Decimal degrees or null if absent/invalid
 * @property {number|null} longitude - Decimal degrees or null if absent/invalid
 * @property {Date|null} capturedAt - EXIF capture timestamp or null
 * @property {number|null} altitude - GPS altitude meters or null
 * @property {boolean} hasGps - true if both latitude and longitude present
 * @property {boolean} hasTimestamp - true if capturedAt present
 */

/**
 * Extract GPS coordinates and capture timestamp from an image File.
 * Pure, async, no side-effects — reusable by SPT-108 camera flow.
 *
 * @param {File|Blob|ArrayBuffer|{uri:string}|string} file - Image file from input/camera
 * @returns {Promise<ExifResult>} Structured result mappable to BarrierReport.coordinates / capturedAt / exifMetadata
 *
 * @example
 * const exif = await extractExifData(file);
 * // exif.latitude -> coordinates.latitude
 * // exif.longitude -> coordinates.longitude
 * // exif.capturedAt -> capturedAt & exifMetadata.timestamp
 */
export async function extractExifData(file) {
  const buffer = await toArrayBuffer(file);

  let tags = {};
  try {
    tags = await ExifReader.load(buffer, { expanded: false });
  } catch (e) {
    // No EXIF or corrupt — return nulls gracefully for SPT-108 badge fallback
    return {
      latitude: null,
      longitude: null,
      capturedAt: null,
      altitude: null,
      hasGps: false,
      hasTimestamp: false,
    };
  }

  const { latitude, longitude, altitude } = extractGps(tags);
  const capturedAt = extractTimestamp(tags);

  return {
    latitude,
    longitude,
    capturedAt,
    altitude,
    hasGps: latitude !== null && longitude !== null,
    hasTimestamp: capturedAt !== null,
  };
}

/**
 * Back-compat alias for placeholder API.
 * Also handles legacy (imageUri:string) signature by delegating to extractExifData if possible.
 * @deprecated Use extractExifData
 */
export const parseExifData = extractExifData;

/**
 * Map EXIF result to BarrierReport fields (helper for SPT-108/206).
 * @param {ExifResult} exif
 * @returns {{ coordinates: {latitude:number|null, longitude:number|null}, capturedAt: Date|null, exifMetadata: {latitude:number|null, longitude:number|null, timestamp:Date|null, altitude:number|null} }}
 */
export function toBarrierReportFields(exif) {
  if (!exif || typeof exif !== 'object') {
    return {
      coordinates: { latitude: null, longitude: null },
      capturedAt: null,
      exifMetadata: { latitude: null, longitude: null, timestamp: null, altitude: null },
    };
  }
  return {
    coordinates: { latitude: exif.latitude ?? null, longitude: exif.longitude ?? null },
    capturedAt: exif.capturedAt ?? null,
    exifMetadata: {
      latitude: exif.latitude ?? null,
      longitude: exif.longitude ?? null,
      timestamp: exif.capturedAt ?? null,
      altitude: exif.altitude ?? null,
    },
  };
}

export default { extractExifData, parseExifData, dmsToDecimal, parseExifDate, toBarrierReportFields };
