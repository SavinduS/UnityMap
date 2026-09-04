const { Node } = require('../models');

/**
 * @desc    Create a new map node
 * @route   POST /api/nodes
 */
exports.createNode = async (req, res) => {
  try {
    const { name, floorLevel, location } = req.body;

    // Validation
    if (!name || !location || !location.coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Name and location coordinates [longitude, latitude] are required.',
      });
    }

    const node = await Node.create({
      name,
      floorLevel: floorLevel !== undefined ? Number(floorLevel) : 0,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
      },
    });

    res.status(201).json({
      success: true,
      data: node,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create node',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all nodes (supports filter by floorLevel)
 * @route   GET /api/nodes
 */
exports.getAllNodes = async (req, res) => {
  try {
    const { floorLevel } = req.query;
    const filter = {};

    if (floorLevel !== undefined) {
      filter.floorLevel = Number(floorLevel);
    }

    const nodes = await Node.find(filter).sort({ floorLevel: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: nodes.length,
      data: nodes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nodes',
      error: error.message,
    });
  }
};

/**
 * @desc    Get a single node by ID
 * @route   GET /api/nodes/:id
 */
exports.getNodeById = async (req, res) => {
  try {
    const node = await Node.findById(req.params.id);

    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Node not found',
      });
    }

    res.status(200).json({
      success: true,
      data: node,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch node',
      error: error.message,
    });
  }
};

/**
 * @desc    Find nodes near coordinates using 2dsphere $near
 * @route   GET /api/nodes/nearby
 */
exports.getNearbyNodes = async (req, res) => {
  try {
    const { lng, lat, maxDistance = 500, floorLevel } = req.query;

    const lngNum = Number(lng);
    const latNum = Number(lat);
    const maxDistanceNum = Number(maxDistance);

    if (!Number.isFinite(lngNum) || !Number.isFinite(latNum)) {
      return res.status(400).json({
        success: false,
        message: 'Query parameters lng (longitude) and lat (latitude) must be valid numbers.',
      });
    }

    if (!Number.isFinite(maxDistanceNum) || maxDistanceNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter maxDistance must be a non-negative number (meters).',
      });
    }

    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lngNum, latNum],
          },
          $maxDistance: maxDistanceNum, // In meters
        },
      },
    };

    if (floorLevel !== undefined) {
      query.floorLevel = Number(floorLevel);
    }

    const nearbyNodes = await Node.find(query);

    res.status(200).json({
      success: true,
      count: nearbyNodes.length,
      data: nearbyNodes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to query nearby nodes',
      error: error.message,
    });
  }
};

/**
 * @desc    Update a node
 * @route   PUT /api/nodes/:id
 */
exports.updateNode = async (req, res) => {
  try {
    const node = await Node.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Node not found',
      });
    }

    res.status(200).json({
      success: true,
      data: node,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update node',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a node
 * @route   DELETE /api/nodes/:id
 */
exports.deleteNode = async (req, res) => {
  try {
    const node = await Node.findByIdAndDelete(req.params.id);

    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Node not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Node deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete node',
      error: error.message,
    });
  }
};
