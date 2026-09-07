const express = require('express');
const router = express.Router();
const {
  createPathway,
  getAllPathways,
  getPathwayById,
  getPathwaysByNode,
  updatePathway,
  deletePathway,
  getWheelchairRoute,
} = require('../controllers/pathwayController');

router.route('/').get(getAllPathways).post(createPathway);

// SPT-102 — must be declared BEFORE /:id so Express doesn't treat "route" as an id param
router.route('/route').get(getWheelchairRoute);

router.route('/node/:nodeId').get(getPathwaysByNode);

router.route('/:id').get(getPathwayById).put(updatePathway).delete(deletePathway);

module.exports = router;
