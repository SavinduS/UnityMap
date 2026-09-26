/**
 * triageController.js
 * Express Controller for Automated Severity Triage Queue & Urgency Calculation
 * 
 * Assigned Member: Savindu
 * Ticket: SPT-111
 */

const mongoose = require('mongoose');
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

    if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(404).json({
        success: false,
        message: `Barrier report with ID ${reportId} not found`,
      });
    }

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

    // Persist the recomputed urgency so the recalculation is a real write,
    // not just a re-read of the same in-memory computation.
    const reports = await BarrierReport.find({
      _id: { $in: queue.reports.map((r) => r._id).filter(Boolean) },
    });

    let persisted = 0;
    for (const report of reports) {
      const metrics = calculateUrgencyIndex(report.toObject(), wardId);
      if (!metrics) continue;

      await TriageUrgencyScore.findOneAndUpdate(
        { reportId: report._id },
        {
          $set: {
            wardId,
            urgencyIndex: metrics.urgencyIndex,
            priorityBadge: metrics.priorityBadge,
            'formulaFactors.barrierSeverityWeight': Number(metrics.formulaFactors?.barrierSeverityWeight) || 1,
            'formulaFactors.corroborationCount': Number(metrics.formulaFactors?.corroborationCount) || 0,
            'formulaFactors.reportAgeDays': Number(metrics.formulaFactors?.reportAgeDays) || 0,
            'formulaFactors.vitalCorridorMultiplier': Number(metrics.formulaFactors?.vitalCorridorMultiplier) || 1,
            lastCalculatedAt: new Date(),
          },
          $setOnInsert: { reportId: report._id },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
      persisted += 1;
    }

    return res.status(200).json({
      success: true,
      message: `Urgency index recalculated and persisted for ${persisted} pending report(s) in ward ${wardId}`,
      data: {
        wardId,
        totalReports: queue.totalReports,
        recalculated: persisted,
        recalculatedAt: new Date().toISOString(),
      },
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
      wardId = 'CMC-W01',
      repairTargetDays = 7,
    } = req.body;

    if (!reportId || !decision) {
      return res.status(400).json({
        success: false,
        message: 'reportId and decision are required for administrative dispatch',
      });
    }

    // The signed-in officer is the actor of record — never a client-supplied id.
    const actor = req.user || null;
    const dispatchedBy = actor ? actor._id : null;

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

    if (normalizedDecision === 'REJECTED' && rejectionReason) {
      const VALID_REJECTION_CODES = [
        'DUPLICATE_REPORT',
        'OUTSIDE_MUNICIPAL_BOUNDARY',
        'TEMPORARY_EVENT_PERMIT',
        'INSUFFICIENT_EVIDENCE',
        'PRIVATE_PROPERTY_ACCESS',
      ];
      if (!VALID_REJECTION_CODES.includes(rejectionReason)) {
        return res.status(400).json({
          success: false,
          message: `Invalid rejection reason code '${rejectionReason}'.`,
        });
      }
    }

    if (normalizedDecision === 'APPROVED' && (!Number.isFinite(Number(allocatedBudgetLKR)) || Number(allocatedBudgetLKR) < 0)) {
      return res.status(400).json({
        success: false,
        message: 'An approved repair requires a non-negative allocated budget.',
      });
    }

    let report = null;
    try {
      report = await BarrierReport.findById(reportId);
    } catch (findErr) {
      console.warn('[dispatchDecision] Report lookup by ID error or non-ObjectId:', findErr.message);
    }

    if (!report) {
      return res.status(404).json({ success: false, message: 'Barrier report not found' });
    }

    const budget = normalizedDecision === 'APPROVED' ? Number(allocatedBudgetLKR) : 0;
    const targetDays = Number(repairTargetDays) > 0 ? Number(repairTargetDays) : 7;
    const repairTargetDate = new Date(Date.now() + targetDays * 24 * 3600 * 1000);

    const decisionSummary =
      normalizedDecision === 'APPROVED'
        ? `Approved — LKR ${budget.toLocaleString()} allocated, ${targetDays}-day repair target`
        : normalizedDecision === 'REJECTED'
          ? `Rejected — ${rejectionReason || 'no reason code supplied'}`
          : 'Further information requested from contributor';

    report.triageStatus = newStatus;
    report.verificationLog.push({
      action: logAction,
      status: newStatus,
      notes: [notes, decisionSummary].filter(Boolean).join(' — '),
      timestamp: new Date(),
    });
    await report.save();

    // Persist the decision record. Previously this used upsert:false against a
    // collection nothing ever wrote to, so the admin's budget and repair target
    // were silently discarded. The full score document is now upserted because
    // TriageUrgencyScore requires urgencyIndex/priorityBadge/wardId.
    const triageMetrics = calculateUrgencyIndex(report.toObject(), wardId);
    const severityWeight = Number(triageMetrics?.formulaFactors?.barrierSeverityWeight) || 1;

    await TriageUrgencyScore.findOneAndUpdate(
      { reportId: report._id },
      {
        $set: {
          wardId,
          urgencyIndex: triageMetrics?.urgencyIndex ?? 0,
          priorityBadge: triageMetrics?.priorityBadge || 'LOW',
          'formulaFactors.barrierSeverityWeight': severityWeight,
          'formulaFactors.corroborationCount':
            triageMetrics?.formulaFactors?.corroborationCount ?? report.corroborationCount ?? 0,
          'formulaFactors.reportAgeDays': triageMetrics?.formulaFactors?.reportAgeDays ?? 0,
          'formulaFactors.vitalCorridorMultiplier':
            triageMetrics?.formulaFactors?.vitalCorridorMultiplier ?? 1,
          lastCalculatedAt: new Date(),
          'decision.status': triageDecisionStatus,
          'decision.dispatchedBy': dispatchedBy,
          'decision.dispatchedAt': new Date(),
          'decision.allocatedBudgetLKR': budget,
          'decision.repairTargetDate': normalizedDecision === 'APPROVED' ? repairTargetDate : null,
          'decision.rejectionReasonCode': normalizedDecision === 'REJECTED' ? rejectionReason : null,
          'decision.decisionNotes': notes || '',
        },
        $setOnInsert: { reportId: report._id },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: `Administrative decision '${normalizedDecision}' dispatched successfully`,
      data: {
        reportId: report._id.toString(),
        decision: normalizedDecision,
        status: newStatus,
        triageDecisionStatus,
        allocatedBudgetLKR: budget,
        repairTargetDays: targetDays,
        repairTargetDate: normalizedDecision === 'APPROVED' ? repairTargetDate.toISOString() : null,
        rejectionReason,
        dispatchedBy: dispatchedBy ? dispatchedBy.toString() : null,
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
