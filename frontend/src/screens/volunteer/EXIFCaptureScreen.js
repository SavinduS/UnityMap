import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useTheme } from '../../theme/ThemeContext';
import { getTextStyle, textProps } from '../../theme/typography';
import { extractExifData } from '../../utils/exifHelper';
import { saveVolunteerDraft, clearVolunteerDraft } from '../../theme/storage';

async function compressWebImageIfNeeded(file) {
  if (Platform.OS !== 'web' || !(file instanceof File) || file.size < 1024 * 1024) return file;
  try {
    if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined' && typeof Image === 'undefined') return file;
    // Use canvas to resize to max 1024 width
    const bitmap = await createImageBitmap(file).catch(async () => {
      // Fallback via Image element
      const url = URL.createObjectURL(file);
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      URL.revokeObjectURL(url);
      return img;
    });
    const maxWidth = 1024;
    const scale = Math.min(1, maxWidth / bitmap.width);
    if (scale >= 1) return file;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    if (bitmap.close) try { bitmap.close(); } catch {}
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.6));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/**
 * EXIF Capture & Geotagging Screen — SPT-108 minimal web-standard solution
 * - Custom viewfinder UI (reuses Card/Button, ThemeContext, tokens)
 * - Hidden <input type="file" accept="image/*" capture="environment"> triggered by prominent Button
 * - File directly passed to SPT-008 extractExifData(file) — no expo-image-picker
 * - Preview via URL.createObjectURL with revoke on replace/unmount
 * - Handles cancel, missing/invalid GPS/timestamp, unsupported image, camera unavailable
 */
