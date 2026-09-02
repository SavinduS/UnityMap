/**
 * Utility functions for parsing image EXIF data and extracting GPS metadata.
 */

export const parseExifData = (imageUri) => {
  // Placeholder parser for geotagged photo EXIF data
  return {
    latitude: 6.9271,
    longitude: 79.8612,
    timestamp: new Date().toISOString(),
    altitude: 12.5,
  };
};

export default { parseExifData };
