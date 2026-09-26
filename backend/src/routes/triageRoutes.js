/**
 * triageRoutes.js
 * Express Routes for Automated Severity Triage Engine
 * 
 * Assigned Member: Savindu
 * Ticket: SPT-111
 */

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getQueue,
  getMetrics,
  getReportDetails,
  recalculateQueue,
  dispatchDecision,
} = require('../controllers/triageController');

// Every triage endpoint exposes municipal caseloads and decision authority.
router.get('/queue', protect, adminOnly, getQueue);
router.get('/metrics', protect, adminOnly, getMetrics);
router.get('/report/:reportId', protect, adminOnly, getReportDetails);
router.post('/recalculate', protect, adminOnly, recalculateQueue);
router.post('/dispatch', protect, adminOnly, dispatchDecision);

module.exports = router;
