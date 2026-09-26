/**
 * wardComplianceController.js
 * Express Controller for Ward Accessibility Compliance & Budget Analytics
 * 
 * Dynamically aggregates real barrier reports from MongoDB to reflect genuine
 * compliance scores, category breakdowns, active work orders, and resolution metrics.
 */

const PDFDocument = require('pdfkit');
const { BarrierReport, WardJurisdiction, TriageUrgencyScore } = require('../models');

// Standard Colombo Municipal Council Ward Profile definitions
const WARD_PROFILES = {
  'CMC-W01': {
    wardCode: 'CMC-W01',
    name: 'Fort & Pettah Commercial Hub',
    wardNumber: 1,
    priorityTier: 'CRITICAL',
    allocatedBudgetLKR: 1850000,
    assignedInspector: 'Eng. K. Perera (CMC-882)',
  },
  'CMC-W02': {
    wardCode: 'CMC-W02',
    name: 'Slave Island / Kompannavidiya',
    wardNumber: 2,
    priorityTier: 'HIGH',
    allocatedBudgetLKR: 1200000,
    assignedInspector: 'Insp. M. Fernando (CMC-412)',
  },
  'CMC-W03': {
    wardCode: 'CMC-W03',
    name: 'Kollupitiya Coastal Corridor',
    wardNumber: 3,
    priorityTier: 'MEDIUM',
    allocatedBudgetLKR: 1500000,
    assignedInspector: 'Eng. T. Jayawardena (CMC-605)',
  },
  'CMC-W04': {
    wardCode: 'CMC-W04',
    name: 'Bambalapitiya High Street',
    wardNumber: 4,
    priorityTier: 'HIGH',
    allocatedBudgetLKR: 1400000,
    assignedInspector: 'Insp. S. De Silva (CMC-329)',
  },
  'CMC-W05': {
    wardCode: 'CMC-W05',
    name: 'Cinnamon Gardens Civic Ward',
    wardNumber: 5,
    priorityTier: 'LOW',
    allocatedBudgetLKR: 1100000,
    assignedInspector: 'Eng. K. Perera (CMC-882)',
  },
  'CMC-W06': {
    wardCode: 'CMC-W06',
    name: 'Borella Hospital & Health Belt',
    wardNumber: 6,
    priorityTier: 'CRITICAL',
    allocatedBudgetLKR: 2200000,
    assignedInspector: 'Insp. R. Wickramasinghe (CMC-771)',
  },
};

/**
 * Generate last 5 months trend labels and real report statistics
 */
