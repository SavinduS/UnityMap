import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';

/**
 * Voice-Guided Navigation Screen
 */
export const VoiceNavigationScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.title}>🎙️ Voice-Guided Navigation</Text>
        <Text style={styles.description}>
          Hands-free turn-by-turn navigation tailored for visually impaired users with step counts, landmark cues, and spatial audio feedback.
        </Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>• Voice Command State: Listening...</Text>
          <Text style={styles.infoText}>• Speech Rate: 1.0x (Adjustable)</Text>
          <Text style={styles.infoText}>• Haptic Vibrations: Enabled on Turns</Text>
        </View>
        <Button title="Start Voice Navigation" onPress={() => {}} />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  card: { borderColor: '#FBCFE8', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
  infoBox: { backgroundColor: '#FDF2F8', padding: 12, borderRadius: 8, marginBottom: 16 },
  infoText: { fontSize: 13, color: '#BE185D', marginBottom: 4 },
});

export default VoiceNavigationScreen;
