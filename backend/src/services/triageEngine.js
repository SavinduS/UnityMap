/**
 * triageEngine.js
 * Automated Severity Triage Engine & Urgency Calculation Algorithm
 * Colombo Municipal Council (CMC) Urban Accessibility Management
 * 
 * Ticket: SPT-111
 */

const { BarrierReport, TriageUrgencyScore, MunicipalAsset } = require('../models');

// Vital Transit & Healthcare Corridors in Colombo Municipal Council
const VITAL_CORRIDORS = [
  {
    name: 'National Hospital & Medical Belt (Borella)',
    wardId: 'CMC-W06',
    center: { latitude: 6.9147, longitude: 79.8778 },
    radiusMeters: 1200,
    multiplier: 1.25,
  },
  {
    name: 'Fort & Pettah Multimodal Railway Hub',
    wardId: 'CMC-W01',
    center: { latitude: 6.9344, longitude: 79.8428 },
    radiusMeters: 1500,
    multiplier: 1.2,
  },
  {
    name: 'Bambalapitiya Educational & University Corridor',
    wardId: 'CMC-W04',
    center: { latitude: 6.8915, longitude: 79.8556 },
    radiusMeters: 1000,
    multiplier: 1.15,
  },
  {
    name: 'Slave Island Commercial Redevelopment Zone',
    wardId: 'CMC-W02',
    center: { latitude: 6.9218, longitude: 79.8522 },
    radiusMeters: 800,
    multiplier: 1.1,
  },
];

// Baseline category impact weights
const CATEGORY_WEIGHTS = {
  Lift: 1.2, // Lift failures trap wheelchair users between multi-level pathways
  Ramp: 1.15, // Broken ramps force mobility users into vehicle roadway
  'Tactile Paving': 1.1, // Missing tactile surfaces pose safety hazard for blind users
  Restroom: 0.95,
  Other: 0.9,
};

/**
 * Haversine distance calculator between two coordinates (meters)
 */
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if coordinate falls within a vital transit/hospital corridor
 */
function getVitalCorridorMultiplier(lat, lng, wardId) {
  for (const corridor of VITAL_CORRIDORS) {
    if (corridor.wardId === wardId) {
      const dist = getDistanceMeters(lat, lng, corridor.center.latitude, corridor.center.longitude);
      if (dist <= corridor.radiusMeters) {
        return { multiplier: corridor.multiplier, corridorName: corridor.name };
      }
    }
  }
  return { multiplier: 1.0, corridorName: null };
}

/**
 * Core Algorithm: Calculate 0 - 100 Urgency Index
 * 
 * Formula:
 * Raw Urgency = (Severity * 0.40) + (Corroborations * 0.35) + (TimeDecay * 0.25)
 * Final Urgency = clamp(0, 100, round(Raw Urgency * CategoryWeight * VitalMultiplier))
 */
function calculateUrgencyIndex(report, wardId = 'CMC-W01') {
  const severityRating = Number(report.rating) || 3; // 1 to 5
  const corroborations = Number(report.corroborationCount) || 0;
  const createdAt = report.createdAt ? new Date(report.createdAt) : new Date();
  const now = new Date();
  const ageInDays = Math.max(0, (now - createdAt) / (1000 * 60 * 60 * 24));

  // 1. Severity Score: 1-5 normalized to 0-100 (40% weight)
  const severityScore = (severityRating / 5) * 100;

  // 2. Corroboration Score: 8 confirmations = 100% (35% weight)
  const corroborationScore = Math.min(100, corroborations * 12.5);

  // 3. Time Decay Score: 10 days = 100% (25% weight)
  const ageScore = Math.min(100, ageInDays * 10);

  // Category and Corridor Multipliers
  const categoryWeight = CATEGORY_WEIGHTS[report.category] || 1.0;
  const lat = report.coordinates?.latitude || 6.9271;
  const lng = report.coordinates?.longitude || 79.8612;
  const { multiplier: corridorMultiplier, corridorName } = getVitalCorridorMultiplier(lat, lng, wardId);

  // Combined weighted score
  const baseScore = severityScore * 0.4 + corroborationScore * 0.35 + ageScore * 0.25;
  const rawCalculated = baseScore * categoryWeight * corridorMultiplier;
  const finalUrgencyIndex = Math.min(100, Math.max(1, Math.round(rawCalculated)));

  // Priority Badge Classification
  let priorityBadge = 'LOW';
  if (finalUrgencyIndex >= 80) {
    priorityBadge = 'CRITICAL';
  } else if (finalUrgencyIndex >= 60) {
    priorityBadge = 'HIGH';
  } else if (finalUrgencyIndex >= 40) {
    priorityBadge = 'MEDIUM';
  }

  return {
    urgencyIndex: finalUrgencyIndex,
    priorityBadge,
    formulaFactors: {
      barrierSeverityWeight: severityRating,
      corroborationCount: corroborations,
      reportAgeDays: Math.round(ageInDays * 10) / 10,
      vitalCorridorMultiplier: corridorMultiplier,
      corridorName,
    },
  };
}

