import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, AccessibilityInfo, Alert, TextInput, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import EXIFCaptureScreen from './EXIFCaptureScreen';
import BaseMap from '../../components/BaseMap';
import { useTheme } from '../../theme/ThemeContext';
import { getTextStyle, textProps } from '../../theme/typography';
import { loadVolunteerDraft, saveVolunteerDraft, clearVolunteerDraft, loadPendingReports, queuePendingReport, removePendingReport, syncPendingReports } from '../../theme/storage';
import { createBarrierReport, createReport, getReports } from '../../services/api';
import { useLocation } from '../../hooks/useLocation';
import { toBarrierReportFields } from '../../utils/exifHelper';
import CorroborateButton from '../../components/CorroborateButton';
import { calculateHaversineDistance } from '../../utils/mapMath';
import authService from '../../services/authService';

import { getMockReports } from '../../services/triageService';

const CATEGORIES = [
  { value: 'Ramp', label: 'Ramp', icon: '♿', desc: 'Ramp / slope / curb' },
  { value: 'Lift', label: 'Lift', icon: '🛗', desc: 'Elevator / lift failure' },
  { value: 'Tactile Paving', label: 'Tactile Paving', icon: '⠿', desc: 'Tactile ground surface' },
  { value: 'Restroom', label: 'Restroom', icon: '🚻', desc: 'Accessible restroom' },
  { value: 'Other', label: 'Other', icon: '⚠', desc: 'Other barrier' },
];

const TOTAL_STEPS = 3;