export const EXIFCaptureScreen = ({ onBack, onCaptured, preserveDraftOnBack = false }) => {
  const { palette, borderWidth, isHighContrast } = useTheme();
  const [imageUri, setImageUri] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [exifLoading, setExifLoading] = useState(false);
  const [exifResult, setExifResult] = useState(null);
  const isMountedRef = useRef(true);
  const previewUrlRef = useRef(null);
  const cancelFallbackRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear fallback timeout on unmount to avoid state updates after unmount
      if (cancelFallbackRef.current) {
        clearTimeout(cancelFallbackRef.current);
        cancelFallbackRef.current = null;
      }
      // Clean up object URL when leaving screen/component
      if (previewUrlRef.current) {
        try {
          URL.revokeObjectURL(previewUrlRef.current);
        } catch {}
        previewUrlRef.current = null;
      }
    };
  }, []);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      try {
        URL.revokeObjectURL(previewUrlRef.current);
      } catch {}
      previewUrlRef.current = null;
    }
  }, []);

  const persistDraft = useCallback(async (uri, exif, file) => {
    try {
      const draft = {
        imageUri: uri,
        exifResult: exif
          ? {
              latitude: exif.latitude,
              longitude: exif.longitude,
              altitude: exif.altitude,
              hasGps: exif.hasGps,
              hasTimestamp: exif.hasTimestamp,
              capturedAt: exif.capturedAt ? exif.capturedAt.toISOString() : null,
            }
          : null,
        updatedAt: new Date().toISOString(),
      };
      await saveVolunteerDraft(draft);
      if (typeof onCaptured === 'function') {
        // Include original file for upstream upload (SPT-109 triage integration)
        onCaptured({ ...draft, file: file || null, exifRaw: exif || null });
      }
    } catch {}
  }, [onCaptured]);

  const processFile = useCallback(async (file) => {
    if (!file) {
      // User cancellation / no file selected — graceful no-op
      if (isMountedRef.current) setIsLoading(false);
      return;
    }

    // Validate image type
    if (!file.type || !file.type.startsWith('image/')) {
      if (isMountedRef.current) {
        setErrorMsg('Unsupported image format. Please select a valid image file (JPEG, PNG, HEIC).');
        setIsLoading(false);
      }
      return;
    }

    // Validate file size / non-empty
    if (file.size === 0) {
      if (isMountedRef.current) {
        setErrorMsg('Invalid image file is empty. Please try another photo.');
        setIsLoading(false);
      }
      return;
    }

    // Revoke previous preview before creating new one
    revokePreview();
    let previewUrl;
    try {
      previewUrl = URL.createObjectURL(file);
    } catch (e) {
      if (isMountedRef.current) {
        setErrorMsg('Failed to create image preview. Please try again.');
        setIsLoading(false);
      }
      return;
    }

    if (!isMountedRef.current) {
      try { URL.revokeObjectURL(previewUrl); } catch {}
      return;
    }

    previewUrlRef.current = previewUrl;
    setImageUri(previewUrl);
    setErrorMsg(null);
    setExifLoading(true);

    // Compress large web images (>1MB) to ~1024px / 0.6 quality to avoid upload timeouts
    let uploadFile = file;
    try {
      const compressed = await compressWebImageIfNeeded(file);
      if (compressed && compressed.size < file.size) uploadFile = compressed;
    } catch {}

    try {
      // SPT-008: pass File directly — supports File/Blob/ArrayBuffer
      const exif = await extractExifData(file);
      if (!isMountedRef.current) return;
      // Validate GPS/timestamp are already normalized to null if invalid by helper
      setExifResult(exif);
      await persistDraft(previewUrl, exif, uploadFile);
    } catch (exifErr) {
      if (!isMountedRef.current) return;
      // Unsupported/invalid image fallback — do not claim GPS/timestamp
      const fallback = {
        latitude: null,
        longitude: null,
        capturedAt: null,
        altitude: null,
        hasGps: false,
        hasTimestamp: false,
      };
      setExifResult(fallback);
      await persistDraft(previewUrl, fallback, uploadFile);
      // If exif error was due to corrupt image, surface generic message only if no preview
      if (!exifErr || /unsupported|invalid|exif/i.test(exifErr.message || '')) {
        // Keep preview but ensure badges show missing data — no additional error needed
      }
    } finally {
      if (isMountedRef.current) {
        setExifLoading(false);
        setIsLoading(false);
      }
    }
  }, [persistDraft, revokePreview]);

  const handleCapture = useCallback(async () => {
    setErrorMsg(null);
    setIsLoading(true);

    // Native path: use expo-image-picker (supports Android/iOS via Expo Go)
    if (Platform.OS !== 'web') {
      try {
        let ImagePicker;
        try {
          ImagePicker = await import('expo-image-picker');
        } catch (impErr) {
          if (isMountedRef.current) {
            setErrorMsg('Camera module unavailable. Please install expo-image-picker or use web browser.');
            setIsLoading(false);
          }
          return;
        }
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') {
          if (isMountedRef.current) {
            setErrorMsg('Camera permission denied. Please allow camera access in device settings and try again.');
            setIsLoading(false);
          }
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.6,
          exif: true,
        });
        if (!isMountedRef.current) return;
        if (result.canceled) {
          setIsLoading(false);
          return;
        }
        let asset = result.assets && result.assets[0];
        if (!asset || !asset.uri) {
          setErrorMsg('Failed to capture image. Please try again.');
          setIsLoading(false);
          return;
        }
        // Try to compress/resize to ~1024px width and 0.6 quality to keep upload <1MB and avoid timeout.
        // Uses expo-image-manipulator if available; otherwise falls back to original asset.
        try {
          const Manipulator = await import('expo-image-manipulator').catch(() => null);
          const manipulator = Manipulator?.default || Manipulator;
          if (manipulator?.manipulateAsync) {
            try {
              const manipulated = await manipulator.manipulateAsync(
                asset.uri,
                [{ resize: { width: 1024 } }],
                { compress: 0.6, format: manipulator.SaveFormat?.JPEG || 'jpeg' }
              );
              if (manipulated?.uri) {
                asset = { ...asset, uri: manipulated.uri };
              }
            } catch (manipErr) {
              console.warn('[EXIFCapture] ImageManipulator compress failed, using original:', manipErr?.message);
            }
          }
        } catch {}
        // Show preview directly from file uri (no createObjectURL)
        revokePreview();
        if (!isMountedRef.current) return;
        previewUrlRef.current = null;
        setImageUri(asset.uri);
        setErrorMsg(null);
        setExifLoading(true);
        try {
          // exifHelper supports { uri } via fetch → ArrayBuffer
          const exif = await extractExifData({ uri: asset.uri });
          if (!isMountedRef.current) return;
          setExifResult(exif);
          // Convert camera photo format to JPEG with explicit MIME guard (fix Unsupported FormDataPart where mimeType is "image")
          // normalize extension + force image/jpeg + ImagePicker quality 0.6 + manipulator resize avoids large uploads / timeouts
          let finalUri = asset.uri;
          let finalName = asset.fileName || `photo_${Date.now()}.jpg`;
          if (!finalName.toLowerCase().endsWith('.jpg') && !finalName.toLowerCase().endsWith('.jpeg')) {
            finalName = finalName.replace(/\.[^/.]+$/, '') + '.jpg';
          }
          const assetFile = { uri: String(finalUri), name: String(finalName), type: 'image/jpeg' };
          await persistDraft(String(finalUri), exif, assetFile);
        } catch (exifErr) {
          if (!isMountedRef.current) return;
          const fallback = {
            latitude: null,
            longitude: null,
            capturedAt: null,
            altitude: null,
            hasGps: false,
            hasTimestamp: false,
          };
          setExifResult(fallback);
          let finalUriFb = asset.uri;
          let finalNameFb = asset.fileName || `photo_${Date.now()}.jpg`;
          if (!finalNameFb.toLowerCase().endsWith('.jpg') && !finalNameFb.toLowerCase().endsWith('.jpeg')) {
            finalNameFb = finalNameFb.replace(/\.[^/.]+$/, '') + '.jpg';
          }
          const assetFileFallback = { uri: String(finalUriFb), name: String(finalNameFb), type: 'image/jpeg' };
          await persistDraft(String(finalUriFb), fallback, assetFileFallback);
        } finally {
          if (isMountedRef.current) {
            setExifLoading(false);
            setIsLoading(false);
          }
        }
        return;
      } catch (e) {
        const raw = e?.message || '';
        if (isMountedRef.current) {
          if (/not available|no camera|unavailable|not supported/i.test(raw)) {
            setErrorMsg('Camera is unavailable on this device. Please try on a device with a camera or allow camera access.');
          } else {
            setErrorMsg('Failed to open camera. Please try again or check permissions.');
          }
          setIsLoading(false);
        }
        return;
      }
    }

    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      setErrorMsg('Camera is unavailable on this device. Please try on a device with a camera or use a browser that supports file capture.');
      setIsLoading(false);
      return;
    }

    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      // capture="environment" hints mobile browsers to open camera directly, falls back to file picker if unavailable
      input.setAttribute('capture', 'environment');
      input.style.display = 'none';

      input.onchange = async (e) => {
        if (cancelFallbackRef.current) {
          clearTimeout(cancelFallbackRef.current);
          cancelFallbackRef.current = null;
        }
        const file = e.target.files && e.target.files[0];
        if (!file) {
          // User cancelled picker — handle gracefully
          if (isMountedRef.current) setIsLoading(false);
          if (input.parentNode) input.parentNode.removeChild(input);
          return;
        }
        if (input.parentNode) input.parentNode.removeChild(input);
        await processFile(file);
      };

      input.oncancel = () => {
        if (cancelFallbackRef.current) {
          clearTimeout(cancelFallbackRef.current);
          cancelFallbackRef.current = null;
        }
        // Modern browsers fire cancel on dialog close without selection
        if (isMountedRef.current) setIsLoading(false);
        if (input.parentNode) input.parentNode.removeChild(input);
      };

      // Fallback: if onchange/oncancel not fired within timeout, handle cancellation
      // Some browsers don't fire cancel event — use ref to avoid stale isLoading closure
      if (cancelFallbackRef.current) {
        clearTimeout(cancelFallbackRef.current);
      }
      cancelFallbackRef.current = setTimeout(() => {
        cancelFallbackRef.current = null;
        if (!isMountedRef.current) return;
        if (input.parentNode) input.parentNode.removeChild(input);
        // processFile clears isLoading on success; if still pending, unlock UI
        setIsLoading(false);
      }, 30000);

      document.body.appendChild(input);
      input.click();
    } catch (e) {
      const raw = e?.message || '';
      if (/not available|no camera|unavailable|not supported/i.test(raw)) {
        setErrorMsg('Camera is unavailable on this device. Please try on a device with a camera or allow browser camera access.');
      } else {
        setErrorMsg('Failed to open camera. Please try again or check browser permissions.');
      }
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [processFile]);

  const handleRetake = useCallback(() => {
    setExifResult(null);
    setErrorMsg(null);
    // Revoke previous preview before new capture
    // Do not revoke here yet — processFile will revoke, but ensure stale badge cleared
    handleCapture();
  }, [handleCapture]);

  const handleCancel = useCallback(async () => {
    revokePreview();
    setImageUri(null);
    setExifResult(null);
    setErrorMsg(null);
    setIsLoading(false);
    setExifLoading(false);
    if (!preserveDraftOnBack) {
      try {
        await clearVolunteerDraft();
      } catch {}
    }
    if (typeof onBack === 'function') {
      onBack();
    }
  }, [onBack, revokePreview, preserveDraftOnBack]);

  const hasImage = !!imageUri;

  // Derived validation — never claim GPS/timestamp when missing/invalid
  const hasGps = !!(exifResult && exifResult.hasGps && typeof exifResult.latitude === 'number' && typeof exifResult.longitude === 'number');
  const hasTimestamp = !!(exifResult && exifResult.hasTimestamp && exifResult.capturedAt instanceof Date && !Number.isNaN(exifResult.capturedAt.getTime()));
  const timestampIsFuture = hasTimestamp && exifResult.capturedAt > new Date();
  const timestampIsValid = hasTimestamp && !timestampIsFuture;

  const formatCoord = (v) => (typeof v === 'number' ? v.toFixed(5) : '—');
  const formatTimestamp = (d) => {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
    try {
      return d.toLocaleString();
    } catch {
      return d.toISOString();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Card
        style={[
          styles.card,
          { borderColor: palette.cardBorder, borderWidth },
          isHighContrast && { shadowOpacity: 0, elevation: 0 },
        ]}
      >
        <View style={styles.headerRow}>
          <Text
            {...textProps}
            style={[styles.title, getTextStyle('lg', { isHighContrast }), { color: palette.textPrimary }]}
            accessibilityRole="header"
          >
            EXIF Metadata Capture
          </Text>
          {/* Safe cancel/go back — always 48dp, accessible */}
          <TouchableOpacity
            onPress={handleCancel}
            disabled={isLoading || exifLoading}
            activeOpacity={0.7}
            accessible
            accessibilityRole="button"
            accessibilityLabel={hasImage ? 'Cancel and go back' : 'Go back to reporting'}
            accessibilityHint="Clears captured photo and returns to previous screen"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.cancelBtn,
              {
                borderColor: palette.secondaryBorder,
                borderWidth,
                backgroundColor: palette.secondaryBg,
                opacity: isLoading || exifLoading ? 0.5 : 1,
                minHeight: 48,
                minWidth: 48,
              },
            ]}
          >
            <Text {...textProps} style={[styles.cancelText, getTextStyle('sm', { isHighContrast }), { color: palette.secondaryText }]}>
              {hasImage ? 'Cancel' : 'Back'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text
          {...textProps}
          style={[styles.description, getTextStyle('sm', { isHighContrast }), { color: palette.textMuted }]}
        >
          Extracts embedded GPS coordinates, camera orientation, and timestamp from photo EXIF metadata for verification.
        </Text>

        {/* Custom viewfinder — camera-oriented frame with corner brackets (not raw input) */}
        {hasImage ? (
          <View
            style={[
              styles.previewWrapper,
              { borderColor: palette.cardBorder, borderWidth, backgroundColor: palette.surfaceAlt },
            ]}
            accessible
            accessibilityLabel="Captured barrier photo preview with viewfinder overlay"
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              resizeMode="cover"
              accessible
              accessibilityLabel="Captured image"
            />
            {/* Viewfinder overlay — does not block image, purely visual/assistive */}
            <View pointerEvents="none" style={styles.viewfinderOverlay} accessible={false}>
              <View style={[styles.corner, styles.cornerTL, { borderColor: palette.focusRing, borderWidth: isHighContrast ? 3 : 2 }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: palette.focusRing, borderWidth: isHighContrast ? 3 : 2 }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: palette.focusRing, borderWidth: isHighContrast ? 3 : 2 }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: palette.focusRing, borderWidth: isHighContrast ? 3 : 2 }]} />
              <View style={[styles.crosshairH, { backgroundColor: palette.focusRing, opacity: isHighContrast ? 1 : 0.9 }]} />
              <View style={[styles.crosshairV, { backgroundColor: palette.focusRing, opacity: isHighContrast ? 1 : 0.9 }]} />
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.placeholder,
              { borderColor: palette.border, borderWidth: isHighContrast ? borderWidth : 1, backgroundColor: palette.surfaceAlt },
              !isHighContrast && { borderStyle: 'dashed' },
            ]}
            accessible
            accessibilityLabel="Custom camera viewfinder — no image captured yet"
          >
            {/* Viewfinder frame even when empty — guides user where photo will appear */}
            <View style={[styles.viewfinderFrame, { borderColor: palette.borderStrong, borderWidth: isHighContrast ? 2 : 1 }]}>
              <View style={[styles.corner, styles.cornerTL, { borderColor: palette.focusRing, borderWidth: isHighContrast ? 3 : 2 }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: palette.focusRing, borderWidth: isHighContrast ? 3 : 2 }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: palette.focusRing, borderWidth: isHighContrast ? 3 : 2 }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: palette.focusRing, borderWidth: isHighContrast ? 3 : 2 }]} />
              <View style={[styles.crosshairH, { backgroundColor: palette.focusRing, opacity: isHighContrast ? 1 : 0.35 }]} />
              <View style={[styles.crosshairV, { backgroundColor: palette.focusRing, opacity: isHighContrast ? 1 : 0.35 }]} />
            </View>
            <Text {...textProps} style={[styles.placeholderText, getTextStyle('sm', { isHighContrast }), { color: palette.textMuted }]}>
              No photo captured yet. Tap Capture to open the camera.
            </Text>
            <Text {...textProps} style={[styles.viewfinderHint, getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>
              Center barrier within viewfinder for best EXIF GPS capture
            </Text>
          </View>
        )}

        {/* EXIF loading */}
        {exifLoading && hasImage && (
          <View style={styles.loadingRow} accessible accessibilityLabel="Extracting EXIF metadata">
            <ActivityIndicator color={palette.primary} />
            <Text {...textProps} style={[styles.loadingText, getTextStyle('sm', { isHighContrast }), { color: palette.textSecondary }]}>
              Extracting GPS & timestamp...
            </Text>
          </View>
        )}

        {/* GPS Badge — auto-filled from EXIF */}
        {hasImage && !exifLoading && exifResult && (
          <View
            style={[
              styles.badge,
              hasGps
                ? { backgroundColor: isHighContrast ? palette.surface : '#ECFDF5', borderColor: isHighContrast ? palette.borderStrong : '#A7F3D0', borderWidth }
                : { backgroundColor: palette.errorBg, borderColor: palette.error, borderWidth },
            ]}
            accessible
            accessibilityLabel={hasGps ? `GPS detected ${formatCoord(exifResult.latitude)}, ${formatCoord(exifResult.longitude)}` : 'GPS unavailable'}
            accessibilityRole="text"
          >
            <Text
              {...textProps}
              style={[
                styles.badgeTitle,
                getTextStyle('sm', { isHighContrast }),
                { color: hasGps ? (isHighContrast ? palette.textPrimary : '#065F46') : palette.error },
              ]}
            >
              {hasGps ? '✓ GPS detected' : '⚠ GPS unavailable'}
            </Text>
            <Text
              {...textProps}
              style={[
                styles.badgeDetail,
                getTextStyle('sm', { isHighContrast }),
                { color: hasGps ? (isHighContrast ? palette.textPrimary : '#047857') : palette.error },
              ]}
            >
              {hasGps
                ? `${formatCoord(exifResult.latitude)}, ${formatCoord(exifResult.longitude)}${typeof exifResult.altitude === 'number' ? ` • Alt ${Math.round(exifResult.altitude)}m` : ''}`
                : 'Photo has no location data — enable Location for Camera and retake.'}
            </Text>
          </View>
        )}

        {/* Timestamp validator */}
        {hasImage && !exifLoading && exifResult && (
          <View
            style={[
              styles.badge,
              hasTimestamp && timestampIsValid
                ? { backgroundColor: isHighContrast ? palette.surface : '#ECFDF5', borderColor: isHighContrast ? palette.borderStrong : '#A7F3D0', borderWidth }
                : hasTimestamp && timestampIsFuture
                ? { backgroundColor: palette.errorBg, borderColor: palette.error, borderWidth }
                : { backgroundColor: palette.errorBg, borderColor: palette.error, borderWidth },
            ]}
            accessible
            accessibilityLabel={
              hasTimestamp && timestampIsValid
                ? `Timestamp valid ${formatTimestamp(exifResult.capturedAt)}`
                : hasTimestamp && timestampIsFuture
                ? 'Timestamp invalid future date'
                : 'Timestamp unavailable'
            }
            accessibilityRole="text"
          >
            <Text
              {...textProps}
              style={[
                styles.badgeTitle,
                getTextStyle('sm', { isHighContrast }),
                {
                  color:
                    hasTimestamp && timestampIsValid
                      ? isHighContrast
                        ? palette.textPrimary
                        : '#065F46'
                      : palette.error,
                },
              ]}
            >
              {hasTimestamp && timestampIsValid
                ? '✓ Timestamp valid'
                : hasTimestamp && timestampIsFuture
                ? '⚠ Timestamp invalid — future date'
                : '⚠ Timestamp unavailable'}
            </Text>
            <Text
              {...textProps}
              style={[
                styles.badgeDetail,
                getTextStyle('sm', { isHighContrast }),
                {
                  color:
                    hasTimestamp && timestampIsValid
                      ? isHighContrast
                        ? palette.textPrimary
                        : '#047857'
                      : palette.error,
                },
              ]}
            >
              {hasTimestamp ? formatTimestamp(exifResult.capturedAt) : 'EXIF DateTimeOriginal missing — check camera date/time settings.'}
            </Text>
          </View>
        )}

        {/* Loading indicator — camera opening */}
        {isLoading && !exifLoading && (
          <View style={styles.loadingRow} accessible accessibilityLabel="Opening camera">
            <ActivityIndicator color={palette.primary} />
            <Text {...textProps} style={[styles.loadingText, getTextStyle('sm', { isHighContrast }), { color: palette.textSecondary }]}>
              Opening camera...
            </Text>
          </View>
        )}

        {/* Error / permission denial / unavailable device */}
        {errorMsg && (
          <View
            style={[styles.errorBox, { backgroundColor: palette.errorBg, borderColor: palette.error, borderWidth }]}
            accessible
            accessibilityLiveRegion="polite"
          >
            <Text {...textProps} style={[styles.errorText, getTextStyle('sm', { isHighContrast }), { color: palette.error }]}>
              {errorMsg}
            </Text>
          </View>
        )}

        {/* Capture / Retake actions — prominent 48dp primary */}
        <View style={styles.actions}>
          {!hasImage ? (
            <Button
              title={isLoading ? 'Opening Camera...' : 'Capture Geotagged Image'}
              onPress={handleCapture}
              disabled={isLoading || exifLoading}
              accessibilityLabel="Capture geotagged image"
            />
          ) : (
            <>
              <Button
                title={isLoading ? 'Opening Camera...' : 'Retake Photo'}
                onPress={handleRetake}
                disabled={isLoading || exifLoading}
                accessibilityLabel="Retake photo"
              />
              <Button
                title="Capture New"
                onPress={handleCapture}
                disabled={isLoading || exifLoading}
                variant="secondary"
                accessibilityLabel="Capture new image"
                style={styles.secondaryAction}
              />
            </>
          )}
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  card: { borderColor: '#BBF7D0', borderWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', flex: 1 },
  cancelBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontWeight: '700', textAlign: 'center' },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
  previewWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    minHeight: 220,
  },
  previewImage: {
    width: '100%',
    height: 240,
  },
  placeholder: {
    borderRadius: 12,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 12,
  },
  viewfinderFrame: {
    width: '78%',
    height: 110,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    backgroundColor: 'transparent',
  },
  cornerTL: {
    top: 10,
    left: 10,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 10,
    right: 10,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 6,
  },
  crosshairH: {
    position: 'absolute',
    width: 28,
    height: 2,
    borderRadius: 1,
    top: '50%',
    marginTop: -1,
  },
  crosshairV: {
    position: 'absolute',
    height: 28,
    width: 2,
    borderRadius: 1,
    left: '50%',
    marginLeft: -1,
  },
  placeholderText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  viewfinderHint: {
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 2,
    fontStyle: 'italic',
  },
  badge: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  badgeTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  badgeDetail: {
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    marginLeft: 8,
  },
  errorBox: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontWeight: '600',
  },
  actions: {
    marginTop: 4,
  },
  secondaryAction: {
    marginTop: 8,
  },
});

export default EXIFCaptureScreen;
