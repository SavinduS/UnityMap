import React from 'react';
import UnityMapScreen from './UnityMapScreen';

/**
 * OSM Map Canvas Screen
 * Delegates to UnityMapScreen which renders the full
 * react-native-maps + OpenStreetMap interactive map.
 */
export const OSMCanvasScreen = () => <UnityMapScreen />;

export default OSMCanvasScreen;