/**
 * Find nearest existing municipal infrastructure asset for cross-checking
 */
async function findNearestMunicipalAsset(lat, lng, wardId, maxDistanceMeters = 1500) {
  try {
    const assets = await MunicipalAsset.find({
      wardId,
      operationalStatus: { $ne: 'OUT_OF_SERVICE' },
    }).lean();

    let nearest = null;
    let minDistance = Infinity;

    for (const asset of assets) {
      if (asset.location?.coordinates && asset.location.coordinates.length === 2) {
        const [assetLng, assetLat] = asset.location.coordinates;
        const dist = getDistanceMeters(lat, lng, assetLat, assetLng);
        if (dist < minDistance && dist <= maxDistanceMeters) {
          minDistance = dist;
          nearest = asset;
        }
      }
    }

    return nearest ? { asset: nearest, distanceMeters: Math.round(minDistance) } : null;
  } catch (error) {
    console.warn('[TriageEngine] Asset cross-check lookup error:', error.message);
    return null;
  }
}

/**
 * Triage and auto-sort reports based on Urgency Index (rather than chronological submission)
 */
async function getTriagedQueue({
  wardId = 'CMC-W01',
  category,
  status = 'pending',
  minUrgency = 0,
  sortBy = 'urgency', // 'urgency' | 'corroboration' | 'date'
  limit = 20,
  page = 1,
}) {
  const query = {};

  if (status && status !== 'all') {
    query.triageStatus = status;
  }
  if (category && category !== 'all') {
    query.category = category;
  }

  // Fetch reports from MongoDB
  const reports = await BarrierReport.find(query)
    .sort({ createdAt: -1 })
    .lean();

  // Run Triage Calculation Engine on each report
  const triagedItems = await Promise.all(
    reports.map(async (report) => {
      const lat = report.coordinates?.latitude || 6.9271;
      const lng = report.coordinates?.longitude || 79.8612;

      const triageMetrics = calculateUrgencyIndex(report, wardId);
      const crossRef = await findNearestMunicipalAsset(lat, lng, wardId);

      return {
        ...report,
        triage: {
          ...triageMetrics,
          crossReferencedAsset: crossRef?.asset || null,
          distanceToAssetMeters: crossRef?.distanceMeters || null,
        },
      };
    })
  );

  // Filter by minUrgency
  const filtered = triagedItems.filter((item) => item.triage.urgencyIndex >= minUrgency);

  // Auto-sort strictly based on triage criteria
  filtered.sort((a, b) => {
    if (sortBy === 'corroboration') {
      return (b.corroborationCount || 0) - (a.corroborationCount || 0);
    }
    if (sortBy === 'date') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    // Default & Core requirement: Sort by urgencyIndex descending
    return b.triage.urgencyIndex - a.triage.urgencyIndex;
  });

  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return {
    totalReports: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit) || 1,
    wardId,
    reports: paginated,
  };
}

/**
 * Summary metrics for Ward Triage Queue
 */
async function getTriageMetrics(wardId = 'CMC-W01') {
  const queueResult = await getTriagedQueue({ wardId, status: 'pending', limit: 500 });
  const items = queueResult.reports;

  const total = items.length;
  const criticalCount = items.filter((i) => i.triage.priorityBadge === 'CRITICAL').length;
  const highCount = items.filter((i) => i.triage.priorityBadge === 'HIGH').length;
  const mediumCount = items.filter((i) => i.triage.priorityBadge === 'MEDIUM').length;
  const lowCount = items.filter((i) => i.triage.priorityBadge === 'LOW').length;

  const avgUrgency =
    total > 0 ? Math.round(items.reduce((acc, i) => acc + i.triage.urgencyIndex, 0) / total) : 0;

  return {
    wardId,
    totalPendingReports: total,
    criticalPriorityCount: criticalCount,
    highPriorityCount: highCount,
    mediumPriorityCount: mediumCount,
    lowPriorityCount: lowCount,
    averageUrgencyIndex: avgUrgency,
  };
}

module.exports = {
  calculateUrgencyIndex,
  findNearestMunicipalAsset,
  getTriagedQueue,
  getTriageMetrics,
  VITAL_CORRIDORS,
};
