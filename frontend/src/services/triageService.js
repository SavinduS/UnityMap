/**
 * triageService.js
 * Frontend Service & API Client for Automated Severity Triage Engine
 * 
 * Assigned Member: Savindu
 * Ticket: SPT-111
 */

import { apiRequest } from './api';

// Offline fallback mock data for testing/demo presentation if backend is not running
const MOCK_TRIAGED_REPORTS = [
  {
    _id: 'RPT-CMC-1001',
    category: 'Lift',
    rating: 5,
    corroborationCount: 7,
    upvotedBy: Array.from({ length: 7 }, (_, i) => `mock-upvoter-1001-${i + 1}`),
    triageStatus: 'pending',
    notes: 'Overpass lift display is dead and doors jammed shut. Wheelchair commuters unable to reach railway platforms.',
    photoUrl: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop',
    coordinates: { latitude: 6.9352, longitude: 79.8559 },
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    triage: {
      urgencyIndex: 100,
      priorityBadge: 'CRITICAL',
      formulaFactors: {
        barrierSeverityWeight: 5,
        corroborationCount: 7,
        reportAgeDays: 4,
        vitalCorridorMultiplier: 1.2,
        corridorName: 'Fort & Pettah Multimodal Railway Hub',
      },
      crossReferencedAsset: {
        assetCode: 'CMC-AST-2081',
        name: 'Pettah Floating Market Overpass Lift Tower A',
        category: 'Lift',
        operationalStatus: 'OPERATIONAL',
      },
      distanceToAssetMeters: 45,
    },
  },
  {
    _id: 'RPT-CMC-1002',
    category: 'Ramp',
    rating: 4,
    corroborationCount: 5,
    upvotedBy: Array.from({ length: 5 }, (_, i) => `mock-upvoter-1002-${i + 1}`),
    triageStatus: 'pending',
    notes: 'Severe concrete subsidence on ramp slope exceeding 12 degrees gradient. Wheelchair flipped backward yesterday.',
    photoUrl: 'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=600&auto=format&fit=crop',
    coordinates: { latitude: 6.9345, longitude: 79.8514 },
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    triage: {
      urgencyIndex: 88,
      priorityBadge: 'CRITICAL',
      formulaFactors: {
        barrierSeverityWeight: 4,
        corroborationCount: 5,
        reportAgeDays: 6,
        vitalCorridorMultiplier: 1.2,
        corridorName: 'Fort & Pettah Multimodal Railway Hub',
      },
      crossReferencedAsset: {
        assetCode: 'CMC-AST-1049',
        name: 'Fort Railway Station North Pedestrian Ramp',
        category: 'Ramp',
        operationalStatus: 'OPERATIONAL',
      },
      distanceToAssetMeters: 30,
    },
  },
  {
    _id: 'RPT-CMC-1003',
    category: 'Tactile Paving',
    rating: 4,
    corroborationCount: 6,
    upvotedBy: Array.from({ length: 6 }, (_, i) => `mock-upvoter-1003-${i + 1}`),
    triageStatus: 'pending',
    notes: 'Tactile paving warning tiles removed during pipe maintenance. Visually impaired patient tripped on open trench.',
    photoUrl: 'https://images.unsplash.com/photo-1508873696983-2df57036476b?w=600&auto=format&fit=crop',
    coordinates: { latitude: 6.9149, longitude: 79.8779 },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    triage: {
      urgencyIndex: 78,
      priorityBadge: 'HIGH',
      formulaFactors: {
        barrierSeverityWeight: 4,
        corroborationCount: 6,
        reportAgeDays: 3,
        vitalCorridorMultiplier: 1.25,
        corridorName: 'National Hospital & Medical Belt (Borella)',
      },
      crossReferencedAsset: {
        assetCode: 'CMC-AST-3112',
        name: 'National Hospital Main Entrance Guiding Tactile Surface',
        category: 'Tactile Paving',
        operationalStatus: 'OPERATIONAL',
      },
      distanceToAssetMeters: 22,
    },
  },
  {
    _id: 'RPT-CMC-1004',
    category: 'Restroom',
    rating: 3,
    corroborationCount: 2,
    upvotedBy: Array.from({ length: 2 }, (_, i) => `mock-upvoter-1004-${i + 1}`),
    triageStatus: 'pending',
    notes: 'Accessible stall lock broken and grab rail loose from wall.',
    photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop',
    coordinates: { latitude: 6.9085, longitude: 79.8521 },
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    triage: {
      urgencyIndex: 44,
      priorityBadge: 'MEDIUM',
      formulaFactors: {
        barrierSeverityWeight: 3,
        corroborationCount: 2,
        reportAgeDays: 1,
        vitalCorridorMultiplier: 1.0,
      },
      crossReferencedAsset: null,
      distanceToAssetMeters: null,
    },
  },
  {
    _id: 'RPT-CMC-1005',
    category: 'Ramp',
    rating: 2,
    corroborationCount: 1,
    upvotedBy: Array.from({ length: 1 }, (_, i) => `mock-upvoter-1005-${i + 1}`),
    triageStatus: 'pending',
    notes: 'Faded yellow high-contrast paint on ramp threshold. Minor cosmetic issue.',
    photoUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop',
    coordinates: { latitude: 6.8916, longitude: 79.8558 },
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    triage: {
      urgencyIndex: 26,
      priorityBadge: 'LOW',
      formulaFactors: {
        barrierSeverityWeight: 2,
        corroborationCount: 1,
        reportAgeDays: 0.5,
        vitalCorridorMultiplier: 1.0,
      },
      crossReferencedAsset: null,
      distanceToAssetMeters: null,
    },
  },
];

