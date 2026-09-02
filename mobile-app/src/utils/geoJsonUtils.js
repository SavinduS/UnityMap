/**
 * Utilities for formatting and converting accessibility features into GeoJSON.
 */

export const createBarrierFeature = (id, type, latitude, longitude, properties = {}) => {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    properties: {
      barrierType: type,
      reportedAt: new Date().toISOString(),
      ...properties,
    },
  };
};

export default { createBarrierFeature };
