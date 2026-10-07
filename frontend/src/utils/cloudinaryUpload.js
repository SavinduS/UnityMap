import { Platform } from 'react-native';
// Static legacy import: root expo-file-system legacy methods throw at runtime in
// SDK 57, and dynamic import() is an unproven failure point — static resolution
// fails loudly at bundle time instead of silently at upload time.
import * as LegacyFS from 'expo-file-system/legacy';

/**
 * cloudinaryUpload.js — OPTIONAL direct-to-Cloudinary upload (unsigned).
 *
 * Active ONLY when BOTH env vars are set (frontend/.env, requires Expo restart):
 *   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
 *
 * The preset must be whitelisted for UNSIGNED uploads in the Cloudinary dashboard
 * (Settings → Upload → Upload presets). No secret is ever used here.
 *
 * When unconfigured, every function below reports "not configured" and callers
 * must fall back to the backend multipart path (POST /api/reports field `photo`),
 * which remains the primary, proven upload route.
 */

const getConfig = () => {
  const cloudName = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME : null;
  const preset = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET : null;
  const folder = (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_CLOUDINARY_FOLDER : null) || 'unitymap/barrier-reports';
  return {
    cloudName: typeof cloudName === 'string' && cloudName.trim() ? cloudName.trim() : null,
    preset: typeof preset === 'string' && preset.trim() ? preset.trim() : null,
    folder,
  };
};

export const isDirectUploadConfigured = () => {
  const { cloudName, preset } = getConfig();
  return !!(cloudName && preset);
};

const mimeFromName = (name, fallback) => {
  if (fallback && fallback !== 'image/jpeg') return fallback;
  const ext = String(name || '').split('?')[0].split('#')[0].split('.').pop()?.toLowerCase();
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', gif: 'image/gif' };
  return (ext && map[ext]) || fallback || 'image/jpeg';
};

/**
 * Upload a local image straight to Cloudinary (unsigned preset).
 * @param {{uri:string, name?:string, type?:string}|File|Blob|string} photo
 * @returns {Promise<string>} secure_url
 * @throws Error with message; preset/permission problems mention 'preset'.
 */
export const uploadToCloudinary = async (photo) => {
  const { cloudName, preset, folder } = getConfig();
  if (!cloudName || !preset) {
    throw new Error('Direct Cloudinary upload not configured (missing upload preset).');
  }
  const uri = typeof photo === 'string' ? photo : photo?.uri;
  if (!uri || typeof uri !== 'string') {
    throw new Error('Direct Cloudinary upload needs a local image URI.');
  }
  const name = (typeof photo === 'object' && (photo.name || photo.fileName)) || `photo_${Date.now()}.jpg`;
  const type = mimeFromName(name, typeof photo === 'object' ? photo.type : null);
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  if (Platform.OS === 'web') {
    // Web: File/Blob directly, or fetch the URI first (blob:/data:).
    let file = null;
    if (typeof File !== 'undefined' && (photo instanceof File || photo instanceof Blob)) {
      file = photo instanceof File ? photo : new File([photo], name, { type });
    } else {
      const resp = await fetch(uri);
      const blob = await resp.blob();
      file = new File([blob], name, { type: blob.type || type });
    }
    const form = new FormData();
    form.append('file', file, name);
    form.append('upload_preset', preset);
    form.append('folder', folder);
    const res = await fetch(url, { method: 'POST', body: form });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.secure_url) {
      throw new Error(body?.error?.message || `Direct Cloudinary upload failed (${res.status}).`);
    }
    return body.secure_url;
  }

  // Native: OS-level multipart via expo-file-system (no RN FormData involved).
  const FS = LegacyFS && typeof LegacyFS.uploadAsync === 'function' ? LegacyFS : null;
  const uploader = FS?.uploadAsync;
  const UploadType = FS?.FileSystemUploadType;
  if (typeof uploader !== 'function' || !UploadType) {
    throw new Error('Direct Cloudinary upload unavailable (FileSystem API missing).');
  }
  const res = await uploader(url, uri, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType: type,
    parameters: { upload_preset: preset, folder },
    headers: { Accept: 'application/json' },
  });
  let body = null;
  try {
    body = res?.body ? JSON.parse(res.body) : null;
  } catch {}
  if (res?.status >= 200 && res?.status < 300 && body?.secure_url) {
    return body.secure_url;
  }
  throw new Error(body?.error?.message || `Direct Cloudinary upload failed (${res?.status ?? 'no response'}).`);
};

export default { isDirectUploadConfigured, uploadToCloudinary };
