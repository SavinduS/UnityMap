import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';

/**
 * Dulmi Stream: 3-Tap Rapid Barrier Reporting Screen
 */
export const ThreeTapReportScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.badge}>Developer: Dulmi</Text>
        <Text style={styles.title}>⚡ 3-Tap Rapid Reporting</Text>
        <Text style={styles.description}>
          Streamlined 3-click barrier reporting interface enabling crowd-sourced volunteers to tag urban accessibility obstacles in under 5 seconds.
        </Text>
        <View style={styles.grid}>
          <Button style={styles.gridBtn} title="1. Select Barrier" onPress={() => {}} />
          <Button style={styles.gridBtn} title="2. Snap Photo" onPress={() => {}} />
          <Button style={styles.gridBtn} title="3. Submit Report" onPress={() => {}} />
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  card: { borderColor: '#BBF7D0', borderWidth: 1 },
  badge: { fontSize: 12, fontWeight: '700', color: '#16A34A', textTransform: 'uppercase', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 14 },
  grid: { marginTop: 8 },
  gridBtn: { marginVertical: 4, backgroundColor: '#16A34A' },
});

export default ThreeTapReportScreen;
