const express = require('express');
const router = express.Router();
const {
  logStatus,
  getLatestStatus,
  getElevatorHistory,
  getAllElevatorsOverview,
} = require('../controllers/elevatorController');

router.route('/status').post(logStatus);

router.route('/overview').get(getAllElevatorsOverview);

router.route('/:elevatorId/latest').get(getLatestStatus);

router.route('/:elevatorId/logs').get(getElevatorHistory);

module.exports = router;
