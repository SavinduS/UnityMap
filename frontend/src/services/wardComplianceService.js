/**
 * wardComplianceService.js
 * Frontend Service & API Client for Ward Accessibility Compliance & Budget Analytics
 * 
 * Interacts with live backend compliance API.
 * All dummy and hardcoded mock data have been removed.
 */

import { apiRequest, getApiBaseUrlCandidates, getAuthHeaders } from './api';
import { getWardById } from '../utils/wardJurisdictions';
import { Linking, Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Probes the backend on each candidate port and caches the first one that answers.
 * Binary downloads bypass `apiRequest`, so they need this to avoid being pinned to a
 * port the server is not listening on.
 */
let resolvedBaseUrl = null;

const resolveApiBaseUrl = async () => {
  if (resolvedBaseUrl) return resolvedBaseUrl;

  const candidates = getApiBaseUrlCandidates();
  const failures = [];

  for (const baseUrl of candidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
      if (response.ok) {
        clearTimeout(timeoutId);
        resolvedBaseUrl = baseUrl;
        return baseUrl;
      }
      failures.push(`${baseUrl} -> HTTP ${response.status}`);
    } catch (err) {
      failures.push(`${baseUrl} -> ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Backend unreachable. Tried: ${failures.join('; ')}`);
};

/**
 * Fetch ward compliance KPIs and budget analytics from live backend
 */
export const fetchWardCompliance = async (wardId = 'CMC-W01') => {
  // No fabricated fallback: previously a failed request returned a synthetic
  // "100% compliant, 0 defects" ward, which reads as good news when it is
  // actually missing data. Failures propagate so the UI can say so.
  const response = await apiRequest(`/admin/compliance/ward/${encodeURIComponent(wardId)}`);

  if (!response?.success || !response?.data) {
    throw new Error('The server returned an unexpected compliance payload.');
  }

  return response.data;
};

/**
 * Export municipal audit compliance report summary from live backend
 */
export const exportAuditReport = async (wardId = 'CMC-W01') => {
  // Previously fabricated an official-looking audit reference and a 'COMPLIANT'
  // status locally when the request failed. A statutory document must never be
  // synthesised on the client — surface the real failure instead.
  const response = await apiRequest(`/admin/compliance/audit/${encodeURIComponent(wardId)}`);

  if (!response?.success || !response?.data) {
    throw new Error('The server could not generate the audit summary.');
  }

  return response.data;
};

/**
 * Resolves the absolute URL for the official council compliance PDF document.
 * Awaits the working backend port so callers never build a URL against a dead port.
 */
export const getAuditReportPdfUrl = async (wardId = 'CMC-W01') => {
  const baseUrl = await resolveApiBaseUrl();
  return `${baseUrl}/admin/compliance/audit/${encodeURIComponent(wardId)}/pdf`;
};

/**
 * Downloads the official municipal audit PDF.
 *
 * Web: fetches the bytes, verifies the response really is a PDF (the endpoint
 *      can answer with a JSON error body under an `application/pdf` header),
 *      then saves via a blob URL.
 * Native: streams the file to the app cache directory and opens it.
 *
 * Rejects on failure so the UI can surface a real error instead of a fake success.
 */
export const downloadAuditReportPdf = async (wardId = 'CMC-W01') => {
  const baseUrl = await resolveApiBaseUrl();
  const pdfUrl = `${baseUrl}/admin/compliance/audit/${encodeURIComponent(wardId)}/pdf`;
  const fileName = `CMC_Ward_${getWardById(wardId).id}_Audit_Report.pdf`;
  const authHeaders = await getAuthHeaders();

  if (Platform.OS === 'web') {
    const response = await fetch(pdfUrl, {
      headers: { ...authHeaders, Accept: 'application/pdf' },
    });

    if (!response.ok) {
      throw new Error(`Audit PDF request failed (HTTP ${response.status}).`);
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('application/pdf')) {
      throw new Error(`Server returned "${contentType || 'unknown content'}" instead of a PDF.`);
    }

    const blob = await response.blob();
    if (!blob.size) {
      throw new Error('Audit PDF response was empty.');
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);

    return { success: true, fileName, bytes: blob.size, uri: blobUrl };
  }

  const reportsDir = new Directory(Paths.cache, 'audit-reports');
  if (!reportsDir.exists) {
    reportsDir.create({ intermediates: true, idempotent: true });
  }

  const downloaded = await File.downloadFileAsync(
    pdfUrl,
    new File(reportsDir, fileName),
    { headers: { ...authHeaders, Accept: 'application/pdf' }, idempotent: true }
  );

  await Linking.openURL(downloaded.uri).catch(() => {});

  return { success: true, fileName, uri: downloaded.uri, bytes: downloaded.size ?? null };
};

export default {
  fetchWardCompliance,
  exportAuditReport,
  getAuditReportPdfUrl,
  downloadAuditReportPdf,
};
