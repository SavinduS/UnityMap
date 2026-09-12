/**
 * triageService.js
 * Frontend Service & API Client for Automated Severity Triage Engine
 * 
 * Interacts with live backend severity triage API.
 * All dummy and hardcoded mock reports have been removed.
 */

import { apiRequest } from './api';

// Live runtime cache for offline or newly added reports (starts empty - NO dummy data)
const RUNTIME_REPORTS = [];

/**
<<<<<<< HEAD
 * Offline helper: push a new report into MOCK_TRIAGED_REPORTS with urgency triage.
 * Used when backend is unreachable so AdminAddReportModal appears seamless offline.
 * @param {object} reportData - {category, rating, notes, coordinates, photoUrl, wardId}
 * @returns {object} the triaged mock report added
 */
export const addMockTriageReport = (reportData = {}) => {
  const wardId = reportData.wardId || 'CMC-W01';
  const nowIso = new Date().toISOString();
  const id = reportData._id || `RPT-MOCK-${Date.now().toString(36).toUpperCase()}`;
  // Persist ONLY real user inputs — no hardcoded Unsplash mock photoUrl fallback for report creation
  // If no photo provided, leave photoUrl empty (backend requires real photoUrl or file upload)
  const base = {
    _id: id,
    category: reportData.category || 'Other',
    rating: Number(reportData.rating) || 3,
    corroborationCount: Number(reportData.corroborationCount) || 0,
    upvotedBy: Array.isArray(reportData.upvotedBy)
      ? [...reportData.upvotedBy]
      : Array.from({ length: Number(reportData.corroborationCount) || 0 }, (_, i) => `mock-upvoter-${id}-${i + 1}`),
    triageStatus: 'pending',
    notes: reportData.notes || reportData.note || '',
    photoUrl: reportData.photoUrl || reportData.imageUri || '',
    coordinates: reportData.coordinates || { latitude: 6.9271, longitude: 79.8612 },
    createdAt: reportData.createdAt || nowIso,
    wardId,
  };
  const triage = _calculateMockUrgency(base, wardId);
  const mockReport = {
    ...base,
    triage: {
      ...triage,
      crossReferencedAsset: null,
      distanceToAssetMeters: null,
    },
  };
  // Insert chronologically at front; queue sort will re-order by urgency on fetch
  MOCK_TRIAGED_REPORTS.unshift(mockReport);
  return mockReport;
};

export const getMockReports = () => [...MOCK_TRIAGED_REPORTS];

/**
 * Toggle corroboration for a mock report (offline/demo mode).
 * Finds report in MOCK_TRIAGED_REPORTS, toggles upvotedBy and corroborationCount, recalculates urgency.
 * @param {string} reportId - _id of report to corroborate/uncorroborate
 * @param {string} userId - user identifier (defaults to mock-user)
 * @returns {object|null} updated report or null if not found
 */
export const corroborateMockReport = (reportId, userId = 'mock-user') => {
  const report = MOCK_TRIAGED_REPORTS.find((r) => r._id === reportId);
  if (!report) return null;
  if (!Array.isArray(report.upvotedBy)) report.upvotedBy = [];
  const idx = report.upvotedBy.indexOf(userId);
  if (idx !== -1) {
    // Already corroborated -> uncorroborate
    report.upvotedBy.splice(idx, 1);
  } else {
    report.upvotedBy.push(userId);
  }
  // Keep count in sync
  report.corroborationCount = report.upvotedBy.length;
  // Recalculate urgency
  const wardId = report.wardId || 'CMC-W01';
  const newTriage = _calculateMockUrgency(report, wardId);
  report.triage = {
    ...report.triage,
    ...newTriage,
    crossReferencedAsset: report.triage?.crossReferencedAsset ?? null,
    distanceToAssetMeters: report.triage?.distanceToAssetMeters ?? null,
  };
  return report;
};

/**
 * Fetch severity-sorted triage queue
=======
 * Fetch severity-sorted triage queue from live backend
>>>>>>> origin/develop
 */
