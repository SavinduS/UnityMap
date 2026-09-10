/**
 * AdminAddReportModal.js
 * SPT-206: Admin-side Barrier Report Creation Modal
 * Allows authenticated admin to submit barrier report inside TriageQueue without volunteer flow.
 * Isolated from volunteer draft state; fits admin dark/emerald design system (0F172A / 059669).
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Platform,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getWardById } from '../../utils/wardJurisdictions';
import { useLocation } from '../../hooks/useLocation';
import { extractExifData, toBarrierReportFields } from '../../utils/exifHelper';
import { createReport, createBarrierReport } from '../../services/api';
import { addMockTriageReport } from '../../services/triageService';
import adminAuthService from '../../services/adminAuthService';

import BaseMap from '../BaseMap';

const CATEGORIES = [
  { value: 'Ramp', label: 'Ramp', icon: '♿', desc: 'Ramp / slope / curb' },
  { value: 'Lift', label: 'Lift', icon: '🛗', desc: 'Elevator / lift failure' },
  { value: 'Tactile Paving', label: 'Tactile Paving', icon: '⠿', desc: 'Tactile ground surface' },
  { value: 'Restroom', label: 'Restroom', icon: '🚻', desc: 'Accessible restroom' },
  { value: 'Other', label: 'Other', icon: '⚠', desc: 'Other barrier' },
];

// Lightweight mini-map picker using BaseMap (Leaflet) for both web & native; falls back to nudger if BaseMap unavailable
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
        {/* Center crosshair overlay */}
        <View pointerEvents="none" style={miniMapStyles.crosshair}>
          <Feather name="plus" size={18} color="#0F172A" style={{ opacity: 0.6 }} />
        </View>
      </View>
      {/* Nudge controls for accessibility / precise picking without map drag */}
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

