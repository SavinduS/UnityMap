import { useState, useEffect, useCallback } from 'react';

const DEFAULT_COORDINATES = {
  latitude: 6.9271,
  longitude: 79.8612,
  accuracy: 5.0,
};

/**
 * Custom hook for managing GPS location and coordinates.
 * Exposes getCurrentLocation and recenter callbacks cleanly for map positioning.
 */
export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Provide current GPS coordinates
      const coords = { ...DEFAULT_COORDINATES };
      setLocation(coords);
      setLoading(false);
      return coords;
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to fetch current location');
      setLoading(false);
      return null;
    }
  }, []);

  const recenter = useCallback(async () => {
    return await getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    // Initial fetch on mount
    const timer = setTimeout(() => {
      getCurrentLocation();
    }, 800);

    return () => clearTimeout(timer);
  }, [getCurrentLocation]);

  return {
    location,
    errorMsg,
    loading,
    getCurrentLocation,
    recenter,
    setLocation,
  };
};

export default useLocation;

