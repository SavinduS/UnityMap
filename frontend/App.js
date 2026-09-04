import React from 'react';
import { StatusBar } from 'expo-status-bar';
import UnityMapScreen from './src/screens/wheelchair/UnityMapScreen';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <UnityMapScreen />
    </>
  );
}