// Lightweight mini-map picker reusing BaseMap (Leaflet) — mirrors AdminAddReportModal MiniMapPicker
const MiniMapPicker = ({ center, selected, onPick }) => {
  const mapCenter = selected || center || { latitude: 6.9271, longitude: 79.8612 };
  const markers = selected ? [{ lat: selected.latitude, lng: selected.longitude, title: 'Selected Pin', type: 'destination' }] : [];
  const handleMapClick = useCallback(
    (payload) => {
      const lat = payload?.latitude ?? payload?.lat;
      const lng = payload?.longitude ?? payload?.lng;
      if (typeof lat === 'number' && typeof lng === 'number') onPick(lat, lng);
    },
    [onPick]
  );
  const nudge = (dLat, dLng) => {
    const cur = selected || mapCenter;
    onPick(cur.latitude + dLat, cur.longitude + dLng);
  };
  return (
    <View style={miniMapStyles.container}>
      <View style={miniMapStyles.mapFrame}>
        <BaseMap
          center={[mapCenter.latitude, mapCenter.longitude]}
          markers={markers}
          onMapClick={handleMapClick}
          zoom={16}
          style={{ height: 200, borderRadius: 12 }}
        />
        <View pointerEvents="none" style={miniMapStyles.crosshair}>
          <Feather name="plus" size={18} color="#0F172A" style={{ opacity: 0.6 }} />
        </View>
      </View>
      <View style={miniMapStyles.nudgeRow}>
        <TouchableOpacity style={miniMapStyles.nudgeBtn} onPress={() => nudge(0.0005, 0)} accessibilityLabel="Nudge north">
          <Feather name="chevron-up" size={14} color="#0F172A" />
        </TouchableOpacity>
        <View style={miniMapStyles.nudgeMiddle}>
          <TouchableOpacity style={miniMapStyles.nudgeBtn} onPress={() => nudge(0, -0.0005)} accessibilityLabel="Nudge west">
            <Feather name="chevron-left" size={14} color="#0F172A" />
          </TouchableOpacity>
          <View style={miniMapStyles.nudgeCenter}>
            <Feather name="map-pin" size={16} color="#DC2626" />
          </View>
          <TouchableOpacity style={miniMapStyles.nudgeBtn} onPress={() => nudge(0, 0.0005)} accessibilityLabel="Nudge east">
            <Feather name="chevron-right" size={14} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={miniMapStyles.nudgeBtn} onPress={() => nudge(-0.0005, 0)} accessibilityLabel="Nudge south">
          <Feather name="chevron-down" size={14} color="#0F172A" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const miniMapStyles = StyleSheet.create({
  container: { gap: 8 },
  mapFrame: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#0F172A',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -9,
    marginLeft: -9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nudgeMiddle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nudgeCenter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nudgeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const ThreeTapReportScreen = ({ onSuccess, onNavigateToMap, navigation }) => {
  const { palette, borderWidth, isHighContrast, announce } = useTheme();
  const { location: deviceLocation, getCurrentLocation } = useLocation();

  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [exifResult, setExifResult] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [rating, setRating] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const hasHydratedRef = useRef(false);
  // Success-authoritative submit: only the latest attempt may surface error UI, and a
  // 201 success permanently clears any photo/network error state (no stale modals).
  const submitAttemptRef = useRef(0);
  const lastSuccessAtRef = useRef(0);

  // Admin-parity fields — preserved in volunteer flow, distributed across 3 taps
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [locationTouched, setLocationTouched] = useState(false);
  const [condition, setCondition] = useState('bad');
  const [capturedAt, setCapturedAt] = useState(new Date().toISOString());
  const [manualCoords, setManualCoords] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Unified parent form state — single source of truth across 3 taps (Back navigation preserves all fields)
  // Matches MongoDB BarrierReport schema: name, category, condition, locationName, rating, notes, photo, coordinates/location, exifMetadata, capturedAt
  const formState = useMemo(() => {
    const lat = manualCoords?.latitude ?? exifResult?.latitude ?? deviceLocation?.latitude ?? null;
    const lng = manualCoords?.longitude ?? exifResult?.longitude ?? deviceLocation?.longitude ?? null;
    return {
      name,
      category,
      condition,
      locationName,
      rating,
      notes,
      photo: photoFile,
      photoUri: imageUri,
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
      coordinates: lat != null && lng != null ? { latitude: lat, longitude: lng } : null,
      location: lat != null && lng != null ? { type: 'Point', coordinates: [lng, lat] } : null,
      exifMetadata: exifResult
        ? {
            latitude: exifResult.latitude ?? lat,
            longitude: exifResult.longitude ?? lng,
            altitude: exifResult.altitude ?? null,
            timestamp: exifResult.capturedAt instanceof Date ? exifResult.capturedAt : exifResult.capturedAt ? new Date(exifResult.capturedAt) : null,
            capturedAt: exifResult.capturedAt ?? null,
            hasGps: !!exifResult.hasGps,
            hasTimestamp: !!exifResult.hasTimestamp,
          }
        : null,
      capturedAt,
      exifResult,
      manualCoords,
    };
  }, [name, category, condition, locationName, rating, notes, photoFile, imageUri, manualCoords, exifResult, deviceLocation, capturedAt]);
  // Alias per spec wording
  const reportData = formState;

  // SPT-301: nearby existing barriers for corroboration
  const [nearbyReports, setNearbyReports] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [corroboratedExistingId, setCorroboratedExistingId] = useState(null);

  // Offline queue state — reports cached in storage.js when POST /api/reports is unreachable
  const [pendingCount, setPendingCount] = useState(0);
  const [syncingPending, setSyncingPending] = useState(false);

  // Direct MongoDB persist: HTTP POST /api/reports via api.js (multipart `photo` or JSON `photoUrl`)
  // Shaping only — api.js owns strict per-platform FormData construction (never appends
  // plain objects on web). Pre-flight assert converts a native crash into a clear photo error.
  const submitToApi = useCallback(async (payload, photoMeta) => {
    if (photoMeta != null) {
      const isFile = typeof File !== 'undefined' && (photoMeta instanceof File || photoMeta instanceof Blob);
      const isUriPart = photoMeta && typeof photoMeta === 'object' && typeof photoMeta.uri === 'string' && !!photoMeta.uri;
      const isUriString = typeof photoMeta === 'string' && !!photoMeta;
      if (!isFile && !isUriPart && !isUriString) {
        throw new Error('Invalid photo attachment — please retake or pick another image.');
      }
    }
    const normalizePhotoForUpload = async (pf) => {
      if (!pf) return null;
      if (Platform.OS !== 'web') {
        // Native (Expo Go): strip to the exact { uri, name, type } shape api.js expects
        if (typeof pf === 'object' && typeof pf.uri === 'string' && pf.uri) {
          // Guard sync-retry path too: a queued file:// that was deleted since can
          // never upload — fail fast as a photo error (dropped after retry) instead
          // of looping the offline queue forever.
          if (/^(file|content|ph):\/\//i.test(pf.uri)) {
            try {
              const FS = await import('expo-file-system');
              if (FS && typeof FS.getInfoAsync === 'function') {
                const info = await FS.getInfoAsync(pf.uri);
                if (info && info.exists === false) {
                  throw new Error('Could not read selected image — please retake or pick another image.');
                }
              }
            } catch (e) {
              if (/could not read selected image/i.test(e?.message || '')) throw e;
              // Existence check unavailable — proceed, network/backend validates.
            }
          }
          return { uri: pf.uri, name: pf.name || pf.fileName || 'barrier.jpg', type: pf.type || 'image/jpeg' };
        }
        return pf;
      }
      return pf;
    };
    const normalizedPhoto = await normalizePhotoForUpload(photoMeta);
    if (normalizedPhoto) {
      return createReport(payload, normalizedPhoto);
    }
    const uri = payload?.photoUrl;
    if (uri && typeof uri === 'string' && (uri.startsWith('blob:') || uri.startsWith('data:')) && Platform.OS === 'web') {
      // A fetch failure here means the bytes are unreadable (e.g. revoked blob URL) —
      // route to the photo error path, never the offline queue.
      try {
        const blobResp = await fetch(uri);
        const blob = await blobResp.blob();
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
        return createReport(payload, file);
      } catch {
        throw new Error('Could not read selected image — please retake or pick another image.');
      }
    }
    return createBarrierReport(payload);
  }, []);

  // Single queued-entry submitter shared by manual + mount auto-sync. Entries whose
  // photo bytes are permanently unreadable (e.g. revoked blob URL from an older app
  // version) can never succeed — drop them after one retry instead of failing every
  // launch with a misleading "Photo attachment failed" modal.
  const syncOneQueuedReport = useCallback(async (payload, photoMeta, entry) => {
    try {
      const res = await submitToApi(payload, photoMeta);
      const ok = res && (res.success || res.data);
      if (!ok && res && res.success === false) throw new Error(res.message || 'Sync failed');
      return res;
    } catch (e) {
      const raw = `${e?.message || ''}`.toLowerCase();
      const deadPhoto = /formdata|formdatapart|invalid photo attachment|could not read selected image/.test(raw);
      if (deadPhoto && (entry?.attempts || 0) >= 1 && entry?.id) {
        try { await removePendingReport(entry.id); } catch {}
        return { dropped: true };
      }
      throw e;
    }
  }, [submitToApi]);

  // Sync offline-cached drafts from storage.js straight to MongoDB once connectivity is back
  const syncOfflineQueue = useCallback(async () => {
    setSyncingPending(true);
    try {
      const result = await syncPendingReports(syncOneQueuedReport);
      const remaining = await loadPendingReports();
      setPendingCount(remaining.length);
      if (result.synced > 0) {
        setErrorMsg(null);
        const msg = `Synced ${result.synced} offline report${result.synced > 1 ? 's' : ''} to database`;
        setSuccessMsg(msg);
        try { AccessibilityInfo.announceForAccessibility(msg); } catch {}
      }
      return result;
    } catch {
      return { synced: 0, remaining: pendingCount };
    } finally {
      setSyncingPending(false);
    }
  }, [syncOneQueuedReport, pendingCount]);

  const isNetworkError = useCallback((e) => {
    if (e?.isHttpError) return e.status >= 500 || e.status === 429;
    const raw = `${e?.message || ''} ${e?.cause?.message || ''}`.toLowerCase();
    if (/api request failed:\s*4\d\d\b/.test(raw)) return false;
    return /network|fetch|abort|offline|failed to fetch|econn|etimedout|timeout|unreachable|all connection attempts failed|load failed/.test(raw);
  }, []);

  // FormData/photo shaping failures must never enter the offline queue — the same
  // payload would fail on every sync retry. Show a photo-specific message instead.
  const isFormDataError = useCallback((e) => {
    const raw = `${e?.message || ''} ${e?.cause?.message || ''}`.toLowerCase();
    return /formdata|formdatapart|invalid photo attachment|could not read selected image/.test(raw);
  }, []);

  // Prefer the exact backend validation message (reportController.js) over the
  // generic "API Request Failed: 400 Bad Request — …" wrapper in banners/alerts.
  const toFriendlyError = useCallback((e) => {
    const detail = typeof e?.detail === 'string' && e.detail ? e.detail : '';
    const backendError = typeof e?.backendError === 'string' && e.backendError ? e.backendError : '';
    const combined = [detail, backendError && backendError !== detail ? backendError : ''].filter(Boolean).join(' | ');
    if (combined) return combined;
    const raw = e?.message || 'Failed to submit report. Please try again.';
    return raw.replace(/^API Request Failed:\s*\d{3}\s*[^—]*—\s*/, '').trim() || raw;
  }, []);

  // On mount: refresh offline queue count and push cached drafts to MongoDB when back online
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pending = await loadPendingReports();
        if (!cancelled) setPendingCount(pending.length);
        if (pending.length > 0) {
          setSyncingPending(true);
          try {
            const result = await syncPendingReports(syncOneQueuedReport);
            if (!cancelled) {
              setPendingCount(result.remaining);
              if (result.synced > 0) {
                const msg = `Synced ${result.synced} offline report${result.synced > 1 ? 's' : ''} to database`;
                setSuccessMsg(msg);
                try { AccessibilityInfo.announceForAccessibility(msg); } catch {}
              }
            }
          } finally {
            if (!cancelled) setSyncingPending(false);
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [syncOneQueuedReport]);

  // Load draft on mount — now includes admin-parity fields
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const draft = await loadVolunteerDraft();
        if (!mounted || !draft) {
          setDraftLoaded(true);
          hasHydratedRef.current = true;
          return;
        }
        if (draft.category && CATEGORIES.some((c) => c.value === draft.category)) {
          setCategory(draft.category);
        }
        if (draft.imageUri) setImageUri(draft.imageUri);
        if (draft.exifResult) {
          let exif = draft.exifResult;
          if (exif.capturedAt && typeof exif.capturedAt === 'string') {
            const d = new Date(exif.capturedAt);
            exif = { ...exif, capturedAt: Number.isNaN(d.getTime()) ? null : d, hasTimestamp: !!d && !Number.isNaN(d.getTime()) };
          }
          const hasGps = typeof exif.latitude === 'number' && typeof exif.longitude === 'number';
          setExifResult({ ...exif, hasGps });
        }
        if (draft.file) setPhotoFile(draft.file);
        if (typeof draft.rating === 'number' && draft.rating >= 1 && draft.rating <= 5) setRating(draft.rating);
        if (typeof draft.notes === 'string') setNotes(draft.notes);
        if (typeof draft.name === 'string') {
          setName(draft.name);
          if (draft.name) setNameTouched(true);
        }
        if (draft.condition === 'good' || draft.condition === 'bad') setCondition(draft.condition);
        if (typeof draft.locationName === 'string') {
          setLocationName(draft.locationName);
          if (draft.locationName) setLocationTouched(true);
        }
        if (draft.capturedAt) {
          const d = new Date(draft.capturedAt);
          if (!Number.isNaN(d.getTime())) setCapturedAt(d.toISOString());
        }
        if (draft.manualCoords && typeof draft.manualCoords.latitude === 'number' && typeof draft.manualCoords.longitude === 'number') {
          setManualCoords(draft.manualCoords);
        }
      } catch {}
      if (mounted) {
        setDraftLoaded(true);
        setTimeout(() => { hasHydratedRef.current = true; }, 300);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Auto-fill name from category if not manually touched — mirrors AdminAddReportModal
  useEffect(() => {
    if (category && !nameTouched) {
      setName(`${category} Barrier`);
    }
  }, [category, nameTouched]);

  // Auto-fill locationName if not touched — volunteer uses generic fallback (admin uses ward.name)
  useEffect(() => {
    if (!locationTouched) {
      const lat = manualCoords?.latitude ?? exifResult?.latitude ?? deviceLocation?.latitude;
      const lng = manualCoords?.longitude ?? exifResult?.longitude ?? deviceLocation?.longitude;
      if (typeof lat === 'number' && typeof lng === 'number') {
        setLocationName(`Volunteer Report ${lat.toFixed(3)}, ${lng.toFixed(3)}`);
      } else if (!locationName) {
        setLocationName('Volunteer Report Location');
      }
    }
  }, [manualCoords, exifResult, deviceLocation, locationTouched, locationName]);

  // Auto-set capturedAt from EXIF or now — mirrors Admin
  useEffect(() => {
    if (exifResult?.capturedAt) {
      const d = exifResult.capturedAt instanceof Date ? exifResult.capturedAt : new Date(exifResult.capturedAt);
      if (!Number.isNaN(d.getTime())) setCapturedAt(d.toISOString());
    } else if (imageUri) {
      // keep existing capturedAt if photo exists but no EXIF timestamp — default already set
    }
  }, [exifResult, imageUri]);

  // Save draft on every change after hydration — includes admin-parity fields
  useEffect(() => {
    if (!draftLoaded || !hasHydratedRef.current) return;
    const t = setTimeout(() => {
      saveVolunteerDraft({
        imageUri,
        exifResult: exifResult
          ? {
              latitude: exifResult.latitude ?? null,
              longitude: exifResult.longitude ?? null,
              altitude: exifResult.altitude ?? null,
              hasGps: !!exifResult.hasGps,
              hasTimestamp: !!exifResult.hasTimestamp,
              capturedAt: exifResult.capturedAt instanceof Date ? exifResult.capturedAt.toISOString() : exifResult.capturedAt ?? null,
            }
          : null,
        category,
        rating,
        notes,
        name,
        condition,
        locationName,
        capturedAt,
        manualCoords,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [imageUri, exifResult, category, rating, notes, name, condition, locationName, capturedAt, manualCoords, draftLoaded]);

  // SPT-301: Fetch nearby existing barriers (250m radius) for Step 1 corroboration
  useEffect(() => {
    if (step !== 1) return;
    const lat = manualCoords?.latitude ?? exifResult?.latitude ?? deviceLocation?.latitude;
    const lng = manualCoords?.longitude ?? exifResult?.longitude ?? deviceLocation?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      setNearbyReports([]);
      return;
    }
    let cancelled = false;
    setLoadingNearby(true);
    (async () => {
      try {
        let allReports = [];
        try {
          let res;
          try {
            res = await getReports({ near: `${lat},${lng}`, radius: 250, limit: 50 });
          } catch {
            res = await getReports({ limit: 50 });
          }
          const data = res?.data || res?.reports || res;
          allReports = Array.isArray(data) ? data : data?.data && Array.isArray(data.data) ? data.data : [];
          if (!Array.isArray(allReports) && res?.data?.reports) allReports = res.data.reports;
          if (allReports.length === 0) throw new Error('empty');
        } catch {
          allReports = getMockReports();
        }
        const nearby = allReports
          .filter((r) => {
            const rLat = r.coordinates?.latitude ?? r.location?.coordinates?.[1];
            const rLng = r.coordinates?.longitude ?? r.location?.coordinates?.[0];
            if (typeof rLat !== 'number' || typeof rLng !== 'number') return false;
            const d = calculateHaversineDistance(lat, lng, rLat, rLng);
            return d <= 250;
          })
          .slice(0, 5);
        if (!cancelled) setNearbyReports(nearby);
      } catch {
        if (!cancelled) setNearbyReports([]);
      } finally {
        if (!cancelled) setLoadingNearby(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, exifResult, deviceLocation, manualCoords]);

  const handleCaptured = useCallback((draft) => {
    if (!draft) return;
    if (draft.imageUri) setImageUri(draft.imageUri);
    if (draft.file) {
      // Normalize to proper FormData part: { uri, name, type } for native, File for web
      // Ensures Unsupported FormDataPart fix per spec
      const f = draft.file;
      if (Platform.OS !== 'web' && f && typeof f === 'object' && f.uri) {
        setPhotoFile({ uri: f.uri, name: f.name || f.fileName || 'barrier.jpg', type: f.type || 'image/jpeg' });
      } else {
        setPhotoFile(f);
      }
    } else if (draft.imageUri && typeof draft.imageUri === 'string' && draft.imageUri.startsWith('blob:')) {
      // No file provided but we have blob url – will fetch as blob on submit (web fallback)
    }
    if (draft.exifResult) {
      let exif = draft.exifResult;
      if (exif.capturedAt && typeof exif.capturedAt === 'string') {
        const d = new Date(exif.capturedAt);
        exif = { ...exif, capturedAt: Number.isNaN(d.getTime()) ? null : d };
      }
      setExifResult(exif);
      // If EXIF already has fallback GPS (from EXIFCaptureScreen), sync manualCoords for map pin
      if (exif.isFallbackGps && typeof exif.latitude === 'number' && typeof exif.longitude === 'number') {
        setManualCoords({ latitude: exif.latitude, longitude: exif.longitude });
      }
    }
    setErrorMsg(null);
  }, []);

  // Auto-fallback: if photo lacks EXIF GPS, silently use device location (soft fallback, never blocks)
  useEffect(() => {
    if (!imageUri || !exifResult) return;
    const needsFallback = !exifResult.hasGps || typeof exifResult.latitude !== 'number' || typeof exifResult.longitude !== 'number';
    if (needsFallback && !manualCoords && !fallbackLoading) {
      let cancelled = false;
      (async () => {
        try {
          const coords = await getCurrentLocation();
          if (!cancelled && coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
            setManualCoords({ latitude: coords.latitude, longitude: coords.longitude });
            setExifResult((prev) => ({
              latitude: coords.latitude,
              longitude: coords.longitude,
              altitude: coords.altitude ?? prev?.altitude ?? null,
              capturedAt: prev?.capturedAt ?? new Date(),
              hasGps: true,
              hasTimestamp: !!(prev?.hasTimestamp || prev?.capturedAt),
              isFallbackGps: true,
            }));
          }
        } catch {}
      })();
      return () => { cancelled = true; };
    }
  }, [imageUri, exifResult, manualCoords, fallbackLoading, getCurrentLocation]);

  const handleSelectCategory = useCallback((val) => {
    setCategory(val);
    setErrorMsg(null);
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    setFallbackLoading(true);
    setErrorMsg(null);
    try {
      const coords = await getCurrentLocation();
      if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
        setExifResult((prev) => ({
          latitude: coords.latitude,
          longitude: coords.longitude,
          altitude: coords.altitude ?? prev?.altitude ?? null,
          capturedAt: prev?.capturedAt ?? new Date(),
          hasGps: true,
          hasTimestamp: !!(prev?.hasTimestamp || prev?.capturedAt),
        }));
        setManualCoords({ latitude: coords.latitude, longitude: coords.longitude });
        try { announce && announce('Current device location applied'); } catch {}
      } else {
        setErrorMsg('Unable to retrieve current location. Please enable GPS.');
      }
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to get current location.');
    } finally {
      setFallbackLoading(false);
    }
  }, [getCurrentLocation, announce]);

  const handleMapPick = useCallback((lat, lng) => {
    setManualCoords({ latitude: lat, longitude: lng });
    setExifResult((prev) => ({
      latitude: lat,
      longitude: lng,
      altitude: prev?.altitude ?? null,
      capturedAt: prev?.capturedAt ?? new Date(),
      hasGps: true,
      hasTimestamp: !!(prev?.hasTimestamp || prev?.capturedAt),
    }));
    setErrorMsg(null);
  }, []);

  const hasGps = !!(exifResult && exifResult.hasGps && typeof exifResult.latitude === 'number' && typeof exifResult.longitude === 'number');
  const hasPhoto = !!imageUri;
  const canGoNextFrom1 = !!category;
  const canGoNextFrom2 = hasPhoto;
  const canSubmit = !!category && hasPhoto && typeof rating === 'number' && rating >= 1 && rating <= 5;

  const handleNext = useCallback(() => {
    setErrorMsg(null);
    if (step === 1 && !canGoNextFrom1) {
      setErrorMsg('Please select a barrier category.');
      return;
    }
    if (step === 2 && !canGoNextFrom2) {
      setErrorMsg('Please capture a photo before continuing.');
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }, [step, canGoNextFrom1, canGoNextFrom2]);

  const handleBack = useCallback(() => {
    setErrorMsg(null);
    setStep((s) => Math.max(1, s - 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!category) {
      setErrorMsg('Category is required. Please select a barrier type in Step 1.');
      setStep(1);
      return;
    }
    if (!imageUri) {
      setErrorMsg('Photo is required. Please capture a geotagged photo in Step 2.');
      setStep(2);
      return;
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      setErrorMsg('Rating is required (1-5). Please select a severity rating in Step 3.');
      setStep(3);
      return;
    }

    // Resolve fallback coordinates — mirrors AdminAddReportModal fallback chain: manual -> exif -> deviceLocation -> fallbackCoordinates -> default
    let fallbackCoordinates = null;
    if (deviceLocation && typeof deviceLocation.latitude === 'number' && typeof deviceLocation.longitude === 'number') {
      fallbackCoordinates = { latitude: deviceLocation.latitude, longitude: deviceLocation.longitude };
    }
    if (manualCoords && typeof manualCoords.latitude === 'number') {
      fallbackCoordinates = { ...manualCoords };
    }
    let latitude = manualCoords?.latitude ?? exifResult?.latitude;
    let longitude = manualCoords?.longitude ?? exifResult?.longitude;
    if ((!hasGps && !manualCoords) && !fallbackCoordinates) {
      try {
        setFallbackLoading(true);
        const coords = await getCurrentLocation();
        if (coords && typeof coords.latitude === 'number') {
          fallbackCoordinates = { latitude: coords.latitude, longitude: coords.longitude };
          if (typeof latitude !== 'number') latitude = coords.latitude;
          if (typeof longitude !== 'number') longitude = coords.longitude;
        }
      } catch {}
      setFallbackLoading(false);
    }
    // Last fallback: default Colombo center if still missing
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      if (fallbackCoordinates) {
        latitude = fallbackCoordinates.latitude;
        longitude = fallbackCoordinates.longitude;
      } else {
        latitude = 6.9271;
        longitude = 79.8612;
        fallbackCoordinates = { latitude, longitude };
      }
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      setErrorMsg('Location is required. Use Current Device Location or pick on map.');
      return;
    }

    // Transform EXIF + form data using helper with fallbackCoordinates — same as admin
    const barrierFields = toBarrierReportFields(
      {
        latitude: exifResult?.latitude ?? latitude,
        longitude: exifResult?.longitude ?? longitude,
        altitude: exifResult?.altitude ?? null,
        capturedAt: exifResult?.capturedAt ?? null,
        hasGps: true,
        hasTimestamp: !!exifResult?.capturedAt,
      },
      fallbackCoordinates
    );

    const finalLat = barrierFields.coordinates.latitude ?? latitude;
    const finalLng = barrierFields.coordinates.longitude ?? longitude;

    // Admin-parity resolution for name, locationName, condition, capturedAt
    const resolvedName = (name && name.trim()) || (category ? `${category} Barrier` : 'Barrier Report');
    const resolvedLocationName = (locationName && locationName.trim()) || `Volunteer Report ${finalLat.toFixed(3)}, ${finalLng.toFixed(3)}`;
    const resolvedCondition = condition || 'bad';
    const resolvedCapturedAt = (() => {
      if (capturedAt) {
        const d = new Date(capturedAt);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
      }
      if (barrierFields.capturedAt instanceof Date) return barrierFields.capturedAt.toISOString();
      if (barrierFields.capturedAt) return String(barrierFields.capturedAt);
      return new Date().toISOString();
    })();

    const currentUser = authService.getCurrentUser();
    // Sanitize reporterId: demo/offline ids (e.g. 'UM-123') are not Mongo ObjectIds —
    // submit anonymously so the save succeeds instead of 500ing on a CastError.
    const rawReporterId = currentUser?._id || currentUser?.id || undefined;
    const reporterId = typeof rawReporterId === 'string' && /^[0-9a-fA-F]{24}$/.test(rawReporterId)
      ? rawReporterId
      : undefined;

    // MongoDB-aligned document — matches BarrierReport schema + reportController.js expectations.
    // Direct persist target: HTTP POST /api/reports (multipart `photo` or JSON `photoUrl`).
    const exifMetadata = {
      latitude: finalLat,
      longitude: finalLng,
      altitude: exifResult?.altitude ?? null,
      timestamp: resolvedCapturedAt,
      capturedAt: resolvedCapturedAt,
    };
    const payload = {
      name: resolvedName,
      locationName: resolvedLocationName,
      category,
      rating,
      condition: resolvedCondition,
      triageStatus: 'pending',
      notes: notes?.trim() || undefined,
      photoUrl: photoFile ? undefined : imageUri,
      coordinates: { latitude: finalLat, longitude: finalLng },
      location: { type: 'Point', coordinates: [finalLng, finalLat] },
      latitude: finalLat,
      longitude: finalLng,
      exifMetadata,
      capturedAt: resolvedCapturedAt,
      timestamp: resolvedCapturedAt,
      reporterId,
    };
    // Spec-formatted image part for multipart body (fixes Unsupported FormDataPart)
    const photoMeta = photoFile
      ? (Platform.OS !== 'web'
          ? { uri: photoFile.uri || photoFile, name: photoFile.name || photoFile.fileName || 'barrier.jpg', type: photoFile.type || 'image/jpeg' }
          : photoFile)
      : null;

    // Auto-upload: File objects can't survive storage reload, but the persisted local
    // URI often still exists on disk — rebuild the multipart payload from it so the
    // user doesn't have to retake. Never JSON-submit a device-local URI (backend 400s
    // those); if the file is positively gone, stop here with a retake prompt.
    let effectivePhotoMeta = photoMeta;
    if (!effectivePhotoMeta && imageUri && typeof imageUri === 'string' && Platform.OS !== 'web' && /^(file|content|ph):\/\//i.test(imageUri)) {
      const rebuilt = { uri: imageUri, name: `photo_${Date.now()}.jpg`, type: 'image/jpeg' };
      let status = 'unknown';
      try {
        const FS = await import('expo-file-system');
        if (FS && typeof FS.getInfoAsync === 'function') {
          const info = await FS.getInfoAsync(imageUri);
          status = info?.exists ? 'exists' : 'missing';
        }
      } catch {}
      if (status === 'exists' || status === 'unknown') {
        effectivePhotoMeta = rebuilt;
      } else {
        const goneMsg = 'The saved photo is no longer available on this device — please capture or pick the photo again.';
        setErrorMsg(goneMsg);
        try { AccessibilityInfo.announceForAccessibility(`Error: ${goneMsg}`); } catch {}
        try { Alert.alert('Photo expired', goneMsg); } catch {}
        return;
      }
    }

    const resetWizard = async () => {
      setCategory(null);
      setImageUri(null);
      setExifResult(null);
      setPhotoFile(null);
      setRating(null);
      setNotes('');
      setName('');
      setNameTouched(false);
      setLocationName('');
      setLocationTouched(false);
      setCondition('bad');
      setCapturedAt(new Date().toISOString());
      setManualCoords(null);
      setShowMapPicker(false);
      setStep(1);
      setErrorMsg(null);
      try { await clearVolunteerDraft(); } catch {}
      try {
        const remaining = await loadPendingReports();
        setPendingCount(remaining.length);
      } catch {}
    };

    const handleSuccess = async (res) => {
      // Success is authoritative: record it first so any late/stale failure from a
      // concurrent path can never overwrite it with a misleading error modal.
      lastSuccessAtRef.current = Date.now();
      setErrorMsg(null);
      await clearVolunteerDraft();
      const successText = 'Report submitted successfully — saved to database';
      setSuccessMsg(successText);
      try { AccessibilityInfo.announceForAccessibility(successText); } catch {}
      try { announce && announce(successText); } catch {}
      try { Alert.alert('Report submitted', 'Your barrier report was saved to the database.'); } catch {}
      await resetWizard();
      const doNavigate = onSuccess || onNavigateToMap || navigation?.navigate;
      if (typeof doNavigate === 'function') {
        try {
          if (onSuccess) onSuccess(res);
          if (onNavigateToMap) setTimeout(() => onNavigateToMap(), 600);
          else if (navigation?.navigate) setTimeout(() => navigation.navigate('osm_canvas'), 600);
        } catch {}
      }
    };

    // Multipart upload wins on the backend — drop any local URI so it can never be stored.
    if (effectivePhotoMeta) payload.photoUrl = undefined;

    const attempt = submitAttemptRef.current + 1;
    submitAttemptRef.current = attempt;
    setSubmitting(true);
    try {
      // Direct MongoDB persist: POST /api/reports (rebuilt local-URI meta included)
      const res = await submitToApi(payload, effectivePhotoMeta);
      const ok = res && (res.success || res.data);
      if (!ok && res && res.success === false) throw new Error(res.message || 'Submission failed');
      await handleSuccess(res);
    } catch (e) {
      // Stale attempt (user already resubmitted) or success already shown for this
      // flow — never let it surface a misleading error modal over the 201 result.
      if (submitAttemptRef.current !== attempt) return;
      if (Date.now() - lastSuccessAtRef.current < 5000) return;
      // Photo shaping failure → actionable message, never queued (would fail every retry)
      if (isFormDataError(e)) {
        const photoMsg = "Couldn't attach the photo — please retake or pick another image, then submit again.";
        setErrorMsg(photoMsg);
        try { AccessibilityInfo.announceForAccessibility(`Error: ${photoMsg}`); } catch {}
        try { Alert.alert('Photo attachment failed', photoMsg); } catch {}
        return;
      }
      // Permanent server-side failures (e.g. Cloudinary not configured, 500) will never
      // succeed on retry — surface immediately instead of queueing offline forever.
      const serverPermanent = /not configured|photo upload service/i.test(
        `${e?.detail || ''} ${e?.backendError || ''} ${e?.message || ''}`
      );
      // Offline → cache full schema payload in storage.js queue, keep draft, sync later
      if (isNetworkError(e) && !serverPermanent) {
        try {
          await queuePendingReport({ payload, photoMeta: effectivePhotoMeta, imageUri, createdAt: new Date().toISOString() });
          const remaining = await loadPendingReports();
          setPendingCount(remaining.length);
        } catch {}
        const queuedMsg = 'No connection — report saved offline and will sync to the database automatically.';
        setSuccessMsg(queuedMsg);
        try { AccessibilityInfo.announceForAccessibility(queuedMsg); } catch {}
        try { announce && announce(queuedMsg); } catch {}
        try { Alert.alert('Saved offline', 'No connection. Your report is cached locally and will sync when you are back online.'); } catch {}
        return;
      }
      const msg = toFriendlyError(e);
      setErrorMsg(msg);
      try { AccessibilityInfo.announceForAccessibility(`Error: ${msg}`); } catch {}
      try { Alert.alert('Submission failed', msg); } catch {}
    } finally {
      setSubmitting(false);
    }
  }, [category, imageUri, photoFile, rating, hasGps, exifResult, deviceLocation, getCurrentLocation, notes, name, locationName, condition, capturedAt, manualCoords, announce, onSuccess, onNavigateToMap, navigation, submitToApi, isNetworkError, isFormDataError, toFriendlyError]);

  const handleReset = useCallback(async () => {
    setCategory(null);
    setImageUri(null);
    setExifResult(null);
    setPhotoFile(null);
    setRating(null);
    setNotes('');
    setName('');
    setNameTouched(false);
    setLocationName('');
    setLocationTouched(false);
    setCondition('bad');
    setCapturedAt(new Date().toISOString());
    setManualCoords(null);
    setShowMapPicker(false);
    setStep(1);
    setErrorMsg(null);
    setSuccessMsg(null);
    setNearbyReports([]);
    setCorroboratedExistingId(null);
    try { await clearVolunteerDraft(); } catch {}
  }, []);

  const formatCoord = (v) => (typeof v === 'number' ? v.toFixed(5) : '—');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Progress Indicator — preserved 3-step */}
      <View
        style={styles.progressWrap}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Step ${step} of ${TOTAL_STEPS}`}
      >
        <Text {...textProps} style={[styles.progressText, getTextStyle('sm', { isHighContrast }), { color: palette.textMuted }]}>
          Step {step} of {TOTAL_STEPS}
        </Text>
        <View style={styles.dotsRow}>
          {[1, 2, 3].map((i) => {
            const active = i === step;
            const done = i < step;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  { borderColor: palette.border, borderWidth: 1 },
                  active && { backgroundColor: palette.primary, borderColor: palette.primary },
                  done && { backgroundColor: isHighContrast ? palette.textPrimary : '#86EFAC', borderColor: isHighContrast ? palette.textPrimary : '#86EFAC' },
                  !active && !done && { backgroundColor: palette.surfaceAlt },
                ]}
                accessible={false}
              />
            );
          })}
        </View>
        <View style={[styles.progressBarTrack, { backgroundColor: palette.border }]}>
          <View style={[styles.progressBarFill, { backgroundColor: palette.primary, width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>
      </View>

      <Card
        style={[
          styles.card,
          { borderColor: palette.cardBorder, borderWidth },
          isHighContrast && { shadowOpacity: 0, elevation: 0 },
        ]}
      >
        <Text {...textProps} style={[styles.title, getTextStyle('lg', { isHighContrast }), { color: palette.textPrimary }]} accessibilityRole="header">
          ⚡ 3-Tap Rapid Reporting
        </Text>
        <Text {...textProps} style={[styles.description, getTextStyle('sm', { isHighContrast }), { color: palette.textMuted }]}>
          Tag accessibility obstacles in 3 taps. Data is saved locally until submitted.
        </Text>

        {/* Step 1: Category — preserved */}
        {step === 1 && (
          <View accessible accessibilityRole="radiogroup" accessibilityLabel="Barrier category selection">
            <Text {...textProps} style={[styles.sectionLabel, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
              1. Select Barrier Category
            </Text>
            <View style={styles.grid}>
              {CATEGORIES.map((cat) => {
                const selected = category === cat.value;
                return (
                  <Card
                    key={cat.value}
                    onPress={() => handleSelectCategory(cat.value)}
                    selected={selected}
                    selectedBorderColor={palette.primary}
                    accessibilityLabel={`${cat.label}${selected ? ', selected' : ''}`}
                    accessibilityHint="Double tap to select this barrier category"
                    accessibilityState={{ selected }}
                    accessibilityRole="radio"
                    style={[
                      styles.gridCard,
                      { borderColor: selected ? palette.primary : palette.cardBorder, borderWidth: selected ? Math.max(2, borderWidth) : borderWidth, minHeight: 72 },
                    ]}
                  >
                    <Text style={[styles.gridIcon, { color: selected ? palette.primary : palette.textMuted }]}>{cat.icon}</Text>
                    <Text {...textProps} style={[styles.gridLabel, getTextStyle('sm', { isHighContrast }), { color: selected ? palette.primary : palette.textPrimary }]}>
                      {cat.label}
                    </Text>
                    <Text {...textProps} style={[styles.gridDesc, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]} numberOfLines={1}>
                      {cat.desc}
                    </Text>
                  </Card>
                );
              })}
            </View>
            {/* SPT-301: Nearby existing barriers — corroborate instead of duplicate — PRESERVED */}
            {step === 1 && loadingNearby && (
              <View style={styles.nearbyLoading} accessible accessibilityLabel="Loading nearby barriers">
                <ActivityIndicator size="small" color={palette.primary} />
                <Text {...textProps} style={[styles.nearbyLoadingText, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
                  Checking nearby barriers…
                </Text>
              </View>
            )}
            {step === 1 && !loadingNearby && nearbyReports.length > 0 && (
              <View
                style={[styles.nearbyCard, { backgroundColor: isHighContrast ? palette.surface : '#FFFBEB', borderColor: isHighContrast ? palette.borderStrong : '#FCD34D', borderWidth }]}
                accessible
                accessibilityRole="alert"
                accessibilityLabel="Nearby existing barriers found"
              >
                <Text {...textProps} style={[styles.nearbyWarningTitle, getTextStyle('sm', { isHighContrast }), { color: isHighContrast ? palette.textPrimary : '#92400E' }]}>
                  ⚠️ Nearby existing barriers found. Confirm an existing one instead of creating a duplicate:
                </Text>
                {nearbyReports.map((report) => {
                  const rLat = report.coordinates?.latitude ?? report.location?.coordinates?.[1];
                  const rLng = report.coordinates?.longitude ?? report.location?.coordinates?.[0];
                  const curLat = manualCoords?.latitude ?? exifResult?.latitude ?? deviceLocation?.latitude;
                  const curLng = manualCoords?.longitude ?? exifResult?.longitude ?? deviceLocation?.longitude;
                  const dist = typeof rLat === 'number' && typeof curLat === 'number' ? Math.round(calculateHaversineDistance(curLat, curLng, rLat, rLng)) : null;
                  const currentUser = authService.getCurrentUser();
                  const userId = currentUser?.id || currentUser?._id || 'mock-user';
                  const isCorroborated = Array.isArray(report.upvotedBy) && report.upvotedBy.includes(userId);
                  return (
                    <View key={report._id} style={[styles.nearbyItem, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                      <View style={styles.nearbyItemInfo}>
                        <Text {...textProps} style={[styles.nearbyItemCategory, getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>
                          {report.category} {dist !== null ? `• ${dist}m away` : ''}
                        </Text>
                        <Text {...textProps} style={[styles.nearbyItemNotes, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]} numberOfLines={2}>
                          {report.notes || 'No description'}
                        </Text>
                      </View>
                      <CorroborateButton
                        reportId={report._id}
                        initialCount={report.corroborationCount || 0}
                        isCorroboratedInitial={isCorroborated}
                        onSuccess={(updated) => {
                          const newCount = updated?.corroborationCount ?? (report.corroborationCount || 0) + 1;
                          setNearbyReports((prev) => prev.map((r) => (r._id === report._id ? { ...r, corroborationCount: newCount, upvotedBy: [...(r.upvotedBy || []), userId] } : r)));
                          setCorroboratedExistingId(report._id);
                          setSuccessMsg(`Confirmed existing barrier ${report._id}. No duplicate needed — audit complete.`);
                          try {
                            AccessibilityInfo.announceForAccessibility('Existing barrier confirmed. No duplicate needed.');
                          } catch {}
                          try {
                            announce && announce('Existing barrier confirmed');
                          } catch {}
                        }}
                      />
                    </View>
                  );
                })}
                {corroboratedExistingId && (
                  <View style={[styles.corroboratedHintBox, { backgroundColor: isHighContrast ? palette.surface : '#ECFDF5', borderColor: isHighContrast ? palette.borderStrong : '#A7F3D0', borderWidth }]}>
                    <Text {...textProps} style={[styles.corroboratedHint, getTextStyle('sm', { isHighContrast }), { color: isHighContrast ? palette.textPrimary : '#065F46' }]}>
                      ✓ You corroborated an existing report. Your audit is complete without creating a duplicate record!
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Step 2: Photo & EXIF + Enhanced Location Selector (Admin parity) */}
        {step === 2 && (
          <View>
            <Text {...textProps} style={[styles.sectionLabel, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
              2. Capture Photo &amp; EXIF
            </Text>
            <View style={styles.exifEmbedWrap}>
              <EXIFCaptureScreen onCaptured={handleCaptured} onBack={handleBack} preserveDraftOnBack initialUri={imageUri} initialExifResult={exifResult} />
            </View>
            {/* Enhanced Location Selector — mirrors AdminAddReportModal Section 5 */}
            <View style={[styles.locationSelectorCard, { backgroundColor: palette.surface, borderColor: palette.cardBorder, borderWidth }]}>
              <Text {...textProps} style={[styles.fieldLabel, getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>
                Location *
              </Text>
              <View style={styles.locationBtnRow}>
                <TouchableOpacity
                  style={[styles.locationBtn, styles.locationBtnPrimary, { borderColor: '#0B3D2E', backgroundColor: '#0B3D2E' }]}
                  onPress={handleUseCurrentLocation}
                  disabled={fallbackLoading || submitting}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Use current GPS location"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {fallbackLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="crosshair" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.locationBtnPrimaryText}>Use Current GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.locationBtn, styles.locationBtnSecondary, { borderColor: palette.textPrimary, backgroundColor: showMapPicker ? palette.textPrimary : palette.surface }, showMapPicker && { backgroundColor: palette.textPrimary }]}
                  onPress={() => setShowMapPicker((v) => !v)}
                  disabled={submitting}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Select location on map"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="map" size={16} color={showMapPicker ? '#FFFFFF' : palette.textPrimary} style={{ marginRight: 6 }} />
                  <Text style={[styles.locationBtnSecondaryText, { color: showMapPicker ? '#FFFFFF' : palette.textPrimary }]}>{showMapPicker ? 'Hide Map' : 'Pick on Map'}</Text>
                </TouchableOpacity>
              </View>

              {showMapPicker && (
                <View style={styles.miniMapContainer}>
                  <MiniMapPicker
                    center={
                      manualCoords ||
                      (hasGps ? { latitude: exifResult.latitude, longitude: exifResult.longitude } : null) ||
                      deviceLocation ||
                      { latitude: 6.9271, longitude: 79.8612 }
                    }
                    selected={manualCoords || (hasGps ? { latitude: exifResult.latitude, longitude: exifResult.longitude } : null)}
                    onPick={handleMapPick}
                  />
                  <Text {...textProps} style={[styles.miniMapHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
                    Tap map to place pin • Nudge to adjust • EXIF GPS extracted automatically
                  </Text>
                </View>
              )}

              {(() => {
                const display = manualCoords || (hasGps ? { latitude: exifResult.latitude, longitude: exifResult.longitude } : deviceLocation) || null;
                if (!display || typeof display.latitude !== 'number') return null;
                return (
                  <View style={[styles.coordBadge, { backgroundColor: isHighContrast ? palette.surface : '#ECFDF5', borderColor: isHighContrast ? palette.borderStrong : '#A7F3D0', borderWidth: 1 }]}>
                    <Feather name="navigation" size={12} color="#059669" style={{ marginRight: 6 }} />
                    <Text {...textProps} style={[styles.coordBadgeText, getTextStyle('xs', { isHighContrast }), { color: isHighContrast ? palette.textPrimary : '#065F46' }]}>
                      Selected: {formatCoord(display.latitude)}, {formatCoord(display.longitude)}
                    </Text>
                    {manualCoords && <View style={styles.coordBadgeDot} />}
                  </View>
                );
              })()}
              {!hasGps && !manualCoords && !deviceLocation && (
                <Text {...textProps} style={[styles.locationFallbackHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
                  No GPS yet — will auto-fallback to device location
                </Text>
              )}
            </View>

            {/* Consolidated location status — single neutral line (child EXIF badges removed;
                extraction runs silently). Never blocks: auto-fallback attaches device location. */}
            {hasPhoto && (hasGps || manualCoords) && (
              <View style={[styles.badge, { backgroundColor: palette.surfaceAlt, borderColor: palette.cardBorder, borderWidth }]}>
                <Text {...textProps} style={[styles.badgeTitle, getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>
                  Location attached
                </Text>
                <Text {...textProps} style={[styles.badgeDetail, getTextStyle('sm', { isHighContrast }), { color: palette.textMuted }]}>
                  {formatCoord((manualCoords || exifResult).latitude)}, {formatCoord((manualCoords || exifResult).longitude)}
                </Text>
              </View>
            )}
            {hasPhoto && !hasGps && !manualCoords && (
              <Text {...textProps} style={[styles.locationFallbackHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted, marginTop: 8 }]}>
                Locating… device location will be attached automatically — you can continue.
              </Text>
            )}
          </View>
        )}

        {/* Step 3: Audit & Submit — now includes Admin-parity fields: Name, Condition, Rating, Notes */}
        {step === 3 && (
          <View>
            <Text {...textProps} style={[styles.sectionLabel, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
              3. Audit &amp; Submit
            </Text>

            {/* 3a. Barrier / Place Name — Admin Section 1 */}
            <Text {...textProps} style={[styles.fieldLabel, getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>
              Barrier / Place Name
            </Text>
            <View style={[styles.sleekInputCard, { backgroundColor: palette.surface, borderColor: palette.cardBorder, borderWidth }]}>
              <View style={[styles.inputWrapper, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
                <Feather name="tag" size={16} color={palette.textPrimary} style={{ marginRight: 8 }} />
                <TextInput
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setNameTouched(true);
                  }}
                  placeholder={category ? `${category} Barrier` : 'e.g. Main Entrance Ramp'}
                  placeholderTextColor={palette.textMuted}
                  style={[styles.inputField, { color: palette.textPrimary }]}
                  accessibilityLabel="Barrier name"
                  accessibilityHint="Enter place or barrier name, auto-fills from category"
                  maxLength={100}
                  returnKeyType="next"
                />
                {name.length > 0 && (
                  <TouchableOpacity onPress={() => { setName(''); setNameTouched(true); }} style={styles.inputClear} accessibilityLabel="Clear barrier name">
                    <Feather name="x-circle" size={16} color={palette.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <Text {...textProps} style={[styles.inputHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>{name.length}/100 • Auto: "{category ? `${category} Barrier` : 'Barrier Report'}"</Text>
            </View>

            {/* 3b. Condition Toggle — Admin Section 3 */}
            <Text {...textProps} style={[styles.fieldLabel, getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary, marginTop: 14 }]}>
              Condition *
            </Text>
            <View style={styles.conditionRow}>
              {[
                { val: 'bad', label: 'Bad / Issue', icon: 'alert-triangle', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
                { val: 'good', label: 'Good / Functional', icon: 'check-circle', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
              ].map((opt) => {
                const selected = condition === opt.val;
                return (
                  <TouchableOpacity
                    key={opt.val}
                    style={[
                      styles.conditionChip,
                      { backgroundColor: selected ? opt.bg : palette.surface, borderColor: selected ? opt.color : palette.border },
                      selected && { borderWidth: 2 },
                    ]}
                    onPress={() => setCondition(opt.val)}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Feather name={opt.icon} size={16} color={selected ? opt.color : palette.textMuted} />
                    <Text style={[styles.conditionText, { color: selected ? opt.color : palette.textMuted, fontWeight: selected ? '800' : '600' }]}>{opt.label}</Text>
                    {selected && <View style={[styles.conditionDot, { backgroundColor: opt.color }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3c. Severity Rating — preserved + admin parity (Section 6) */}
            <View accessible accessibilityRole="radiogroup" accessibilityLabel="Severity rating 1 to 5" style={{ marginTop: 14 }}>
              <Text {...textProps} style={[styles.fieldLabel, getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>
                Severity Rating *
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = typeof rating === 'number' && n <= rating;
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setRating(n)}
                      activeOpacity={0.7}
                      accessible
                      accessibilityRole="radio"
                      accessibilityLabel={`Rate ${n} of 5${active ? ', selected' : ''}`}
                      accessibilityHint="Sets severity rating; 5 is most severe"
                      accessibilityState={{ selected: rating === n }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={[
                        styles.starBtn,
                        {
                          borderColor: active ? palette.primary : palette.border,
                          backgroundColor: active ? (isHighContrast ? palette.textPrimary : '#FEF3C7') : palette.surfaceAlt,
                          borderWidth: isHighContrast ? 2 : 1,
                          minHeight: 48,
                          minWidth: 48,
                        },
                      ]}
                    >
                      <Text style={[styles.starText, { color: active ? (isHighContrast ? '#FFFFFF' : '#92400E') : palette.textMuted }]}>{active ? '★' : '☆'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {typeof rating === 'number' && (
                <Text {...textProps} style={[styles.ratingHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
                  Selected: {rating} / 5
                </Text>
              )}
            </View>

            {/* 3d. Notes — preserved (Admin Section 7) */}
            <View style={styles.notesWrap}>
              <Input
                label="Notes (optional)"
                value={notes}
                onChangeText={(t) => setNotes(t.slice(0, 1000))}
                placeholder="Describe the barrier, impact, or context…"
                multiline
                numberOfLines={4}
                maxLength={1000}
                textAlignVertical="top"
                inputStyle={{ minHeight: 96 }}
                accessibilityLabel="Barrier notes"
                showClear={false}
              />
              <Text {...textProps} style={[styles.charCount, getTextStyle('xs', { isHighContrast }), { color: notes.length > 900 ? palette.error : palette.textMuted }]}>
                {notes.length}/1000
              </Text>
            </View>

            {/* Location preview — enhanced with admin-parity details */}
            <View style={[styles.previewBadge, { backgroundColor: palette.surfaceAlt, borderColor: palette.cardBorder, borderWidth }]}>
              <Text {...textProps} style={[styles.previewLabel, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
                SUBMISSION PREVIEW
              </Text>
              <Text {...textProps} style={[styles.previewValue, getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>
                {hasGps || manualCoords ? `${formatCoord((manualCoords || exifResult).latitude)}, ${formatCoord((manualCoords || exifResult).longitude)}` : deviceLocation ? `${formatCoord(deviceLocation.latitude)}, ${formatCoord(deviceLocation.longitude)} (device)` : 'No location yet – complete step 2'}
              </Text>
              <Text {...textProps} style={[styles.previewMeta, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
                Name: {name || (category ? `${category} Barrier` : '—')} • Category: {category || '—'} • Condition: {condition} • Photo: {hasPhoto ? '✓' : '—'} • Rating: {rating ?? '—'}
              </Text>
              {capturedAt && (
                <Text {...textProps} style={[styles.previewMeta, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
                  Captured: {new Date(capturedAt).toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Messages */}
        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: palette.errorBg, borderColor: palette.error, borderWidth }]} accessible accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Text {...textProps} style={[styles.errorText, getTextStyle('sm', { isHighContrast }), { color: palette.error }]}>
              {errorMsg}
            </Text>
          </View>
        )}
        {successMsg && (
          <View style={[styles.successBox, { backgroundColor: isHighContrast ? palette.surface : '#ECFDF5', borderColor: isHighContrast ? palette.borderStrong : '#A7F3D0', borderWidth }]} accessible accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Text {...textProps} style={[styles.successText, getTextStyle('sm', { isHighContrast }), { color: isHighContrast ? palette.textPrimary : '#065F46' }]}>
              ✓ {successMsg}
            </Text>
          </View>
        )}
        {submitting && (
          <View style={styles.loadingRow} accessible accessibilityLabel="Submitting report loading">
            <ActivityIndicator color={palette.primary} accessibilityLabel="Loading" />
            <Text {...textProps} style={[styles.loadingText, getTextStyle('sm', { isHighContrast }), { color: palette.textSecondary }]}>
              Submitting report to database…
            </Text>
          </View>
        )}
        {(pendingCount > 0 || syncingPending) && (
          <View style={[styles.pendingBox, { backgroundColor: isHighContrast ? palette.surface : '#FFFBEB', borderColor: isHighContrast ? palette.borderStrong : '#FCD34D', borderWidth }]} accessible accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Text {...textProps} style={[styles.pendingText, getTextStyle('sm', { isHighContrast }), { color: isHighContrast ? palette.textPrimary : '#92400E' }]}>
              {syncingPending ? 'Syncing offline reports to database…' : `${pendingCount} offline report${pendingCount > 1 ? 's' : ''} cached — will sync to MongoDB when online.`}
            </Text>
            {!syncingPending && pendingCount > 0 && (
              <TouchableOpacity onPress={syncOfflineQueue} disabled={submitting || syncingPending} accessibilityRole="button" accessibilityLabel="Sync offline reports now" style={styles.pendingSyncBtn}>
                <Text style={styles.pendingSyncText}>Sync now</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Navigation — preserved */}
        <View style={styles.navRow}>
          {step > 1 ? (
            <Button title="Back" onPress={handleBack} variant="secondary" disabled={submitting} accessibilityLabel="Go back" accessibilityHint="Returns to previous step" style={styles.navBtn} />
          ) : (
            <Button title="Clear" onPress={handleReset} variant="secondary" disabled={submitting} accessibilityLabel="Clear draft" accessibilityHint="Clears all form fields and local draft" style={styles.navBtn} />
          )}
          {step < TOTAL_STEPS ? (
            <Button
              title="Next"
              onPress={handleNext}
              disabled={submitting || (step === 1 && !canGoNextFrom1) || (step === 2 && !canGoNextFrom2)}
              accessibilityLabel={step === 1 ? 'Next to photo step' : 'Next to audit step'}
              accessibilityHint={step === 1 ? 'Requires a category selection' : 'Requires a captured photo'}
              style={styles.navBtnPrimary}
            />
          ) : (
            <View style={[styles.submitBtnWrap, { flex: 1 }]}>
              <Button
                title={submitting ? 'Submitting…' : 'Submit Report'}
                onPress={handleSubmit}
                disabled={submitting || !canSubmit || fallbackLoading}
                accessibilityLabel="Submit barrier report"
                accessibilityHint="Submits barrier report; requires category, photo, and rating"
                style={styles.navBtnPrimary}
              />
              {submitting && (
                <View style={styles.submitSpinner} pointerEvents="none">
                  <ActivityIndicator color="#FFFFFF" size="small" />
                </View>
              )}
            </View>
          )}
        </View>

        {step === 3 && !hasGps && !manualCoords && !hasPhoto && (
          <Text {...textProps} style={[styles.hintText, getTextStyle('xs', { isHighContrast }), { color: palette.error }]}>
            Complete step 2 photo first.
          </Text>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 32 },
  progressWrap: { marginBottom: 12, alignItems: 'center' },
  progressText: { fontWeight: '700', marginBottom: 8 },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  progressBarTrack: { height: 6, borderRadius: 999, width: '100%', overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 999 },
  card: { borderColor: '#BBF7D0', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 16 },
  sectionLabel: { fontWeight: '700', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCard: { width: '48%', minHeight: 72, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  gridIcon: { fontSize: 22, marginBottom: 4 },
  gridLabel: { fontWeight: '700', textAlign: 'center' },
  gridDesc: { textAlign: 'center', marginTop: 2 },
  exifEmbedWrap: { marginHorizontal: -4 },
  fallbackBox: { borderRadius: 10, padding: 12, marginTop: 8 },
  fallbackText: { fontWeight: '600', marginBottom: 8 },
  fallbackBtn: { marginTop: 4 },
  fallbackHint: { marginTop: 6, fontStyle: 'italic' },
  badge: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginTop: 8 },
  badgeTitle: { fontWeight: '700', marginBottom: 2 },
  badgeDetail: { lineHeight: 18 },
  fieldLabel: { fontWeight: '600', marginBottom: 8 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  starBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 48,
    minWidth: 48,
  },
  starText: { fontSize: 24, fontWeight: '700' },
  ratingHint: { marginTop: 4, fontStyle: 'italic' },
  notesWrap: { marginTop: 14 },
  charCount: { textAlign: 'right', marginTop: 4 },
  previewBadge: { borderRadius: 10, padding: 12, marginTop: 12 },
  previewLabel: { fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  previewValue: { fontWeight: '600' },
  previewMeta: { marginTop: 6 },
  errorBox: { borderRadius: 10, padding: 10, marginTop: 12 },
  errorText: { fontWeight: '600' },
  successBox: { borderRadius: 10, padding: 10, marginTop: 12 },
  successText: { fontWeight: '700' },
  pendingBox: { borderRadius: 10, padding: 10, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pendingText: { fontWeight: '700', flex: 1 },
  pendingSyncBtn: { backgroundColor: '#0B3D2E', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  pendingSyncText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  loadingText: { marginLeft: 8 },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 16, alignItems: 'center' },
  navBtn: { flex: 1 },
  navBtnPrimary: { flex: 1 },
  submitBtnWrap: { position: 'relative', justifyContent: 'center' },
  submitSpinner: { position: 'absolute', right: 16, top: '50%', marginTop: -10 },
  hintText: { textAlign: 'center', marginTop: 8 },
  nearbyLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 8 },
  nearbyLoadingText: { marginLeft: 8, fontStyle: 'italic' },
  nearbyCard: { borderRadius: 12, padding: 12, marginTop: 16, gap: 10 },
  nearbyWarningTitle: { fontWeight: '800', lineHeight: 18, marginBottom: 4 },
  nearbyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderRadius: 10, padding: 10, borderWidth: 1, marginTop: 6 },
  nearbyItemInfo: { flex: 1, gap: 2 },
  nearbyItemCategory: { fontWeight: '700' },
  nearbyItemNotes: { lineHeight: 16 },
  corroboratedHintBox: { borderRadius: 10, padding: 10, marginTop: 8 },
  corroboratedHint: { fontWeight: '700', textAlign: 'center', lineHeight: 18 },
  // Admin-parity additions
  sleekInputCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputField: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 10,
  },
  inputClear: {
    padding: 4,
    marginLeft: 8,
  },
  inputHint: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  conditionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
    minHeight: 48,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  conditionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 2,
  },
  locationSelectorCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  locationBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  locationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    minHeight: 48,
    gap: 6,
  },
  locationBtnPrimary: {
    backgroundColor: '#0B3D2E',
    borderColor: '#0B3D2E',
  },
  locationBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  locationBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0F172A',
  },
  locationBtnSecondaryText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  miniMapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    gap: 6,
  },
  miniMapHint: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
  coordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  coordBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  coordBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginLeft: 6,
  },
  locationFallbackHint: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default ThreeTapReportScreen;