// --- Offline urgency engine (mirrors backend triageEngine.js for demo consistency) ---
const CATEGORY_WEIGHTS = {
  Lift: 1.2,
  Ramp: 1.15,
  'Tactile Paving': 1.1,
  Restroom: 0.95,
  Other: 0.9,
};

const VITAL_CORRIDORS = [
  { name: 'National Hospital & Medical Belt (Borella)', wardId: 'CMC-W06', center: { latitude: 6.9147, longitude: 79.8778 }, radiusMeters: 1200, multiplier: 1.25 },
  { name: 'Fort & Pettah Multimodal Railway Hub', wardId: 'CMC-W01', center: { latitude: 6.9344, longitude: 79.8428 }, radiusMeters: 1500, multiplier: 1.2 },
  { name: 'Bambalapitiya Educational & University Corridor', wardId: 'CMC-W04', center: { latitude: 6.8915, longitude: 79.8556 }, radiusMeters: 1000, multiplier: 1.15 },
  { name: 'Slave Island Commercial Redevelopment Zone', wardId: 'CMC-W02', center: { latitude: 6.9218, longitude: 79.8522 }, radiusMeters: 800, multiplier: 1.1 },
];

function _getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _getVitalCorridor(lat, lng, wardId) {
  for (const c of VITAL_CORRIDORS) {
    if (c.wardId === wardId) {
      const dist = _getDistanceMeters(lat, lng, c.center.latitude, c.center.longitude);
      if (dist <= c.radiusMeters) return { multiplier: c.multiplier, corridorName: c.name };
    }
  }
  return { multiplier: 1.0, corridorName: null };
}

function _calculateMockUrgency(report, wardId = 'CMC-W01') {
  const severity = Number(report.rating) || 3;
  const corroborations = Number(report.corroborationCount) || 0;
  const createdAt = report.createdAt ? new Date(report.createdAt) : new Date();
  const ageInDays = Math.max(0, (Date.now() - createdAt.getTime()) / 86400000);
  const severityScore = (severity / 5) * 100;
  const corroborationScore = Math.min(100, corroborations * 12.5);
  const ageScore = Math.min(100, ageInDays * 10);
  const base = severityScore * 0.4 + corroborationScore * 0.35 + ageScore * 0.25;
  const lat = report.coordinates?.latitude || 6.9271;
  const lng = report.coordinates?.longitude || 79.8612;
  const { multiplier, corridorName } = _getVitalCorridor(lat, lng, wardId);
  const catWeight = CATEGORY_WEIGHTS[report.category] || 1.0;
  const urgencyIndex = Math.min(100, Math.max(1, Math.round(base * catWeight * multiplier)));
  let priorityBadge = 'LOW';
  if (urgencyIndex >= 80) priorityBadge = 'CRITICAL';
  else if (urgencyIndex >= 60) priorityBadge = 'HIGH';
  else if (urgencyIndex >= 40) priorityBadge = 'MEDIUM';
  return {
    urgencyIndex,
    priorityBadge,
    formulaFactors: {
      barrierSeverityWeight: severity,
      corroborationCount: corroborations,
      reportAgeDays: Math.round(ageInDays * 10) / 10,
      vitalCorridorMultiplier: multiplier,
      corridorName,
    },
  };
}

