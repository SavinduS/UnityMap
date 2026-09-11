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
// Higher weight = more urgency boost for that barrier type
const CATEGORY_WEIGHTS = {
  Lift: 1.20,           // Lift failures physically trap wheelchair users between floors / pathways
  Ramp: 1.15,           // Broken ramps force mobility-aid users into active vehicle roadway
  'Tactile Paving': 1.10, // Missing tactile guidance strips are a direct safety hazard for blind users
  Restroom: 0.95,       // Accessibility restroom defects affect dignity but rarely create physical danger
  Other: 1.00,          // Neutral — do NOT penalise valid barriers that don't fit predefined categories
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
 * Core Algorithm: Calculate 0–100 Urgency Index
 *
 * Revised Formula (v2):
 * ──────────────────────────────────────────────────────────────────────────────
 * 1. SEVERITY SCORE   (40% weight) — normalised rating 1–5 → 0–100
 *    severityScore = (rating / 5) × 100
 *    → Contribution range: 8–40 pts (minimum rating is 1)
 *
 * 2. CORROBORATION SCORE  (35% weight) — logarithmic curve, cap at 20 confirms
 *    corroborationScore = log(1 + count) / log(1 + 20) × 100
 *    → Logarithmic: first few confirms matter most; 20+ confirms don't keep
 *      inflating score. This prevents viral-but-minor reports from hijacking
 *      the CRITICAL tier over genuinely dangerous low-traffic barriers.
 *
 * 3. TIME DECAY SCORE  (25% weight) — linear ramp over 30-day CMC SLA window
 *    ageScore = min(100, ageDays × (100 / 30))
 *    → 30 days = 100%. Reports stay differentiable across the full municipal
 *      repair cycle (previously 10 days = 100% caused all backlog to plateau).
 *
 * MULTIPLIERS (applied to base score):
 *    × CategoryWeight   — Lift (1.20) > Ramp (1.15) > Tactile (1.10) > Restroom (0.95) > Other (1.0)
 *    × CorridorMultiplier — Hospital belt (1.25), Railway hub (1.20), etc.
 *
 * OUTPUT:
 *    urgencyIndex  = clamp(1, 100, round(base × categoryWeight × corridorMultiplier))
 *    rawScore      = unclamped value — used as a secondary sort key within CRITICAL tier
 * ──────────────────────────────────────────────────────────────────────────────
 */
function calculateUrgencyIndex(report, wardId = 'CMC-W01') {
  const severityRating = Math.min(5, Math.max(1, Number(report.rating) || 3)); // clamp 1–5
  const corroborations = Math.max(0, Number(report.corroborationCount) || 0);
  const createdAt = report.createdAt ? new Date(report.createdAt) : new Date();
  const now = new Date();
  const ageInDays = Math.max(0, (now - createdAt) / (1000 * 60 * 60 * 24));

  // ─────────────────────────────────────────────────────────────
  // 1. Severity Score (40% weight) — rating 1–5 → 20–100
  // ─────────────────────────────────────────────────────────────
  const severityScore = (severityRating / 5) * 100;

  // ─────────────────────────────────────────────────────────────
  // 2. Corroboration Score (35% weight) — logarithmic, cap at 20 confirms
  //    log1p(20) ≈ 3.045, so score = log1p(count) / 3.045 × 100
  //    Examples: 1 confirm → 21pts | 5 → 58pts | 10 → 76pts | 20 → 100pts
  // ─────────────────────────────────────────────────────────────
  const LOG_CORROBORATION_CAP = 20;
  const corroborationScore = Math.min(
    100,
    (Math.log1p(corroborations) / Math.log1p(LOG_CORROBORATION_CAP)) * 100
  );

  // ─────────────────────────────────────────────────────────────
  // 3. Time Decay Score (25% weight) — linear over 30-day CMC SLA window
  //    30 days = 100%; keeps backlog reports differentiable across full cycle
  // ─────────────────────────────────────────────────────────────
  const CMC_SLA_WINDOW_DAYS = 30;
  const ageScore = Math.min(100, ageInDays * (100 / CMC_SLA_WINDOW_DAYS));

  // ─────────────────────────────────────────────────────────────
  // Multipliers: Category type + Vital Corridor boost
  // ─────────────────────────────────────────────────────────────
  const categoryWeight = CATEGORY_WEIGHTS[report.category] || 1.0;
  const lat = report.coordinates?.latitude || 6.9271;
  const lng = report.coordinates?.longitude || 79.8612;
  const { multiplier: corridorMultiplier, corridorName } =
    getVitalCorridorMultiplier(lat, lng, wardId);

  // ─────────────────────────────────────────────────────────────
  // Combined weighted score
  // ─────────────────────────────────────────────────────────────
  const baseScore = severityScore * 0.4 + corroborationScore * 0.35 + ageScore * 0.25;
  const rawScore = Math.round(baseScore * categoryWeight * corridorMultiplier * 10) / 10;
  const finalUrgencyIndex = Math.min(100, Math.max(1, Math.round(rawScore)));

  // ─────────────────────────────────────────────────────────────
  // Priority Badge Classification
  // CRITICAL  ≥ 80  (life-safety or high-impact barrier requiring immediate dispatch)
  // HIGH      ≥ 60  (significant mobility impact, schedule within the week)
  // MEDIUM    ≥ 35  (real barrier but manageable within the repair cycle)
  // LOW       < 35  (low severity, low corroboration, recently submitted)
  // ─────────────────────────────────────────────────────────────
  let priorityBadge = 'LOW';
  if (finalUrgencyIndex >= 80) {
    priorityBadge = 'CRITICAL';
  } else if (finalUrgencyIndex >= 60) {
    priorityBadge = 'HIGH';
  } else if (finalUrgencyIndex >= 35) {
    priorityBadge = 'MEDIUM';
  }

  return {
    urgencyIndex: finalUrgencyIndex,
    rawScore,               // Unclamped score — use as secondary sort key within same badge tier
    priorityBadge,
    formulaFactors: {
      barrierSeverityWeight: severityRating,
      corroborationCount: corroborations,
      reportAgeDays: Math.round(ageInDays * 10) / 10,
      vitalCorridorMultiplier: corridorMultiplier,
      corridorName,
      // Debug breakdown (useful for admin inspection panel)
      _breakdown: {
        severityScore: Math.round(severityScore),
        corroborationScore: Math.round(corroborationScore),
        ageScore: Math.round(ageScore),
        baseScore: Math.round(baseScore),
        categoryWeight,
        corridorMultiplier,
      },
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
    // Use rawScore as tiebreaker so CRITICAL reports (all at 100) are still
    // differentiated by their unclamped score (e.g., 142 vs 118)
    const urgencyDiff = b.triage.urgencyIndex - a.triage.urgencyIndex;
    if (urgencyDiff !== 0) return urgencyDiff;
    return (b.triage.rawScore || 0) - (a.triage.rawScore || 0);
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