export const fetchTriageQueue = async ({
  wardId = 'CMC-W01',
  category = 'all',
  status = 'pending',
  minUrgency = 0,
  sortBy = 'urgency',
  page = 1,
  limit = 20,
} = {}) => {
  try {
    const params = new URLSearchParams({
      wardId,
      status,
      sortBy,
      page: String(page),
      limit: String(limit),
    });
    if (category && category !== 'all') params.append('category', category);
    if (minUrgency > 0) params.append('minUrgency', String(minUrgency));

    const response = await apiRequest(`/admin/triage/queue?${params.toString()}`);
    if (response?.success && response.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[triageService] Error fetching live triage queue:', error.message);
  }

  // If unreachable or empty, return empty real structure (NO fake dummy reports)
  return {
    totalReports: RUNTIME_REPORTS.length,
    page,
    limit,
    totalPages: Math.ceil(RUNTIME_REPORTS.length / limit) || 1,
    wardId,
    reports: [...RUNTIME_REPORTS],
  };
};

/**
 * Fetch ward-level triage statistics from live backend
 */
export const fetchTriageMetrics = async (wardId = 'CMC-W01') => {
  try {
    const response = await apiRequest(`/admin/triage/metrics?wardId=${encodeURIComponent(wardId)}`);
    if (response?.success && response.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[triageService] Error fetching triage metrics:', error.message);
  }

  return {
    wardId,
    totalPendingReports: 0,
    criticalPriorityCount: 0,
    highPriorityCount: 0,
    mediumPriorityCount: 0,
    lowPriorityCount: 0,
    averageUrgencyIndex: 0,
  };
};

/**
 * Fetch detailed report inspection data with cross-referenced asset from live backend
 */
export const fetchReportDetails = async (reportId, wardId = 'CMC-W01') => {
  if (!reportId) return null;

  try {
    const response = await apiRequest(`/admin/triage/report/${encodeURIComponent(reportId)}?wardId=${encodeURIComponent(wardId)}`);
    if (response?.success && response.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[triageService] Error fetching report details:', error.message);
  }

  const runtimeFound = RUNTIME_REPORTS.find((r) => r._id === reportId);
  return runtimeFound || null;
};

/**
 * Dispatch administrative municipal decision (SPT-208)
 * Dispositions: APPROVED, REJECTED, INFO_REQUESTED
 */
export const dispatchDecision = async ({
  reportId,
  decision,
  allocatedBudgetLKR = 0,
  rejectionReason = null,
  notes = '',
  staffId = 'CMC-ENG-882',
  wardId = 'CMC-W01',
  repairTargetDays = 7,
} = {}) => {
  try {
    const response = await apiRequest('/admin/triage/dispatch', {
      method: 'POST',
      body: JSON.stringify({
        reportId,
        decision,
        allocatedBudgetLKR,
        rejectionReason,
        notes,
        staffId,
        wardId,
        repairTargetDays,
      }),
    });
    if (response?.success && response.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[triageService] API dispatch error:', error.message);
    throw error;
  }

  const normalized = decision?.toUpperCase();
  return {
    reportId,
    decision: normalized,
    status: normalized === 'APPROVED' ? 'approved' : normalized === 'REJECTED' ? 'rejected' : 'info_requested',
    allocatedBudgetLKR: Number(allocatedBudgetLKR) || 0,
    rejectionReason,
    dispatchedAt: new Date().toISOString(),
  };
};

/**
 * Runtime helper for newly submitted reports when offline
 */
export const addMockTriageReport = (reportData = {}) => {
  const id = reportData._id || `RPT-${Date.now().toString(36).toUpperCase()}`;
  const newReport = {
    ...reportData,
    _id: id,
    triageStatus: 'pending',
    createdAt: reportData.createdAt || new Date().toISOString(),
    triage: {
      urgencyIndex: 50,
      priorityBadge: 'MEDIUM',
      formulaFactors: {
        barrierSeverityWeight: Number(reportData.rating) || 3,
        corroborationCount: Number(reportData.corroborationCount) || 0,
        reportAgeDays: 0,
        vitalCorridorMultiplier: 1.0,
      },
      crossReferencedAsset: null,
      distanceToAssetMeters: null,
    },
  };
  RUNTIME_REPORTS.unshift(newReport);
  return newReport;
};

export const getMockReports = () => [...RUNTIME_REPORTS];

export const corroborateMockReport = (reportId, userId = 'user') => {
  const report = RUNTIME_REPORTS.find((r) => r._id === reportId);
  if (!report) return null;
  if (!Array.isArray(report.upvotedBy)) report.upvotedBy = [];
  const idx = report.upvotedBy.indexOf(userId);
  if (idx !== -1) {
    report.upvotedBy.splice(idx, 1);
  } else {
    report.upvotedBy.push(userId);
  }
  report.corroborationCount = report.upvotedBy.length;
  return report;
};

export default {
  fetchTriageQueue,
  fetchTriageMetrics,
  fetchReportDetails,
  dispatchDecision,
  addMockTriageReport,
  getMockReports,
  corroborateMockReport,
};