/**
 * Offline helper: push a new report into MOCK_TRIAGED_REPORTS with urgency triage.
 * Used when backend is unreachable so AdminAddReportModal appears seamless offline.
 * @param {object} reportData - {category, rating, notes, coordinates, photoUrl, wardId}
 * @returns {object} the triaged mock report added
 */
export const addMockTriageReport = (reportData = {}) => {
  const wardId = reportData.wardId || 'CMC-W01';
  const nowIso = new Date().toISOString();
  const id = reportData._id || `RPT-MOCK-${Date.now().toString(36).toUpperCase()}`;
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
    photoUrl: reportData.photoUrl || reportData.imageUri || 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop',
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
    console.warn('[triageService] API unreachable; using offline triage queue simulation.');
  }

  // Filter offline fallback
  let filtered = [...MOCK_TRIAGED_REPORTS];
  if (category && category !== 'all') {
    filtered = filtered.filter((r) => r.category === category);
  }
  if (status && status !== 'all') {
    filtered = filtered.filter((r) => r.triageStatus === status);
  }
  filtered = filtered.filter((r) => r.triage.urgencyIndex >= minUrgency);

  // Sort strictly by triage criteria
  filtered.sort((a, b) => {
    if (sortBy === 'corroboration') return (b.corroborationCount || 0) - (a.corroborationCount || 0);
    if (sortBy === 'date') return new Date(b.createdAt) - new Date(a.createdAt);
    return b.triage.urgencyIndex - a.triage.urgencyIndex;
  });

  return {
    totalReports: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit) || 1,
    wardId,
    reports: filtered,
  };
};

/**
 * Fetch ward-level triage statistics
 */
export const fetchTriageMetrics = async (wardId = 'CMC-W01') => {
  try {
    const response = await apiRequest(`/admin/triage/metrics?wardId=${encodeURIComponent(wardId)}`);
    if (response?.success && response.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[triageService] API metrics unreachable; using offline metrics.');
  }

  const reports = MOCK_TRIAGED_REPORTS;
  const total = reports.length;
  const critical = reports.filter((r) => r.triage.priorityBadge === 'CRITICAL').length;
  const high = reports.filter((r) => r.triage.priorityBadge === 'HIGH').length;
  const medium = reports.filter((r) => r.triage.priorityBadge === 'MEDIUM').length;
  const low = reports.filter((r) => r.triage.priorityBadge === 'LOW').length;
  const avg = total > 0 ? Math.round(reports.reduce((acc, r) => acc + r.triage.urgencyIndex, 0) / total) : 0;

  return {
    wardId,
    totalPendingReports: total,
    criticalPriorityCount: critical,
    highPriorityCount: high,
    mediumPriorityCount: medium,
    lowPriorityCount: low,
    averageUrgencyIndex: avg,
  };
};

/**
 * Fetch detailed report inspection data with cross-referenced asset
 */
export const fetchReportDetails = async (reportId, wardId = 'CMC-W01') => {
  try {
    const response = await apiRequest(`/admin/triage/report/${encodeURIComponent(reportId)}?wardId=${encodeURIComponent(wardId)}`);
    if (response?.success && response.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[triageService] API report details unreachable; using offline report details.');
  }

  const found = MOCK_TRIAGED_REPORTS.find((r) => r._id === reportId);
  return found || MOCK_TRIAGED_REPORTS[0];
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
    console.warn('[triageService] API dispatch unreachable; updating local mock state.');
  }

  // Local fallback simulation
  const normalized = decision?.toUpperCase();
  const mockReport = MOCK_TRIAGED_REPORTS.find((r) => r._id === reportId);
  if (mockReport) {
    if (normalized === 'APPROVED') {
      mockReport.triageStatus = 'approved';
    } else if (normalized === 'REJECTED') {
      mockReport.triageStatus = 'rejected';
    } else if (normalized === 'INFO_REQUESTED') {
      mockReport.triageStatus = 'info_requested';
    }
  }

  return {
    reportId,
    decision: normalized,
    status: normalized === 'APPROVED' ? 'approved' : normalized === 'REJECTED' ? 'rejected' : 'info_requested',
    allocatedBudgetLKR: Number(allocatedBudgetLKR) || 0,
    rejectionReason,
    dispatchedAt: new Date().toISOString(),
  };
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
