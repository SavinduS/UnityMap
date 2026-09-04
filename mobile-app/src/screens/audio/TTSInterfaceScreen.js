import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';

/**
 * Text-to-Speech Interface Screen
 */
export const TTSInterfaceScreen = () => {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>🔊 TTS & Audio Feedback</Text>
        <Text style={styles.description}>
          Customizable text-to-speech settings, audio ducking, pitch adjustment, and screen-reader accessibility shortcuts.
        </Text>
        <Button title="Test Voice Output" variant="secondary" onPress={() => {}} />
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  card: { borderColor: '#FBCFE8', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
});

export default TTSInterfaceScreen;
