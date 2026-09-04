import React from 'react';
import { StatusBar } from 'expo-status-bar';
import UnityMapScreen from './src/screens/wheelchair/UnityMapScreen';
import { ThemeProvider } from './src/theme/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <StatusBar style="light" />
      <UnityMapScreen />
    </ThemeProvider>
  );
}
