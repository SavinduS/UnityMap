/**
 * triageRoutes.js
 * Express Routes for Automated Severity Triage Engine
 * 
 * Assigned Member: Savindu
 * Ticket: SPT-111
 */

const express = require('express');
const router = express.Router();
const {
  getQueue,
  getMetrics,
  getReportDetails,
  recalculateQueue,
  dispatchDecision,
} = require('../controllers/triageController');

router.get('/queue', getQueue);
router.get('/metrics', getMetrics);
router.get('/report/:reportId', getReportDetails);
router.post('/recalculate', recalculateQueue);
router.post('/dispatch', dispatchDecision);

module.exports = router;
