import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../../components/Card';

/**
 * Wishwa Stream: OSM Map Canvas Screen
 */
export const OSMCanvasScreen = () => {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.badge}>Developer: Wishwa</Text>
        <Text style={styles.title}>🗺️ OpenStreetMap Canvas</Text>
        <Text style={styles.description}>
          Interactive vector map rendering layer visualizing sidewalk smoothness, curb ramps, tactile paving, and barrier overlays in real-time.
        </Text>
        <View style={styles.canvasPlaceholder}>
          <Text style={styles.canvasText}>[ OSM Canvas Layer Placeholder ]</Text>
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  card: { borderColor: '#DBEAFE', borderWidth: 1 },
  badge: { fontSize: 12, fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
  canvasPlaceholder: { height: 220, backgroundColor: '#E2E8F0', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed' },
  canvasText: { color: '#64748B', fontWeight: '600' },
});

export default OSMCanvasScreen;
