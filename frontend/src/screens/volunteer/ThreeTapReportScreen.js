import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, AccessibilityInfo } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import EXIFCaptureScreen from './EXIFCaptureScreen';
import { useTheme } from '../../theme/ThemeContext';
import { getTextStyle, textProps } from '../../theme/typography';
import { loadVolunteerDraft, saveVolunteerDraft, clearVolunteerDraft } from '../../theme/storage';
import { createBarrierReport, createReport } from '../../services/api';
import { useLocation } from '../../hooks/useLocation';
import { toBarrierReportFields } from '../../utils/exifHelper';

const CATEGORIES = [
  { value: 'Ramp', label: 'Ramp', icon: '♿', desc: 'Ramp / slope / curb' },
  { value: 'Lift', label: 'Lift', icon: '🛗', desc: 'Elevator / lift failure' },
  { value: 'Tactile Paving', label: 'Tactile Paving', icon: '⠿', desc: 'Tactile ground surface' },
  { value: 'Restroom', label: 'Restroom', icon: '🚻', desc: 'Accessible restroom' },
  { value: 'Other', label: 'Other', icon: '⚠', desc: 'Other barrier' },
];

const TOTAL_STEPS = 3;

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

  // Load draft on mount
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
          // Normalize exifResult: restore Date if string
          let exif = draft.exifResult;
          if (exif.capturedAt && typeof exif.capturedAt === 'string') {
            const d = new Date(exif.capturedAt);
            exif = { ...exif, capturedAt: Number.isNaN(d.getTime()) ? null : d, hasTimestamp: !!d && !Number.isNaN(d.getTime()) };
          }
          // Ensure hasGps consistent
          const hasGps = typeof exif.latitude === 'number' && typeof exif.longitude === 'number';
          setExifResult({ ...exif, hasGps });
        }
        if (draft.file) setPhotoFile(draft.file);
        if (typeof draft.rating === 'number' && draft.rating >= 1 && draft.rating <= 5) setRating(draft.rating);
        if (typeof draft.notes === 'string') setNotes(draft.notes);
      } catch {}
      if (mounted) {
        setDraftLoaded(true);
        // delay hydration flag to avoid immediate save loop
        setTimeout(() => { hasHydratedRef.current = true; }, 300);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Save draft on every change after hydration
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
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [imageUri, exifResult, category, rating, notes, draftLoaded]);

  const handleCaptured = useCallback((draft) => {
    if (!draft) return;
    if (draft.imageUri) setImageUri(draft.imageUri);
    if (draft.file) setPhotoFile(draft.file);
    else if (draft.imageUri && typeof draft.imageUri === 'string' && draft.imageUri.startsWith('blob:')) {
      // No file provided but we have blob url – will fetch as blob on submit
    }
    if (draft.exifResult) {
      let exif = draft.exifResult;
      if (exif.capturedAt && typeof exif.capturedAt === 'string') {
        const d = new Date(exif.capturedAt);
        exif = { ...exif, capturedAt: Number.isNaN(d.getTime()) ? null : d };
      }
      setExifResult(exif);
    }
    setErrorMsg(null);
  }, []);

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
    // Validate required fields with palette.errorBg container
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

    // Resolve fallback coordinates for EXIF transform
    let fallbackCoordinates = null;
    if (deviceLocation && typeof deviceLocation.latitude === 'number' && typeof deviceLocation.longitude === 'number') {
      fallbackCoordinates = { latitude: deviceLocation.latitude, longitude: deviceLocation.longitude };
    }

    // If no EXIF GPS, try to acquire live location for fallback
    let latitude = exifResult?.latitude;
    let longitude = exifResult?.longitude;
    if (!hasGps && !fallbackCoordinates) {
      try {
        setFallbackLoading(true);
        const coords = await getCurrentLocation();
        if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
          fallbackCoordinates = { latitude: coords.latitude, longitude: coords.longitude };
          latitude = coords.latitude;
          longitude = coords.longitude;
        }
      } catch {}
      setFallbackLoading(false);
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      if (fallbackCoordinates) {
        latitude = fallbackCoordinates.latitude;
        longitude = fallbackCoordinates.longitude;
      } else {
        setErrorMsg('Location is required. Capture GPS photo or tap Use Current Device Location.');
        return;
      }
    }

    // Transform EXIF + form data using helper with fallbackCoordinates (Prompt 4)
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

    const payload = {
      coordinates: { latitude: finalLat, longitude: finalLng },
      latitude: finalLat,
      longitude: finalLng,
      photoUrl: photoFile ? undefined : imageUri,
      category,
      rating,
      notes: notes?.trim() || undefined,
      exifMetadata,
      capturedAt: barrierFields.capturedAt instanceof Date ? barrierFields.capturedAt.toISOString() : barrierFields.capturedAt ?? undefined,
    };

    setSubmitting(true);
    try {
      let res;
      // Prefer multipart file upload when we have a File (fixes blob: local URL issue)
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

      await clearVolunteerDraft();
      const successText = 'Report submitted successfully';
      setSuccessMsg(successText);
      // Accessibility announce
      try {
        AccessibilityInfo.announceForAccessibility(successText);
      } catch {}
      try { announce && announce(successText); } catch {}

      // Reset wizard state
      setCategory(null);
      setImageUri(null);
      setExifResult(null);
      setPhotoFile(null);
      setRating(null);
      setNotes('');
      setStep(1);
      setErrorMsg(null);

      // Navigate back to main map / history tab without losing outer navigation state
      const doNavigate = onSuccess || onNavigateToMap || navigation?.navigate;
      if (typeof doNavigate === 'function') {
        // Support both callback and navigation prop
        try {
          if (onSuccess) onSuccess(res);
          if (onNavigateToMap) setTimeout(() => onNavigateToMap(), 600);
          else if (navigation?.navigate) setTimeout(() => navigation.navigate('osm_canvas'), 600);
        } catch {}
      }
    } catch (e) {
      const msg = e?.message || 'Failed to submit report. Please try again.';
      setErrorMsg(msg);
      try { AccessibilityInfo.announceForAccessibility(`Error: ${msg}`); } catch {}
    } finally {
      setSubmitting(false);
    }
  }, [category, imageUri, photoFile, rating, hasGps, exifResult, deviceLocation, getCurrentLocation, notes, announce, onSuccess, onNavigateToMap, navigation]);

  const handleReset = useCallback(async () => {
    setCategory(null);
    setImageUri(null);
    setExifResult(null);
    setPhotoFile(null);
    setRating(null);
    setNotes('');
    setStep(1);
    setErrorMsg(null);
    setSuccessMsg(null);
    try { await clearVolunteerDraft(); } catch {}
  }, []);

  const formatCoord = (v) => (typeof v === 'number' ? v.toFixed(5) : '—');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Progress Indicator */}
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

        {/* Step 1: Category */}
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
          </View>
        )}

        {/* Step 2: Photo & EXIF */}
        {step === 2 && (
          <View>
            <Text {...textProps} style={[styles.sectionLabel, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
              2. Capture Photo &amp; EXIF
            </Text>
            <View style={styles.exifEmbedWrap}>
              <EXIFCaptureScreen onCaptured={handleCaptured} onBack={handleBack} preserveDraftOnBack />
            </View>
            {/* GPS fallback */}
            {hasPhoto && !hasGps && (
              <View style={[styles.fallbackBox, { backgroundColor: palette.errorBg, borderColor: palette.error, borderWidth }]}>
                <Text {...textProps} style={[styles.fallbackText, getTextStyle('sm', { isHighContrast }), { color: palette.error }]}>
                  No GPS in photo. Use device location as fallback.
                </Text>
                <Button
                  title={fallbackLoading ? 'Fetching location…' : 'Use Current Device Location'}
                  onPress={handleUseCurrentLocation}
                  disabled={fallbackLoading}
                  accessibilityLabel="Use current device location"
                  accessibilityHint="Fetches GPS from device when photo has no EXIF location"
                  style={styles.fallbackBtn}
                />
                {deviceLocation && (
                  <Text {...textProps} style={[styles.fallbackHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
                    Device: {formatCoord(deviceLocation.latitude)}, {formatCoord(deviceLocation.longitude)}
                  </Text>
                )}
              </View>
            )}
            {hasPhoto && hasGps && (
              <View style={[styles.badge, { backgroundColor: isHighContrast ? palette.surface : '#ECFDF5', borderColor: isHighContrast ? palette.borderStrong : '#A7F3D0', borderWidth }]}>
                <Text {...textProps} style={[styles.badgeTitle, getTextStyle('sm', { isHighContrast }), { color: isHighContrast ? palette.textPrimary : '#065F46' }]}>
                  ✓ Location ready
                </Text>
                <Text {...textProps} style={[styles.badgeDetail, getTextStyle('sm', { isHighContrast }), { color: isHighContrast ? palette.textPrimary : '#047857' }]}>
                  {formatCoord(exifResult.latitude)}, {formatCoord(exifResult.longitude)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 3: Audit & Submit */}
        {step === 3 && (
          <View>
            <Text {...textProps} style={[styles.sectionLabel, getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
              3. Audit &amp; Submit
            </Text>

            {/* Star Rating */}
            <View accessible accessibilityRole="radiogroup" accessibilityLabel="Severity rating 1 to 5">
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

            {/* Notes */}
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

            {/* Location preview */}
            <View style={[styles.previewBadge, { backgroundColor: palette.surfaceAlt, borderColor: palette.cardBorder, borderWidth }]}>
              <Text {...textProps} style={[styles.previewLabel, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
                LOCATION PREVIEW
              </Text>
              <Text {...textProps} style={[styles.previewValue, getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>
                {hasGps ? `${formatCoord(exifResult.latitude)}, ${formatCoord(exifResult.longitude)}` : deviceLocation ? `${formatCoord(deviceLocation.latitude)}, ${formatCoord(deviceLocation.longitude)} (device)` : 'No location yet – complete step 2'}
              </Text>
              {category && (
                <Text {...textProps} style={[styles.previewMeta, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
                  Category: {category} • Photo: {hasPhoto ? '✓' : '—'} • Rating: {rating ?? '—'}
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
              Submitting report…
            </Text>
          </View>
        )}

        {/* Navigation */}
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

        {/* Global fallback hint on step 3 if no GPS */}
        {step === 3 && !hasGps && !hasPhoto && (
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
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  loadingText: { marginLeft: 8 },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 16, alignItems: 'center' },
  navBtn: { flex: 1 },
  navBtnPrimary: { flex: 1 },
  submitBtnWrap: { position: 'relative', justifyContent: 'center' },
  submitSpinner: { position: 'absolute', right: 16, top: '50%', marginTop: -10 },
  hintText: { textAlign: 'center', marginTop: 8 },
});

export default ThreeTapReportScreen;
