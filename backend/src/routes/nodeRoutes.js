const express = require('express');
const router = express.Router();
const {
  createNode,
  getAllNodes,
  getNodeById,
  getNearbyNodes,
  updateNode,
  deleteNode,
} = require('../controllers/nodeController');

router.route('/').get(getAllNodes).post(createNode);

router.route('/nearby').get(getNearbyNodes);

router.route('/:id').get(getNodeById).put(updateNode).delete(deleteNode);

module.exports = router;
