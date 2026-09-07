/**
 * wardComplianceRoutes.js
 * Express Routes for Ward Accessibility Compliance & Budget Analytics
 * 
 * Assigned Member: Savindu
 * Ticket: SPT-209
 */

const express = require('express');
const router = express.Router();
const {
  getWardCompliance,
  exportAuditReport,
} = require('../controllers/wardComplianceController');

router.get('/ward/:wardId', getWardCompliance);
router.get('/audit/:wardId', exportAuditReport);

module.exports = router;
