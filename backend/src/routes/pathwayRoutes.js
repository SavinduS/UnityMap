const express = require('express');
const router = express.Router();
const {
  createPathway,
  getAllPathways,
  getPathwayById,
  getPathwaysByNode,
  updatePathway,
  deletePathway,
} = require('../controllers/pathwayController');

router.route('/').get(getAllPathways).post(createPathway);

router.route('/node/:nodeId').get(getPathwaysByNode);

router.route('/:id').get(getPathwayById).put(updatePathway).delete(deletePathway);

module.exports = router;
