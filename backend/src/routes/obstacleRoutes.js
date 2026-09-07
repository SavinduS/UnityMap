const express = require('express');
const router = express.Router();
const {
  createObstacle,
  getNearbyObstacles,
  getAllObstacles,
  getObstacleById,
  updateObstacle,
  deleteObstacle,
} = require('../controllers/obstacleController');

router.route('/').get(getAllObstacles).post(createObstacle);

router.route('/nearby').get(getNearbyObstacles);

router.route('/:id').get(getObstacleById).put(updateObstacle).delete(deleteObstacle);

module.exports = router;