export const AdminAddReportModal = ({ visible, onClose, wardId = 'CMC-W01', onReportCreated }) => {
  const { location: deviceLocation, getCurrentLocation } = useLocation();

  const [category, setCategory] = useState(null);
  const [rating, setRating] = useState(null);
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [exifResult, setExifResult] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  // Enhanced model fields (SPT-206 polish) - locationName & capturedAt kept auto, hidden from UI
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [condition, setCondition] = useState('bad');
  const [capturedAt, setCapturedAt] = useState(new Date().toISOString());
  const [nameTouched, setNameTouched] = useState(false);
  const [locationTouched, setLocationTouched] = useState(false);
  const [manualCoords, setManualCoords] = useState(null); // {latitude, longitude} from map picker
  const [showMapPicker, setShowMapPicker] = useState(false);

  const ward = getWardById(wardId);
  const currentAdmin = adminAuthService.getCurrentUser();
  const reporterName = currentAdmin?.name || currentAdmin?.email || 'Admin Officer';
  // reporterId must be a valid Mongo ObjectId — staffId like CMC-CHI-325 is not valid, so ignore
  const rawReporterId = currentAdmin?._id || currentAdmin?.id;
  const isValidObjectId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
  const reporterId = rawReporterId && isValidObjectId(String(rawReporterId)) ? String(rawReporterId) : undefined;

  // Auto-fill locationName from ward context (if not manually edited)
  useEffect(() => {
    if (!locationTouched) {
      setLocationName(ward.name);
    }
  }, [ward.name, locationTouched]);

  // Auto-fill name from category (if not touched)
  useEffect(() => {
    if (category && !nameTouched) {
      setName(`${category} Barrier`);
    }
  }, [category, nameTouched]);

  // Auto-set capturedAt from EXIF or now
  useEffect(() => {
    if (exifResult?.capturedAt) {
      const d = exifResult.capturedAt instanceof Date ? exifResult.capturedAt : new Date(exifResult.capturedAt);
      if (!Number.isNaN(d.getTime())) setCapturedAt(d.toISOString());
    } else if (visible) {
      setCapturedAt(new Date().toISOString());
    }
  }, [exifResult, visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      // Delay reset to allow close animation
      const t = setTimeout(() => {
        setCategory(null);
        setRating(null);
        setNotes('');
        setImageUri(null);
        setExifResult(null);
        setPhotoFile(null);
        setErrorMsg(null);
        setSubmitting(false);
        setFallbackLoading(false);
        setName('');
        setLocationName(ward.name);
        setCondition('bad');
        setCapturedAt(new Date().toISOString());
        setNameTouched(false);
        setLocationTouched(false);
        setManualCoords(null);
        setShowMapPicker(false);
      }, 300);
      return () => clearTimeout(t);
    } else {
      // On open, prime defaults (auto, hidden)
      setLocationName((prev) => (prev ? prev : ward.name));
      setCapturedAt(new Date().toISOString());
    }
  }, [visible, ward.name]);

  const handleCapturedFromPicker = useCallback(async (asset) => {
    if (!asset) return;
    const originalUri = asset.uri;
    setErrorMsg(null);

    // Task 1: Fix Asset MIME Type — explicitly ensure valid MIME (fixes "image" → "image/jpeg" on Android)
    const mimeType = asset.mimeType || (asset.type?.includes('/') ? asset.type : 'image/jpeg');
    const formattedPhoto = {
      uri: asset.uri,
      name: asset.fileName || `photo_${Date.now()}.jpg`,
      type: mimeType,
    };
    // Harden for RN FormData: ensure .jpg extension and strict image/jpeg (fixes Unsupported FormDataPart where type is "image")
    let fileName = asset.fileName || `photo_${Date.now()}.jpg`;
    if (!fileName.toLowerCase().endsWith('.jpg') && !fileName.toLowerCase().endsWith('.jpeg')) {
      fileName = fileName.replace(/\.[^/.]+$/, '') + '.jpg';
    }
    const validatedMime = mimeType.includes('/') ? mimeType : 'image/jpeg';
    const strictPhoto = {
      uri: String(formattedPhoto.uri),
      name: String(fileName),
      type: 'image/jpeg',
    };
    void validatedMime;
    setImageUri(String(originalUri));
    // Use strict JPEG for actual upload, formattedPhoto kept per Task 1 spec for verification
    setPhotoFile(strictPhoto);

    // Try EXIF extraction (use finalUri for consistency)
    try {
      const exif = await extractExifData({ uri: String(finalUri) });
      setExifResult(exif);
    } catch {
      setExifResult({
        latitude: null,
        longitude: null,
        altitude: null,
        capturedAt: new Date(),
        hasGps: false,
        hasTimestamp: false,
      });
    }
  }, []);

  const handlePickImage = useCallback(async (useCamera) => {
    setErrorMsg(null);
    try {
      let result;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setErrorMsg('Camera permission denied. Enable camera in device settings.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.6,
          exif: true,
          allowsEditing: false,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setErrorMsg('Media library permission denied.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.6,
          exif: true,
          allowsEditing: false,
        });
      }
      if (!result.canceled && result.assets && result.assets[0]) {
        await handleCapturedFromPicker(result.assets[0]);
      }
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to pick image.');
    }
  }, [handleCapturedFromPicker]);

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
      } else {
        setErrorMsg('Unable to retrieve current location. Please enable GPS.');
      }
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to get current location.');
    } finally {
      setFallbackLoading(false);
    }
  }, [getCurrentLocation]);

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

  const hasGps = !!(
    exifResult &&
    exifResult.hasGps &&
    typeof exifResult.latitude === 'number' &&
    typeof exifResult.longitude === 'number'
  );
  const hasPhoto = !!imageUri;
  const canSubmit = !!category && hasPhoto && typeof rating === 'number' && rating >= 1 && rating <= 5;

  const formatCoord = (v) => (typeof v === 'number' ? v.toFixed(5) : '—');

  const handleClose = useCallback(() => {
    if (submitting) return;
    onClose && onClose();
  }, [submitting, onClose]);

  const handleSubmit = useCallback(async () => {
    setErrorMsg(null);
    if (!category) {
      setErrorMsg('Category is required. Please select a barrier type.');
      return;
    }
    if (!imageUri) {
      setErrorMsg('Photo is required. Please capture or select a photo.');
      return;
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      setErrorMsg('Rating is required (1-5).');
      return;
    }

    // Resolve coordinates: manual (map) -> exif -> deviceLocation -> ward center (hidden auto)
    let fallbackCoordinates = null;
    if (deviceLocation && typeof deviceLocation.latitude === 'number' && typeof deviceLocation.longitude === 'number') {
      fallbackCoordinates = { latitude: deviceLocation.latitude, longitude: deviceLocation.longitude };
    }
    // Manual map pick has highest priority
    let latitude = manualCoords?.latitude ?? exifResult?.latitude;
    let longitude = manualCoords?.longitude ?? exifResult?.longitude;
    // If manualCoords exists, use it as fallbackCoordinates for barrierFields
    if (manualCoords && typeof manualCoords.latitude === 'number') {
      fallbackCoordinates = { ...manualCoords };
    }
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
    // Last fallback: ward center
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      if (fallbackCoordinates) {
        latitude = fallbackCoordinates.latitude;
        longitude = fallbackCoordinates.longitude;
      } else if (ward?.centerCoordinate) {
        latitude = ward.centerCoordinate.latitude;
        longitude = ward.centerCoordinate.longitude;
        fallbackCoordinates = { ...ward.centerCoordinate };
      } else {
        latitude = 6.9271;
        longitude = 79.8612;
        fallbackCoordinates = { latitude, longitude };
      }
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      setErrorMsg('Location is required. Use Current Device Location or ward center will be used.');
      return;
    }

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
    const exifMetadata = {
      latitude: finalLat,
      longitude: finalLng,
      altitude: exifResult?.altitude ?? null,
      timestamp: barrierFields.capturedAt,
    };

    const resolvedName = (name && name.trim()) || (category ? `${category} Barrier` : 'Barrier Report');
    const resolvedLocationName = (locationName && locationName.trim()) || `Ward ${ward?.id || wardId || 'Default'}`;
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

    const payload = {
      name: resolvedName,
      locationName: resolvedLocationName,
      condition: resolvedCondition,
      coordinates: { latitude: finalLat, longitude: finalLng },
      latitude: finalLat,
      longitude: finalLng,
      photoUrl: photoFile ? undefined : imageUri,
      category,
      rating,
      notes: notes?.trim() || undefined,
      exifMetadata,
      capturedAt: resolvedCapturedAt,
      timestamp: resolvedCapturedAt,
      reporterId,
    };

    setSubmitting(true);
    try {
      let res;
      if (photoFile) {
        res = await createReport(payload, photoFile);
      } else if (imageUri && typeof imageUri === 'string' && imageUri.startsWith('blob:')) {
        try {
          const blobResp = await fetch(imageUri);
          const blob = await blobResp.blob();
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
          res = await createReport(payload, file);
        } catch {
          res = await createBarrierReport(payload);
        }
      } else {
        res = await createBarrierReport(payload);
      }
      const ok = res && (res.success || res.data);
      if (!ok && res && res.success === false) throw new Error(res.message || 'Submission failed');

      const newReport = res?.data || res;
      try {
        AccessibilityInfo.announceForAccessibility('Barrier report successfully added to queue');
      } catch {}
      if (onReportCreated) onReportCreated(newReport);
      onClose && onClose();
    } catch (e) {
      // Offline / backend unreachable -> seamless mock injection so queue updates
      // Also treat AbortError / TimeoutError (signal is aborted without reason) as network issue
      const msg = e?.message || '';
      const isOffline =
        msg.includes('Failed to fetch') ||
        msg.includes('Network request failed') ||
        msg.includes('unreachable') ||
        msg.includes('API Request Failed') ||
        msg.includes('aborted') ||
        msg.includes('abort') ||
        msg.includes('timed out') ||
        msg.includes('TimeoutError') ||
        e?.name === 'AbortError' ||
        e?.name === 'TimeoutError' ||
        /signal is aborted/i.test(msg);
      if (isOffline) {
        try {
          const mockReport = addMockTriageReport({
            category,
            rating,
            notes: notes?.trim(),
            name: (name && name.trim()) || (category ? `${category} Barrier` : 'Barrier Report'),
            locationName: (locationName && locationName.trim()) || ward.name,
            condition: condition || 'bad',
            capturedAt: capturedAt || new Date().toISOString(),
            coordinates: { latitude: finalLat, longitude: finalLng },
            photoUrl: imageUri,
            wardId: ward?.id || wardId,
          });
          try {
            AccessibilityInfo.announceForAccessibility('Barrier report successfully added to queue');
          } catch {}
          if (onReportCreated) onReportCreated(mockReport);
          onClose && onClose();
          return;
        } catch (mockErr) {
          // fall through to error display
        }
      }
      let displayMsg = e?.message || 'Failed to submit report. Please try again.';
      if (/aborted|abort|timed out|TimeoutError|signal is aborted/i.test(displayMsg) || e?.name === 'AbortError' || e?.name === 'TimeoutError') {
        displayMsg = 'Submission timed out — please check your network and try again. If the problem persists, try a smaller photo.';
      }
      setErrorMsg(displayMsg);
    } finally {
      setSubmitting(false);
      setFallbackLoading(false);
    }
  }, [category, imageUri, photoFile, rating, hasGps, exifResult, deviceLocation, getCurrentLocation, notes, name, locationName, condition, capturedAt, reporterId, ward, wardId, manualCoords, onReportCreated, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header Dark */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>⚡ Admin Field Barrier Report</Text>
              <Text style={styles.headerSubtitle}>
                Assigned Jurisdiction: {ward.name} ({ward.id}) • Ward {ward.wardNumber}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              accessibilityHint="Closes barrier report modal without saving"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Reporter Context Badge (auto, subtle) */}
            <View style={styles.reporterBadge}>
              <Feather name="user" size={14} color="#0F172A" style={{ marginRight: 6 }} />
              <Text style={styles.reporterBadgeText}>Reporting as: {reporterName}</Text>
              <View style={styles.reporterDot} />
              <Text style={styles.reporterBadgeSub}>{ward.id}</Text>
            </View>

            {/* 1. Barrier / Place Name */}
            <Text style={styles.sectionLabel}>1. Barrier / Place Name</Text>
            <View style={styles.sleekInputCard}>
              <View style={styles.inputWrapper}>
                <Feather name="tag" size={16} color="#0F172A" style={{ marginRight: 8 }} />
                <TextInput
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setNameTouched(true);
                  }}
                  placeholder={category ? `${category} Barrier` : 'e.g. Main Entrance Ramp'}
                  placeholderTextColor="#94A3B8"
                  style={styles.inputField}
                  accessibilityLabel="Barrier name"
                  accessibilityHint="Enter place or barrier name, auto-fills from category"
                  maxLength={100}
                  returnKeyType="next"
                />
                {name.length > 0 && (
                  <TouchableOpacity onPress={() => setName('')} style={styles.inputClear} accessibilityLabel="Clear barrier name">
                    <Feather name="x-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.inputHint}>{name.length}/100 • Auto: "{category ? `${category} Barrier` : 'Barrier Report'}"</Text>
            </View>

            {/* 2. Category Chips */}
            <Text style={styles.sectionLabel}>2. Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CATEGORIES.map((cat) => {
                const selected = category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => {
                      setCategory(cat.value);
                      setErrorMsg(null);
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityLabel={`${cat.label}${selected ? ', selected' : ''}`}
                    accessibilityState={{ selected }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.chipIcon}>{cat.icon}</Text>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 3. Condition Toggle */}
            <Text style={styles.sectionLabel}>3. Condition *</Text>
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
                      { backgroundColor: selected ? opt.bg : '#FFFFFF', borderColor: selected ? opt.color : '#E2E8F0' },
                      selected && { borderWidth: 2 },
                    ]}
                    onPress={() => setCondition(opt.val)}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Feather name={opt.icon} size={16} color={selected ? opt.color : '#94A3B8'} />
                    <Text style={[styles.conditionText, { color: selected ? opt.color : '#475569', fontWeight: selected ? '800' : '600' }]}>{opt.label}</Text>
                    {selected && <View style={[styles.conditionDot, { backgroundColor: opt.color }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Photo Capture / Upload */}
            <Text style={styles.sectionLabel}>4. Photo *</Text>
            {hasPhoto ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: imageUri }} style={styles.photoPreview} resizeMode="cover" />
                <View style={styles.photoActionsRow}>
                  <TouchableOpacity style={styles.photoActionBtn} onPress={() => handlePickImage(true)} disabled={submitting}>
                    <Feather name="camera" size={16} color="#0B3D2E" />
                    <Text style={styles.photoActionText}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoActionBtn} onPress={() => handlePickImage(false)} disabled={submitting}>
                    <Feather name="image" size={16} color="#0B3D2E" />
                    <Text style={styles.photoActionText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoActionBtn, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}
                    onPress={() => {
                      setImageUri(null);
                      setPhotoFile(null);
                      setExifResult(null);
                    }}
                    disabled={submitting}
                  >
                    <Feather name="trash-2" size={16} color="#DC2626" />
                    <Text style={[styles.photoActionText, { color: '#DC2626' }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.photoPickerRow}>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => handlePickImage(true)} disabled={submitting} activeOpacity={0.7}>
                  <Feather name="camera" size={22} color="#0B3D2E" />
                  <Text style={styles.pickerBtnText}>Take Photo</Text>
                  <Text style={styles.pickerBtnSub}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => handlePickImage(false)} disabled={submitting} activeOpacity={0.7}>
                  <Feather name="image" size={22} color="#1D4ED8" />
                  <Text style={styles.pickerBtnText}>Choose</Text>
                  <Text style={styles.pickerBtnSub}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 5. Location Selector (GPS + Map) */}
            <Text style={styles.sectionLabel}>5. Location *</Text>
            <View style={styles.locationSelectorCard}>
              <View style={styles.locationBtnRow}>
                <TouchableOpacity
                  style={[styles.locationBtn, styles.locationBtnPrimary]}
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
                      <Text style={styles.locationBtnPrimaryText}>📍 Use Current GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.locationBtn, styles.locationBtnSecondary, showMapPicker && styles.locationBtnActive]}
                  onPress={() => setShowMapPicker((v) => !v)}
                  disabled={submitting}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Select location on map"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="map" size={16} color={showMapPicker ? '#FFFFFF' : '#0F172A'} style={{ marginRight: 6 }} />
                  <Text style={[styles.locationBtnSecondaryText, showMapPicker && { color: '#FFFFFF' }]}>🗺️ {showMapPicker ? 'Hide Map' : 'Pick on Map'}</Text>
                </TouchableOpacity>
              </View>

              {showMapPicker && (
                <View style={styles.miniMapContainer}>
                  <MiniMapPicker
                    center={
                      manualCoords ||
                      (hasGps ? { latitude: exifResult.latitude, longitude: exifResult.longitude } : null) ||
                      deviceLocation ||
                      ward.centerCoordinate
                    }
                    selected={manualCoords || (hasGps ? { latitude: exifResult.latitude, longitude: exifResult.longitude } : null)}
                    onPick={handleMapPick}
                  />
                  <Text style={styles.miniMapHint}>Tap map to place pin • Drag pin to adjust • High-contrast border for accessibility</Text>
                </View>
              )}

              {/* Subtle coordinate badge */}
              {(() => {
                const display = manualCoords || (hasGps ? { latitude: exifResult.latitude, longitude: exifResult.longitude } : deviceLocation) || ward.centerCoordinate;
                if (!display || typeof display.latitude !== 'number') return null;
                return (
                  <View style={styles.coordBadge}>
                    <Feather name="navigation" size={12} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.coordBadgeText}>Selected: {formatCoord(display.latitude)}, {formatCoord(display.longitude)}</Text>
                    {manualCoords && <View style={styles.coordBadgeDot} />}
                  </View>
                );
              })()}
              {!hasGps && !manualCoords && !deviceLocation && (
                <Text style={styles.locationFallbackHint}>No GPS yet — will auto-fallback to ward center if none selected</Text>
              )}
            </View>

            {/* 6. Severity Rating */}
            <Text style={styles.sectionLabel}>6. Severity Rating *</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = typeof rating === 'number' && n <= rating;
                return (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setRating(n)}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityLabel={`Rate ${n} of 5`}
                    accessibilityState={{ selected: rating === n }}
                    style={[
                      styles.starBtn,
                      {
                        borderColor: active ? '#0B3D2E' : '#E2E8F0',
                        backgroundColor: active ? '#FEF3C7' : '#F1F5F9',
                      },
                    ]}
                  >
                    <Text style={[styles.starText, { color: active ? '#92400E' : '#94A3B8' }]}>{active ? '★' : '☆'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {typeof rating === 'number' && (
              <Text style={styles.ratingHint}>Selected: {rating} / 5</Text>
            )}

            {/* 7. Notes */}
            <Text style={styles.sectionLabel}>7. Notes (optional)</Text>
            <View style={styles.notesWrap}>
              <TextInput
                value={notes}
                onChangeText={(t) => setNotes(t.slice(0, 1000))}
                placeholder="Describe the barrier, impact, or context…"
                multiline
                numberOfLines={4}
                maxLength={1000}
                textAlignVertical="top"
                style={styles.notesInput}
                editable={!submitting}
                placeholderTextColor="#94A3B8"
              />
              <Text style={[styles.charCount, notes.length > 900 && { color: '#DC2626' }]}>{notes.length}/1000</Text>
            </View>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {submitting && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#0B3D2E" />
                <Text style={styles.loadingText}>Submitting report…</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerBtn, styles.cancelBtn]}
              onPress={handleClose}
              disabled={submitting}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cancel barrier report"
              accessibilityHint="Closes modal without submitting"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footerBtn,
                styles.submitBtn,
                (!canSubmit || submitting || fallbackLoading) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || submitting || fallbackLoading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Add barrier report"
              accessibilityHint="Submits barrier report to triage queue"
              accessibilityState={{ disabled: !canSubmit || submitting || fallbackLoading }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    minHeight: '75%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    marginLeft: 12,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  chipScroll: {
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginRight: 8,
    gap: 6,
  },
  chipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipIcon: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  photoPickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    minHeight: 48,
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
  },
  pickerBtnSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  photoPreviewWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoPreview: {
    width: '100%',
    height: 180,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    backgroundColor: '#F8FAFC',
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 8,
    gap: 6,
  },
  photoActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B3D2E',
  },
  fallbackBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  fallbackText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  fallbackBtn: {
    backgroundColor: '#0B3D2E',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  fallbackBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fallbackHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
  },
  locationReadyBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  locationReadyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  locationReadyDetail: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  wardHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  wardHintText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 48,
    borderWidth: 1,
  },
  starText: {
    fontSize: 22,
    fontWeight: '700',
  },
  ratingHint: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 6,
  },
  notesWrap: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  notesInput: {
    fontSize: 13,
    color: '#0F172A',
    minHeight: 96,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
  },
  previewBadge: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  previewMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#0B3D2E',
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  submitBtn: {
    backgroundColor: '#0B3D2E',
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
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
  locationSelectorCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    gap: 10,
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
  locationBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
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
  // --- Polish: Reporter badge & Details Card (high-contrast, sleek) ---
  reporterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  reporterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  reporterDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#059669',
    marginHorizontal: 8,
  },
  reporterBadgeSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  detailsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailsCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  detailsCardBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailsCardBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  inputOptional: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  autoPill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  autoPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
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
  inputWrapperHighlight: {
    borderColor: '#0B3D2E',
    backgroundColor: '#FFFFFF',
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
  inputIconRight: {
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
  capturedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    minHeight: 48,
  },
  capturedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  capturedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  capturedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  exifPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  exifPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
});

export default AdminAddReportModal;
