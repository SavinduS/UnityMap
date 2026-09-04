const { ObstacleMarker } = require('../models');

/**
 * @desc    Create a new obstacle marker
 * @route   POST /api/obstacles
 */
exports.createObstacle = async (req, res) => {
  try {
    const { title, obstacleType, location, isActive, reportedBy } = req.body;

    if (!title || !obstacleType || !location || !location.coordinates) {
      return res.status(400).json({
        success: false,
        message: 'title, obstacleType, and location.coordinates [lng, lat] are required.',
      });
    }

    const obstacle = await ObstacleMarker.create({
      title,
      obstacleType,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
      },
      isActive: isActive !== undefined ? isActive : true,
      reportedBy: reportedBy || undefined,
    });

    res.status(201).json({
      success: true,
      data: obstacle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create obstacle',
      error: error.message,
    });
  }
};

/**
 * @desc    Get active obstacles near coordinates using $near 2dsphere
 * @route   GET /api/obstacles/nearby
 */
exports.getNearbyObstacles = async (req, res) => {
  try {
    const { lng, lat, maxDistance = 500, obstacleType } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({
        success: false,
        message: 'Query parameters lng (longitude) and lat (latitude) are required.',
      });
    }

    const query = {
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: Number(maxDistance),
        },
      },
    };

    if (obstacleType) {
      query.obstacleType = obstacleType;
    }

    const obstacles = await ObstacleMarker.find(query);

    res.status(200).json({
      success: true,
      count: obstacles.length,
      data: obstacles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to query nearby obstacles',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all obstacles (optional filter by isActive & obstacleType)
 * @route   GET /api/obstacles
 */
exports.getAllObstacles = async (req, res) => {
  try {
    const { isActive, obstacleType } = req.query;
    const filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (obstacleType) {
      filter.obstacleType = obstacleType;
    }

    const obstacles = await ObstacleMarker.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: obstacles.length,
      data: obstacles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch obstacles',
      error: error.message,
    });
  }
};

/**
 * @desc    Get obstacle by ID
 * @route   GET /api/obstacles/:id
 */
exports.getObstacleById = async (req, res) => {
  try {
    const obstacle = await ObstacleMarker.findById(req.params.id);

    if (!obstacle) {
      return res.status(404).json({
        success: false,
        message: 'Obstacle not found',
      });
    }

    res.status(200).json({
      success: true,
      data: obstacle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch obstacle',
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle or update obstacle active status / details
 * @route   PUT /api/obstacles/:id
 */
exports.updateObstacle = async (req, res) => {
  try {
    const obstacle = await ObstacleMarker.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!obstacle) {
      return res.status(404).json({
        success: false,
        message: 'Obstacle not found',
      });
    }

    res.status(200).json({
      success: true,
      data: obstacle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update obstacle',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete obstacle
 * @route   DELETE /api/obstacles/:id
 */
exports.deleteObstacle = async (req, res) => {
  try {
    const obstacle = await ObstacleMarker.findByIdAndDelete(req.params.id);

    if (!obstacle) {
      return res.status(404).json({
        success: false,
        message: 'Obstacle not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Obstacle deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete obstacle',
      error: error.message,
    });
  }
};
