/**
 * triageController.js
 * Express Controller for Automated Severity Triage Queue & Urgency Calculation
 * 
 * Assigned Member: Savindu
 * Ticket: SPT-111
 */

const {
  getTriagedQueue,
  getTriageMetrics,
  calculateUrgencyIndex,
  findNearestMunicipalAsset,
} = require('../services/triageEngine');
const { BarrierReport } = require('../models');
const { seedTriageDataIfEmpty } = require('../utils/triageSeedData');

/**
 * GET /api/admin/triage/queue
 * Query incoming pending barrier reports auto-sorted by calculated Urgency Index
 */
const getQueue = async (req, res) => {
  try {
    // Ensure demo seed data exists if testing fresh database
    await seedTriageDataIfEmpty();

    const {
      wardId = 'CMC-W01',
      category,
      status = 'pending',
      minUrgency = 0,
      sortBy = 'urgency',
      limit = 20,
      page = 1,
    } = req.query;

    const result = await getTriagedQueue({
      wardId,
      category,
      status,
      minUrgency: Number(minUrgency) || 0,
      sortBy,
      limit: parseInt(limit, 10) || 20,
      page: parseInt(page, 10) || 1,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching triage queue:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve severity triage queue',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/triage/metrics
 * Retrieve ward-level triage statistics and urgency distribution
 */
const getMetrics = async (req, res) => {
  try {
    const { wardId = 'CMC-W01' } = req.query;
    const metrics = await getTriageMetrics(wardId);

    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve triage metrics',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/triage/report/:reportId
 * Single report detailed triage inspection with cross-referenced asset
 */
const getReportDetails = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { wardId = 'CMC-W01' } = req.query;

    const report = await BarrierReport.findById(reportId).lean();
    if (!report) {
      return res.status(404).json({
        success: false,
        message: `Barrier report with ID ${reportId} not found`,
      });
    }

    const lat = report.coordinates?.latitude || 6.9271;
    const lng = report.coordinates?.longitude || 79.8612;

    const triageMetrics = calculateUrgencyIndex(report, wardId);
    const crossRef = await findNearestMunicipalAsset(lat, lng, wardId);

    return res.status(200).json({
      success: true,
      data: {
        ...report,
        triage: {
          ...triageMetrics,
          crossReferencedAsset: crossRef?.asset || null,
          distanceToAssetMeters: crossRef?.distanceMeters || null,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching report triage details',
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/triage/recalculate
 * Explicitly trigger urgency score recalculation across pending queue
 */
const recalculateQueue = async (req, res) => {
  try {
    const { wardId = 'CMC-W01' } = req.body;
    const queue = await getTriagedQueue({ wardId, status: 'pending', limit: 50 });

    return res.status(200).json({
      success: true,
      message: `Urgency index recalculation complete for ${queue.totalReports} pending reports in ward ${wardId}`,
      data: queue,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to recalculate triage queue',
      error: error.message,
    });
  }
};

module.exports = {
  getQueue,
  getMetrics,
  getReportDetails,
  recalculateQueue,
};
