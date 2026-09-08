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
const { BarrierReport, TriageUrgencyScore } = require('../models');
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

    console.log(`✅ Triage Queue fetched: ward=${wardId} category=${category || 'all'} status=${status} → ${result.totalReports} reports (showing ${result.reports.length})`);
    if (result.reports.length > 0) {
      console.log('   → Latest:', result.reports[0]._id, result.reports[0].category, result.reports[0].triage?.urgencyIndex);
    }

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

/**
 * POST /api/admin/triage/dispatch
 * Administrative Decision Dispatch Engine (SPT-208)
 * Dispatches municipal authority action: APPROVED, REJECTED, or INFO_REQUESTED
 */
const dispatchDecision = async (req, res) => {
  try {
    const {
      reportId,
      decision,
      allocatedBudgetLKR = 0,
      rejectionReason = null,
      notes = '',
      staffId = 'CMC-ENG-882',
      wardId = 'CMC-W01',
      repairTargetDays = 7,
    } = req.body;

    if (!reportId || !decision) {
      return res.status(400).json({
        success: false,
        message: 'reportId and decision are required for administrative dispatch',
      });
    }

    const normalizedDecision = decision.toUpperCase();
    let newStatus = 'pending';
    let triageDecisionStatus = 'PENDING_TRIAGE';
    let logAction = 'updated';

    if (normalizedDecision === 'APPROVED') {
      newStatus = 'approved';
      triageDecisionStatus = 'APPROVED_AND_BUDGETED';
      logAction = 'approved';
    } else if (normalizedDecision === 'REJECTED') {
      newStatus = 'rejected';
      triageDecisionStatus = 'REJECTED';
      logAction = 'rejected';
    } else if (normalizedDecision === 'INFO_REQUESTED') {
      newStatus = 'info_requested';
      triageDecisionStatus = 'INFO_REQUESTED';
      logAction = 'info_requested';
    } else {
      return res.status(400).json({
        success: false,
        message: `Invalid decision '${decision}'. Must be APPROVED, REJECTED, or INFO_REQUESTED.`,
      });
    }

    let report = null;
    try {
      report = await BarrierReport.findById(reportId);
    } catch (findErr) {
      console.warn('[dispatchDecision] Report lookup by ID error or non-ObjectId:', findErr.message);
    }

    if (report) {
      report.triageStatus = newStatus;
      report.verificationLog.push({
        action: logAction,
        status: newStatus,
        notes: notes || `Dispatched decision: ${normalizedDecision}`,
        timestamp: new Date(),
      });
      await report.save();

      // Update TriageUrgencyScore decision record
      await TriageUrgencyScore.findOneAndUpdate(
        { reportId: report._id },
        {
          $set: {
            'decision.status': triageDecisionStatus,
            'decision.dispatchedAt': new Date(),
            'decision.allocatedBudgetLKR': normalizedDecision === 'APPROVED' ? Number(allocatedBudgetLKR) : 0,
            'decision.repairTargetDate':
              normalizedDecision === 'APPROVED'
                ? new Date(Date.now() + (Number(repairTargetDays) || 7) * 24 * 3600 * 1000)
                : null,
            'decision.rejectionReasonCode': normalizedDecision === 'REJECTED' ? rejectionReason : null,
            'decision.decisionNotes': notes || '',
          },
        },
        { upsert: false }
      );
    }

    return res.status(200).json({
      success: true,
      message: `Administrative decision '${normalizedDecision}' dispatched successfully`,
      data: {
        reportId,
        decision: normalizedDecision,
        status: newStatus,
        triageDecisionStatus,
        allocatedBudgetLKR: Number(allocatedBudgetLKR),
        rejectionReason,
        dispatchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in dispatchDecision:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to dispatch administrative decision',
      error: error.message,
    });
  }
};

module.exports = {
  getQueue,
  getMetrics,
  getReportDetails,
  recalculateQueue,
  dispatchDecision,
};
