import { apiRequest } from './api';

/**
 * Backend API service wrappers for accessibility barrier data & routing.
 */
export const accessibilityService = {
  getAccessibleRoute: async (origin, destination, profile = 'wheelchair') => {
    return apiRequest('/routing/accessible', {
      method: 'POST',
      body: JSON.stringify({ origin, destination, profile }),
    });
  },

  submitBarrierReport: async (reportData) => {
    return apiRequest('/barriers/report', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  },

  getNearbyBarriers: async (latitude, longitude, radiusMeters = 500) => {
    return apiRequest(`/barriers/nearby?lat=${latitude}&lng=${longitude}&radius=${radiusMeters}`);
  },
};

export default accessibilityService;
