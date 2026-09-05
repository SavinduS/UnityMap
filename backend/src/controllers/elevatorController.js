const { ElevatorStatusLog, Node } = require('../models');

/**
 * @desc    Log a new elevator operational status update
 * @route   POST /api/elevators/status
 */
exports.logStatus = async (req, res) => {
  try {
    const { elevatorId, associatedNode, status, loggedAt } = req.body;

    if (!elevatorId || !associatedNode || !status) {
      return res.status(400).json({
        success: false,
        message: 'elevatorId, associatedNode, and status are required.',
      });
    }

    const nodeExists = await Node.findById(associatedNode);
    if (!nodeExists) {
      return res.status(404).json({
        success: false,
        message: 'Associated node does not exist.',
      });
    }

    const logEntry = await ElevatorStatusLog.create({
      elevatorId: elevatorId.trim(),
      associatedNode,
      status,
      loggedAt: loggedAt || Date.now(),
    });

    const populatedLog = await ElevatorStatusLog.findById(logEntry._id).populate(
      'associatedNode',
      'name floorLevel location'
    );

    res.status(201).json({
      success: true,
      data: populatedLog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to log elevator status',
      error: error.message,
    });
  }
};

/**
 * @desc    Get the latest operational status for a specific elevator
 * @route   GET /api/elevators/:elevatorId/latest
 */
exports.getLatestStatus = async (req, res) => {
  try {
    const { elevatorId } = req.params;

    const latestLog = await ElevatorStatusLog.findOne({ elevatorId })
      .sort({ loggedAt: -1 })
      .populate('associatedNode', 'name floorLevel location');

    if (!latestLog) {
      return res.status(404).json({
        success: false,
        message: `No status logs found for elevator ${elevatorId}`,
      });
    }

    res.status(200).json({
      success: true,
      data: latestLog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest elevator status',
      error: error.message,
    });
  }
};

/**
 * @desc    Get status logs history for an elevator
 * @route   GET /api/elevators/:elevatorId/logs
 */
exports.getElevatorHistory = async (req, res) => {
  try {
    const { elevatorId } = req.params;
    const { limit = 20 } = req.query;

    const logs = await ElevatorStatusLog.find({ elevatorId })
      .sort({ loggedAt: -1 })
      .limit(Number(limit))
      .populate('associatedNode', 'name floorLevel location');

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch elevator logs',
      error: error.message,
    });
  }
};

/**
 * @desc    Get the latest status of all distinct elevators
 * @route   GET /api/elevators/overview
 */
exports.getAllElevatorsOverview = async (req, res) => {
  try {
    const latestStatuses = await ElevatorStatusLog.aggregate([
      { $sort: { loggedAt: -1 } },
      {
        $group: {
          _id: '$elevatorId',
          latestLogId: { $first: '$_id' },
          status: { $first: '$status' },
          associatedNode: { $first: '$associatedNode' },
          loggedAt: { $first: '$loggedAt' },
        },
      },
      {
        $lookup: {
          from: 'nodes',
          localField: 'associatedNode',
          foreignField: '_id',
          as: 'nodeDetails',
        },
      },
      { $unwind: { path: '$nodeDetails', preserveNullAndEmptyArrays: true } },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      count: latestStatuses.length,
      data: latestStatuses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch elevators overview',
      error: error.message,
    });
  }
};
