/**
 * wardComplianceRoutes.js
 * Express Routes for Ward Accessibility Compliance & Budget Analytics
 * 
 * Assigned Member: Savindu
 * Ticket: SPT-209
 */

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getWardCompliance,
  exportAuditReport,
  downloadAuditReportPdf,
} = require('../controllers/wardComplianceController');

// Ward budgets and the statutory audit document are privileged records.
router.get('/ward/:wardId', protect, adminOnly, getWardCompliance);
router.get('/audit/:wardId', protect, adminOnly, exportAuditReport);
router.get('/audit/:wardId/pdf', protect, adminOnly, downloadAuditReportPdf);
router.get('/audit/:wardId/download', protect, adminOnly, downloadAuditReportPdf);

module.exports = router;
