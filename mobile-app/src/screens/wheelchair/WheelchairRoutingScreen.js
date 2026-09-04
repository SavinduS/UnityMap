import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';

/**
 * Barrier Avoidance Routing Screen
 */
export const WheelchairRoutingScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.title}>♿ Barrier Avoidance Routing</Text>
        <Text style={styles.description}>
          Calculates accessible navigation paths for wheelchair users by actively avoiding steep inclines, stairs, high curbs, and sidewalk obstructions.
        </Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>• Route Profile: Power Wheelchair / Manual Wheelchair</Text>
          <Text style={styles.infoText}>• Avoidances: Staircases, Unpaved Trails, High Steps</Text>
          <Text style={styles.infoText}>• Max Incline Threshold: 8.3% (ADA Compliant)</Text>
        </View>
        <Button title="Calculate Accessible Route" onPress={() => {}} />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  card: { borderColor: '#DBEAFE', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
  infoBox: { backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, marginBottom: 16 },
  infoText: { fontSize: 13, color: '#1E40AF', marginBottom: 4 },
});

export default WheelchairRoutingScreen;
