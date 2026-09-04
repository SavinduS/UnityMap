const express = require('express');
const router = express.Router();

const nodeRoutes = require('./nodeRoutes');
const pathwayRoutes = require('./pathwayRoutes');
const elevatorRoutes = require('./elevatorRoutes');
const obstacleRoutes = require('./obstacleRoutes');

router.use('/nodes', nodeRoutes);
router.use('/pathways', pathwayRoutes);
router.use('/elevators', elevatorRoutes);
router.use('/obstacles', obstacleRoutes);

module.exports = router;
