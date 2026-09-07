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
};
