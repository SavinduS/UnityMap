const express = require('express');
const router = express.Router();

const nodeRoutes = require('./nodeRoutes');
const pathwayRoutes = require('./pathwayRoutes');
const elevatorRoutes = require('./elevatorRoutes');
const obstacleRoutes = require('./obstacleRoutes');
const adminAuthRoutes = require('./adminAuthRoutes');
const triageRoutes = require('./triageRoutes');

router.use('/nodes', nodeRoutes);
router.use('/pathways', pathwayRoutes);
router.use('/elevators', elevatorRoutes);
router.use('/obstacles', obstacleRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin/triage', triageRoutes);

module.exports = router;
