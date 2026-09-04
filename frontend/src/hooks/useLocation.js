import { useState, useEffect } from 'react';

/**
 * Custom hook for managing GPS location and coordinates.
 */
export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated location provider
    const timer = setTimeout(() => {
      setLocation({
        latitude: 6.9271,
        longitude: 79.8612,
        accuracy: 5.0,
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return { location, errorMsg, loading };
};

export default useLocation;
