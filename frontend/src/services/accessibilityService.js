import {
  apiRequest,
  getNodes,
  getNearbyNodes,
  getObstacles,
  getNearbyObstacles,
  createObstacle,
  getElevators,
  getPathways,
  checkHealth,
} from './api';

/**
 * Backend API service wrappers for accessibility barrier data & routing.
 */
export const accessibilityService = {
  getNodes,
  getNearbyNodes,
  getObstacles,
  getNearbyObstacles,
  createObstacle,
  getElevators,
  getPathways,
  checkHealth,
};

export default accessibilityService;

