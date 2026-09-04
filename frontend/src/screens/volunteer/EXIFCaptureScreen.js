import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';

/**
 * EXIF Capture & Geotagging Screen
 */
export const EXIFCaptureScreen = () => {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>📷 EXIF Metadata Capture</Text>
        <Text style={styles.description}>
          Extracts embedded GPS coordinates, camera orientation, and timestamp from photo EXIF metadata for verification.
        </Text>
        <Button title="Capture Geotagged Image" onPress={() => {}} />
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  card: { borderColor: '#BBF7D0', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
});

export default EXIFCaptureScreen;