async function getMonthlyResolutionTrends() {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const trends = [];

  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthLabel = monthNames[d.getMonth()];

    const reported = await BarrierReport.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const resolved = await BarrierReport.countDocuments({
      triageStatus: 'approved',
      updatedAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    trends.push({
      month: monthLabel,
      reported,
      resolved,
    });
  }

  return trends;
}

/**
 * Mean days between a report being raised and it being approved.
 * Measured from real timestamps — returns null when there is nothing to measure,
 * so the UI can show "no data" instead of an invented figure.
 */
async function calculateMeanTimeToRepairDays() {
  const approved = await BarrierReport.find({ triageStatus: 'approved' })
    .select('createdAt updatedAt')
    .lean();

  const durations = approved
    .map((r) => (r.createdAt && r.updatedAt ? (r.updatedAt - r.createdAt) / 86400000 : null))
    .filter((d) => typeof d === 'number' && Number.isFinite(d) && d >= 0);

  if (durations.length === 0) return null;

  const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
  return Math.round(mean * 10) / 10;
}

/**
 * Committed capital spend = the sum of budgets municipal staff actually
 * dispatched on approved repairs. Replaces the previous `resolvedCount * 65000`
 * constant, which ignored every budget entered through the admin portal.
 */
async function getCommittedBudget() {
  const decisions = await TriageUrgencyScore.find({
    'decision.status': 'APPROVED_AND_BUDGETED',
  })
    .select('decision.allocatedBudgetLKR')
    .lean();

  const total = decisions.reduce(
    (acc, d) => acc + (Number(d.decision?.allocatedBudgetLKR) || 0),
    0
  );

  const meanPerRepair = decisions.length > 0 ? Math.round(total / decisions.length) : null;

  return { totalLKR: total, fundedRepairCount: decisions.length, meanPerRepairLKR: meanPerRepair };
}

/**
 * GET /api/admin/compliance/ward/:wardId
 * Retrieve live ward compliance KPIs, budget breakdown, and work order queue from real reports
 */
const getWardCompliance = async (req, res) => {
  try {
    const { wardId = 'CMC-W01' } = req.params;

    // Check if database model exists for custom ward configurations
    let wardData = null;
    try {
      wardData = await WardJurisdiction.findOne({ wardCode: wardId }).lean();
    } catch (_dbErr) {
      // Ignore lookup error and fall back to official CMC profile
    }

    const wardProfile = WARD_PROFILES[wardId] || WARD_PROFILES['CMC-W01'];

    // 1. Calculate live counts from real BarrierReports
    const activeBarrierCount = await BarrierReport.countDocuments({
      triageStatus: { $in: ['pending', 'under_review', 'info_requested'] },
    });

    const resolvedBarrierCount = await BarrierReport.countDocuments({
      triageStatus: 'approved',
    });

    const totalReports = activeBarrierCount + resolvedBarrierCount;
    const complianceScorePercent =
      totalReports > 0
        ? Math.min(100, Math.max(10, Math.round((resolvedBarrierCount / totalReports) * 100)))
        : 100;

    // 2. Category breakdown dynamically aggregated from database
    const categories = ['Ramp', 'Lift', 'Tactile Paving', 'Restroom', 'Other'];
    const categoryBreakdown = await Promise.all(
      categories.map(async (cat) => {
        const activeCount = await BarrierReport.countDocuments({
          category: cat,
          triageStatus: { $in: ['pending', 'under_review', 'info_requested'] },
        });
        const resolvedCount = await BarrierReport.countDocuments({
          category: cat,
          triageStatus: 'approved',
        });
        const catTotal = activeCount + resolvedCount;
        const compliancePercent = catTotal > 0 ? Math.round((resolvedCount / catTotal) * 100) : 100;
        return {
          category: cat,
          compliancePercent,
          activeCount,
          resolvedCount,
        };
      })
    );

    // 3. Active Work Orders: built from real approved reports, joined to the
    //    persisted TriageUrgencyScore decision record. Budget, repair target and
    //    status now come from what the admin actually dispatched — previously
    //    these were hardcoded constants that ignored the entered values.
    const approvedReports = await BarrierReport.find({ triageStatus: 'approved' })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    const decisionRecords = await TriageUrgencyScore.find({
      reportId: { $in: approvedReports.map((r) => r._id) },
    }).lean();
    const decisionByReportId = new Map(decisionRecords.map((d) => [d.reportId.toString(), d]));

    const activeWorkOrders = approvedReports.map((rep) => {
      const repId = rep._id.toString();
      const decision = decisionByReportId.get(repId);
      const allocatedLKR = Number(decision?.decision?.allocatedBudgetLKR) || 0;
      const targetDate = decision?.decision?.repairTargetDate
        ? new Date(decision.decision.repairTargetDate).toISOString().split('T')[0]
        : null;

      return {
        orderId: `WO-${repId.slice(-6).toUpperCase()}`,
        reportId: repId,
        title: rep.name || `${rep.category} Barrier Remediation`,
        category: rep.category,
        contractor: decision?.decision?.contractor || null,
        allocatedLKR,
        status: decision?.decision?.status || 'IN_PROGRESS',
        targetDate,
        dispatchedAt: decision?.decision?.dispatchedAt || null,
      };
    });

    // 4. Budget calculations — committed spend is the sum of real dispatched budgets.
    const allocatedBudgetLKR = wardData?.allocatedBudgetLKR || wardProfile.allocatedBudgetLKR;
    const spentBudgetLKR = activeWorkOrders.reduce((acc, wo) => acc + wo.allocatedLKR, 0);
    const availableBudgetLKR = Math.max(0, allocatedBudgetLKR - spentBudgetLKR);

    // 5. Monthly trends
    const monthlyTrends = await getMonthlyResolutionTrends();

    // 6. Mean time to repair — measured from real approval timestamps.
    const meanTimeToRepairDays = await calculateMeanTimeToRepairDays();

    const responsePayload = {
      wardCode: wardData?.wardCode || wardProfile.wardCode,
      name: wardData?.name || wardProfile.name,
      wardNumber: wardData?.wardNumber || wardProfile.wardNumber,
      priorityTier: wardData?.priorityTier || wardProfile.priorityTier,
      complianceScorePercent: wardData?.complianceScorePercent ?? complianceScorePercent,
      allocatedBudgetLKR,
      spentBudgetLKR,
      availableBudgetLKR,
      activeBarrierCount,
      resolvedBarrierCount,
      meanTimeToRepairDays,
      assignedInspector: wardProfile.assignedInspector,
      categoryBreakdown,
      activeWorkOrders,
      monthlyTrends,
      generatedAt: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      data: responsePayload,
    });
  } catch (error) {
    console.error('Error fetching ward compliance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve ward compliance statistics',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/compliance/audit/:wardId
 * Export official municipal audit compliance report summary
 */
const exportAuditReport = async (req, res) => {
  try {
    const { wardId = 'CMC-W01' } = req.params;
    const wardProfile = WARD_PROFILES[wardId] || WARD_PROFILES['CMC-W01'];

    const activeBarriers = await BarrierReport.countDocuments({
      triageStatus: { $in: ['pending', 'under_review', 'info_requested'] },
    });

    const resolvedBarriers = await BarrierReport.countDocuments({
      triageStatus: 'approved',
    });

    const total = activeBarriers + resolvedBarriers;
    const complianceScorePercent = total > 0 ? Math.round((resolvedBarriers / total) * 100) : 100;

    const committed = await getCommittedBudget();
    const allocatedBudgetLKR = wardProfile.allocatedBudgetLKR;

    return res.status(200).json({
      success: true,
      data: {
        reportReference: `CMC-AUDIT-${wardId}-${Date.now().toString().slice(-6)}`,
        issuingAuthority: 'Colombo Municipal Council — Infrastructure Compliance Division',
        wardCode: wardProfile.wardCode,
        wardName: wardProfile.name,
        complianceScorePercent,
        allocatedBudgetLKR,
        spentBudgetLKR: committed.totalLKR,
        availableBudgetLKR: Math.max(0, allocatedBudgetLKR - committed.totalLKR),
        fundedRepairCount: committed.fundedRepairCount,
        activeBarriers,
        resolvedBarriers,
        auditStatus: complianceScorePercent >= 75 ? 'COMPLIANT' : 'UNDER_SURVEILLANCE',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate audit report',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/compliance/audit/:wardId/pdf
 * Stream generated official council compliance and budget audit PDF document
 */
const downloadAuditReportPdf = async (req, res) => {
  try {
    const { wardId = 'CMC-W01' } = req.params;
    const wardProfile = WARD_PROFILES[wardId] || WARD_PROFILES['CMC-W01'];

    let wardData = null;
    try {
      wardData = await WardJurisdiction.findOne({ wardCode: wardId }).lean();
    } catch (_dbErr) {}

    const activeBarriers = await BarrierReport.countDocuments({
      triageStatus: { $in: ['pending', 'under_review', 'info_requested'] },
    });

    const resolvedBarriers = await BarrierReport.countDocuments({
      triageStatus: 'approved',
    });

    const total = activeBarriers + resolvedBarriers;
    const complianceScorePercent = total > 0 ? Math.round((resolvedBarriers / total) * 100) : 100;

    const allocatedBudgetLKR = wardData?.allocatedBudgetLKR || wardProfile.allocatedBudgetLKR || 1500000;
    const committed = await getCommittedBudget();
    const spentBudgetLKR = committed.totalLKR;
    const availableBudgetLKR = Math.max(0, allocatedBudgetLKR - spentBudgetLKR);
    const meanTimeToRepairDays = await calculateMeanTimeToRepairDays();

    const categories = ['Ramp', 'Lift', 'Tactile Paving', 'Restroom', 'Other'];
    const categoryStats = await Promise.all(
      categories.map(async (cat) => {
        const active = await BarrierReport.countDocuments({
          category: cat,
          triageStatus: { $in: ['pending', 'under_review', 'info_requested'] },
        });
        const resolved = await BarrierReport.countDocuments({
          category: cat,
          triageStatus: 'approved',
        });
        const catTot = active + resolved;
        const pct = catTot > 0 ? Math.round((resolved / catTot) * 100) : 100;
        return { category: cat, active, resolved, total: catTot, pct };
      })
    );

    const auditRef = `CMC-AUDIT-${wardProfile.wardCode}-${Date.now().toString().slice(-6)}`;
    const auditStatus = complianceScorePercent >= 75 ? 'COMPLIANT' : 'UNDER_SURVEILLANCE';
    const reportDate = new Date().toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="CMC_Ward_${wardProfile.wardCode}_Audit_Report.pdf"`
    );

    doc.pipe(res);

    // --- Header Background Accent ---
    doc.rect(40, 40, 515, 60).fill('#0B3D2E');

    // Header Titles
    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold')
      .text('COLOMBO MUNICIPAL COUNCIL', 55, 52, { characterSpacing: 1 });
    doc.fillColor('#A7F3D0').fontSize(9).font('Helvetica')
      .text('URBAN INFRASTRUCTURE & DISABILITY ACCESSIBILITY COMPLIANCE DIVISION', 55, 74, { characterSpacing: 0.5 });
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
      .text('OFFICIAL STATUTORY AUDIT', 410, 55, { align: 'right' });
    doc.fillColor('#A7F3D0').fontSize(8).font('Helvetica')
      .text(`Ref: ${auditRef}`, 410, 70, { align: 'right' });

    // Document Title Banner
    doc.fillColor('#0F172A').fontSize(15).font('Helvetica-Bold')
      .text('WARD ACCESSIBILITY COMPLIANCE & BUDGET AUDIT REPORT', 40, 118, { align: 'center' });
    doc.fillColor('#64748B').fontSize(10).font('Helvetica')
      .text(`Issued for Municipal Standing Committee Review • Date: ${reportDate}`, 40, 138, { align: 'center' });

    doc.moveTo(40, 155).lineTo(555, 155).strokeColor('#E2E8F0').lineWidth(1).stroke();

    // Section 1: Ward & Jurisdiction Metadata Box
    doc.roundedRect(40, 168, 515, 68, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('WARD JURISDICTION PROFILE', 52, 178);

    doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold')
      .text(`${wardProfile.name}`, 52, 195);
    doc.fillColor('#64748B').fontSize(9).font('Helvetica')
      .text(`Ward No: ${wardProfile.wardNumber}  |  Code: ${wardProfile.wardCode}  |  Priority: ${wardProfile.priorityTier}`, 52, 210);

    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('SUPERVISING INSPECTOR', 330, 178);
    doc.fillColor('#0F172A').fontSize(10).font('Helvetica')
      .text(`${wardProfile.assignedInspector}`, 330, 195);
    doc.fillColor('#64748B').fontSize(9).font('Helvetica')
      .text(`Classification: ${auditStatus}`, 330, 210);

    // Section 2: Key Scorecards Row
    // Box 1: Compliance Index
    doc.roundedRect(40, 250, 165, 82, 6).fillAndStroke('#ECFDF5', '#A7F3D0');
    doc.fillColor('#047857').fontSize(9).font('Helvetica-Bold').text('COMPLIANCE INDEX', 52, 260);
    doc.fillColor('#0B3D2E').fontSize(26).font('Helvetica-Bold').text(`${complianceScorePercent}%`, 52, 276);
    doc.fillColor('#065F46').fontSize(8).font('Helvetica')
      .text(complianceScorePercent >= 75 ? 'Target Met (Standard >= 75%)' : 'Below Municipal Target', 52, 312);

    // Box 2: Defect Resolution
    doc.roundedRect(215, 250, 165, 82, 6).fillAndStroke('#F0FDF4', '#BBF7D0');
    doc.fillColor('#166534').fontSize(9).font('Helvetica-Bold').text('RECTIFIED DEFECTS', 227, 260);
    doc.fillColor('#15803D').fontSize(26).font('Helvetica-Bold').text(`${resolvedBarriers}`, 227, 276);
    doc.fillColor('#166534').fontSize(8).font('Helvetica')
      .text(`Out of ${total} Total Reports (${activeBarriers} Active)`, 227, 312);

    // Box 3: Available Budget
    doc.roundedRect(390, 250, 165, 82, 6).fillAndStroke('#ECFDF5', '#A7F3D0');
    doc.fillColor('#064E3B').fontSize(9).font('Helvetica-Bold').text('REMAINING BUDGET', 402, 260);
    doc.fillColor('#047857').fontSize(18).font('Helvetica-Bold').text(`LKR ${availableBudgetLKR.toLocaleString()}`, 402, 280);
    doc.fillColor('#064E3B').fontSize(8).font('Helvetica')
      .text(`Allocated: LKR ${allocatedBudgetLKR.toLocaleString()}`, 402, 312);

    // Section 3: Financial & Capital Works Breakdown
    doc.fillColor('#0B3D2E').fontSize(12).font('Helvetica-Bold').text('1. MUNICIPAL BUDGET & CAPITAL EXPENDITURE', 40, 350);

    // Table Header
    doc.rect(40, 368, 515, 20).fill('#F1F5F9');
    doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
    doc.text('BUDGET COMPONENT', 50, 373);
    doc.text('ALLOCATION (LKR)', 260, 373);
    doc.text('UTILIZATION RATE', 420, 373);

    // Table Rows
    const budgetRows = [
      ['Ward Annual Accessibility Capital Grant', `LKR ${allocatedBudgetLKR.toLocaleString()}`, '100% Granted'],
      ['Committed Remediations & Contractor POs', `LKR ${spentBudgetLKR.toLocaleString()}`, `${allocatedBudgetLKR > 0 ? Math.round((spentBudgetLKR / allocatedBudgetLKR) * 100) : 0}% Utilized`],
      ['Remaining Ward Fiscal Balance', `LKR ${availableBudgetLKR.toLocaleString()}`, `${allocatedBudgetLKR > 0 ? Math.round((availableBudgetLKR / allocatedBudgetLKR) * 100) : 0}% Available`],
      ['Average Remediation Cost Per Funded Repair',
        committed.meanPerRepairLKR != null ? `LKR ${committed.meanPerRepairLKR.toLocaleString()}` : 'No funded repairs',
        committed.fundedRepairCount > 0 ? `${committed.fundedRepairCount} funded repair(s)` : 'Awaiting first dispatch'],
    ];

    let rowY = 392;
    budgetRows.forEach(([desc, val, note], idx) => {
      if (idx % 2 === 1) {
        doc.rect(40, rowY - 4, 515, 18).fill('#F8FAFC');
      }
      doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica').text(desc, 50, rowY);
      doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(val, 260, rowY);
      doc.fillColor('#475569').fontSize(8).font('Helvetica').text(note, 420, rowY);
      rowY += 20;
    });

    // Section 4: Category Remediation Breakdown
    doc.fillColor('#0B3D2E').fontSize(12).font('Helvetica-Bold').text('2. INFRASTRUCTURE DEFECT AUDIT BY CATEGORY', 40, rowY + 12);

    rowY += 32;
    doc.rect(40, rowY, 515, 20).fill('#F1F5F9');
    doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
    doc.text('INFRASTRUCTURE ASSET', 50, rowY + 5);
    doc.text('ACTIVE PENDING', 220, rowY + 5);
    doc.text('RECTIFIED', 330, rowY + 5);
    doc.text('COMPLIANCE RATE', 440, rowY + 5);

    rowY += 24;
    categoryStats.forEach((cat, idx) => {
      if (idx % 2 === 1) {
        doc.rect(40, rowY - 4, 515, 18).fill('#F8FAFC');
      }
      doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(cat.category, 50, rowY);
      doc.fillColor('#DC2626').fontSize(8.5).font('Helvetica').text(`${cat.active} defects`, 220, rowY);
      doc.fillColor('#16A34A').fontSize(8.5).font('Helvetica').text(`${cat.resolved} verified`, 330, rowY);
      doc.fillColor('#0B3D2E').fontSize(8.5).font('Helvetica-Bold').text(`${cat.pct}%`, 440, rowY);
      rowY += 20;
    });

    // Section 5: Official Statutory Certification & Signatures
    rowY += 20;
    doc.moveTo(40, rowY).lineTo(555, rowY).strokeColor('#E2E8F0').lineWidth(1).stroke();
    rowY += 12;

    doc.fillColor('#0B3D2E').fontSize(11).font('Helvetica-Bold').text('3. STATUTORY ENDORSEMENTS & AUDIT SIGN-OFF', 40, rowY);
    rowY += 16;
    doc.fillColor('#475569').fontSize(8).font('Helvetica')
      .text('This document constitutes an official accessibility compliance verification generated from live municipal barrier-report records. Certified for official submission to the Municipal Commissioner and City Council Executive Committee.', 40, rowY, { width: 515, lineGap: 2 });

    rowY += 45;
    // Signatures — attributed to the officer who actually generated the report.
    const issuer = req.user
      ? { name: req.user.name, badge: req.user.badgeNumber || req.user.staffId, dept: req.user.department }
      : null;

    doc.moveTo(50, rowY).lineTo(220, rowY).strokeColor('#64748B').lineWidth(0.8).stroke();
    if (issuer) {
      doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(issuer.name, 50, rowY + 6);
      doc.fillColor('#64748B').fontSize(8).font('Helvetica')
        .text(`${issuer.badge}\n${issuer.dept}`, 50, rowY + 18);
    } else {
      doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text('_______________________', 50, rowY + 6);
      doc.fillColor('#64748B').fontSize(8).font('Helvetica').text('Authorised Municipal Officer\nBadge / Staff ID', 50, rowY + 18);
    }

    doc.moveTo(350, rowY).lineTo(520, rowY).strokeColor('#64748B').lineWidth(0.8).stroke();
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text('Municipal Commissioner', 350, rowY + 6);
    doc.fillColor('#64748B').fontSize(8).font('Helvetica').text('Colombo Municipal Council\nExecutive Office, Town Hall', 350, rowY + 18);

    // Footer — pinned above the bottom margin. Writing at y=800 sat past the 40pt
    // margin on A4 (841.89pt tall), which auto-paginated and produced a blank page 2.
    const footerY = doc.page.height - 62;
    if (rowY + 30 > footerY) {
      doc.addPage();
    }
    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
      .text(`UnityMap Municipal Platform • ${auditRef} • Generated on ${new Date().toISOString()}`, 40, footerY, { align: 'center', width: 515, lineBreak: false });

    doc.end();
  } catch (error) {
    console.error('Error generating audit PDF:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate audit report PDF',
        error: error.message,
      });
    }
  }
};

module.exports = {
  getWardCompliance,
  exportAuditReport,
  downloadAuditReportPdf,
};
