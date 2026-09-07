const { Pathway, Node, ElevatorStatusLog } = require('../models');

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

/**
 * @desc    Compute a step-free / wheelchair-accessible route between two nodes.
 *          Uses Dijkstra's algorithm on a graph filtered for wheelchair constraints
 *          when wheelchairAccessible=true is passed as a query param.
 *
 * SPT-102  Incline & Step-Free Route Filtering Engine
 *
 * @route   GET /api/pathways/route
 * @query   originNodeId         {string}  MongoDB ObjectId of the start node  (required)
 * @query   destinationNodeId    {string}  MongoDB ObjectId of the end node    (required)
 * @query   wheelchairAccessible {string}  'true' | 'false'  (optional, default 'false')
 */
exports.getWheelchairRoute = async (req, res) => {
  try {
    const { originNodeId, destinationNodeId, wheelchairAccessible } = req.query;
    const filterWheelchair = wheelchairAccessible === 'true';

    /* ── 0. Basic param validation ────────────────────────────────────────── */
    if (!originNodeId || !destinationNodeId) {
      return res.status(400).json({
        success: false,
        message: 'originNodeId and destinationNodeId are required query parameters.',
      });
    }

    // Validate that both IDs are valid MongoDB ObjectId hex strings (24-char hex)
    const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);
    if (!isValidObjectId(originNodeId) || !isValidObjectId(destinationNodeId)) {
      return res.status(400).json({
        success: false,
        message: 'originNodeId and destinationNodeId must be valid 24-character MongoDB ObjectIds.',
      });
    }

    /* ── 1. Verify origin & destination nodes exist ───────────────────────── */
    const [originNode, destinationNode] = await Promise.all([
      Node.findById(originNodeId),
      Node.findById(destinationNodeId),
    ]);

    if (!originNode) {
      return res.status(404).json({
        success: false,
        message: `Origin node '${originNodeId}' not found.`,
      });
    }
    if (!destinationNode) {
      return res.status(404).json({
        success: false,
        message: `Destination node '${destinationNodeId}' not found.`,
      });
    }

    /* ── 2. Build pathway filter ──────────────────────────────────────────── */
    const pathwayFilter = {};

    if (filterWheelchair) {
      // Exclude any edge that:
      //   (a) has absolute incline > 8 degrees
      //   (b) is a 'stairs' pathway
      //   (c) is explicitly marked not wheelchair accessible
      pathwayFilter.$and = [
        { pathType: { $ne: 'stairs' } },
        { inclineDegrees: { $gte: -8, $lte: 8 } },
        { isWheelchairAccessible: true },
      ];
    }

    /* ── 3. Fetch broken-elevator node IDs (wheelchair mode only) ─────────── */
    let brokenElevatorNodeIds = new Set();

    if (filterWheelchair) {
      // Aggregate: get the most-recent status per elevator, keep those NOT operational
      const brokenLogs = await ElevatorStatusLog.aggregate([
        { $sort: { elevatorId: 1, loggedAt: -1 } },
        {
          $group: {
            _id: '$elevatorId',
            latestStatus: { $first: '$status' },
            associatedNode: { $first: '$associatedNode' },
          },
        },
        { $match: { latestStatus: { $ne: 'operational' } } },
      ]);

      brokenElevatorNodeIds = new Set(
        brokenLogs.map((l) => l.associatedNode?.toString()).filter(Boolean)
      );
    }

    /* ── 4. Fetch qualifying pathways (populated) ────────────────────────── */
    const pathways = await Pathway.find(pathwayFilter)
      .populate('startNode', 'name floorLevel location')
      .populate('endNode', 'name floorLevel location')
      .lean();

    /* ── 5. Build undirected adjacency graph ─────────────────────────────── */
    const graph = {};

    const addEdge = (from, to, dist) => {
      if (!graph[from]) graph[from] = [];
      graph[from].push({ neighbourId: to, distance: dist });
    };

    for (const pw of pathways) {
      if (!pw.startNode || !pw.endNode) continue;
      const sId = pw.startNode._id.toString();
      const eId = pw.endNode._id.toString();

      // Drop edges touching broken elevator nodes in wheelchair mode
      if (filterWheelchair && (brokenElevatorNodeIds.has(sId) || brokenElevatorNodeIds.has(eId))) {
        continue;
      }

      addEdge(sId, eId, pw.distanceMeters);
      addEdge(eId, sId, pw.distanceMeters); // undirected
    }

    /* ── 6. Dijkstra's algorithm ─────────────────────────────────────────── */
    const origin = originNodeId.toString();
    const destination = destinationNodeId.toString();

    const dist = {};
    const prev = {};
    const visited = new Set();
    const unvisited = new Set([...Object.keys(graph), origin, destination]);

    for (const id of unvisited) dist[id] = Infinity;
    dist[origin] = 0;

    while (unvisited.size > 0) {
      // Select node with the smallest tentative distance
      let current = null;
      let smallest = Infinity;
      for (const id of unvisited) {
        if (dist[id] < smallest) {
          smallest = dist[id];
          current = id;
        }
      }

      if (current === null || dist[current] === Infinity) break;
      if (current === destination) break;

      unvisited.delete(current);
      visited.add(current);

      for (const { neighbourId, distance } of graph[current] || []) {
        if (visited.has(neighbourId)) continue;
        const alt = dist[current] + distance;
        if (alt < (dist[neighbourId] ?? Infinity)) {
          dist[neighbourId] = alt;
          prev[neighbourId] = current;
          unvisited.add(neighbourId);
        }
      }
    }

    /* ── 7. Reconstruct & validate path ─────────────────────────────────── */
    if (!dist[destination] || dist[destination] === Infinity) {
      return res.status(404).json({
        success: false,
        message: filterWheelchair
          ? 'No step-free, wheelchair-accessible route exists between the selected nodes. ' +
            'All connecting paths may include stairs, steep inclines (>8°), or depend on ' +
            'out-of-service elevators.'
          : 'No route exists between the selected nodes.',
      });
    }

    const pathNodeIds = [];
    let cursor = destination;
    while (cursor !== undefined) {
      pathNodeIds.unshift(cursor);
      cursor = prev[cursor];
    }

    // Fetch full node documents in path order
    const pathNodes = await Node.find({ _id: { $in: pathNodeIds } }).lean();
    const nodeMap = {};
    for (const n of pathNodes) nodeMap[n._id.toString()] = n;
    const orderedPath = pathNodeIds.map((id) => nodeMap[id]).filter(Boolean);

    /* ── 8. Respond ──────────────────────────────────────────────────────── */
    return res.status(200).json({
      success: true,
      data: {
        path: orderedPath,
        totalDistanceMeters: Math.round(dist[destination] * 10) / 10,
        segmentCount: orderedPath.length - 1,
        isWheelchairFiltered: filterWheelchair,
        originNode: { id: originNode._id, name: originNode.name },
        destinationNode: { id: destinationNode._id, name: destinationNode.name },
      },
    });
  } catch (error) {
    console.error('[getWheelchairRoute] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Route computation failed.',
      error: error.message,
    });
  }
};
