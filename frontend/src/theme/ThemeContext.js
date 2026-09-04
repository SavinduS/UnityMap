import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getPalette, getBorderWidth, palettes } from './tokens';
import { loadHighContrast, saveHighContrast } from './storage';

const ThemeContext = createContext({
  isHighContrast: false,
  setHighContrast: () => {},
  toggleHighContrast: () => {},
  palette: palettes.light,
  borderWidth: 1,
});

export const ThemeProvider = ({ children }) => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    loadHighContrast().then(setIsHighContrast);
  }, []);

  const setHighContrast = useCallback((value) => {
    setIsHighContrast(value);
    saveHighContrast(value);
  }, []);

  const toggleHighContrast = useCallback(() => {
    setIsHighContrast((prev) => {
      const next = !prev;
      saveHighContrast(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isHighContrast,
      setHighContrast,
      toggleHighContrast,
      palette: getPalette(isHighContrast),
      borderWidth: getBorderWidth(isHighContrast),
    }),
    [isHighContrast, setHighContrast, toggleHighContrast]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
