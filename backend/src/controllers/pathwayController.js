const { Pathway, Node } = require('../models');

/**
 * @desc    Create a new pathway connecting two nodes
 * @route   POST /api/pathways
 */
exports.createPathway = async (req, res) => {
  try {
    const {
      startNode,
      endNode,
      distanceMeters,
      inclineDegrees,
      isWheelchairAccessible,
      pathType,
    } = req.body;

    if (!startNode || !endNode || distanceMeters === undefined || !pathType) {
      return res.status(400).json({
        success: false,
        message: 'startNode, endNode, distanceMeters, and pathType are required.',
      });
    }

    // Verify both nodes exist
    const [startExists, endExists] = await Promise.all([
      Node.findById(startNode),
      Node.findById(endNode),
    ]);

    if (!startExists || !endExists) {
      return res.status(404).json({
        success: false,
        message: 'Start node or end node does not exist.',
      });
    }

    const pathway = await Pathway.create({
      startNode,
      endNode,
      distanceMeters,
      inclineDegrees: inclineDegrees !== undefined ? Number(inclineDegrees) : 0,
      isWheelchairAccessible: isWheelchairAccessible !== undefined ? isWheelchairAccessible : true,
      pathType,
    });

    const populatedPathway = await Pathway.findById(pathway._id)
      .populate('startNode', 'name floorLevel location')
      .populate('endNode', 'name floorLevel location');

    res.status(201).json({
      success: true,
      data: populatedPathway,
    });
  } catch (error) {
    // Check for duplicate key error on { startNode, endNode }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A pathway connecting these two nodes already exists.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create pathway',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all pathways (supports filter for wheelchair accessibility & pathType)
 * @route   GET /api/pathways
 */
exports.getAllPathways = async (req, res) => {
  try {
    const { wheelchairAccessible, pathType } = req.query;
    const filter = {};

    if (wheelchairAccessible !== undefined) {
      filter.isWheelchairAccessible = wheelchairAccessible === 'true';
    }

    if (pathType) {
      filter.pathType = pathType;
    }

    const pathways = await Pathway.find(filter)
      .populate('startNode', 'name floorLevel location')
      .populate('endNode', 'name floorLevel location');

    res.status(200).json({
      success: true,
      count: pathways.length,
      data: pathways,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pathways',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single pathway by ID
 * @route   GET /api/pathways/:id
 */
exports.getPathwayById = async (req, res) => {
  try {
    const pathway = await Pathway.findById(req.params.id)
      .populate('startNode', 'name floorLevel location')
      .populate('endNode', 'name floorLevel location');

    if (!pathway) {
      return res.status(404).json({
        success: false,
        message: 'Pathway not found',
      });
    }

    res.status(200).json({
      success: true,
      data: pathway,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pathway',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all pathways connected to a specific node (in or out)
 * @route   GET /api/pathways/node/:nodeId
 */
exports.getPathwaysByNode = async (req, res) => {
  try {
    const { nodeId } = req.params;

    const pathways = await Pathway.find({
      $or: [{ startNode: nodeId }, { endNode: nodeId }],
    })
      .populate('startNode', 'name floorLevel location')
      .populate('endNode', 'name floorLevel location');

    res.status(200).json({
      success: true,
      count: pathways.length,
      data: pathways,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pathways for node',
      error: error.message,
    });
  }
};

/**
 * @desc    Update a pathway
 * @route   PUT /api/pathways/:id
 */
exports.updatePathway = async (req, res) => {
  try {
    const pathway = await Pathway.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('startNode', 'name floorLevel location')
      .populate('endNode', 'name floorLevel location');

    if (!pathway) {
      return res.status(404).json({
        success: false,
        message: 'Pathway not found',
      });
    }

    res.status(200).json({
      success: true,
      data: pathway,
    });
  } catch (error) {
    // Check for duplicate key error on { startNode, endNode }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A pathway connecting these two nodes already exists.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update pathway',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a pathway
 * @route   DELETE /api/pathways/:id
 */
exports.deletePathway = async (req, res) => {
  try {
    const pathway = await Pathway.findByIdAndDelete(req.params.id);

    if (!pathway) {
      return res.status(404).json({
        success: false,
        message: 'Pathway not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pathway deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete pathway',
      error: error.message,
    });
  }
};
