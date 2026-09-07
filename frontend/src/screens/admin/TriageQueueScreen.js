/**
 * TriageQueueScreen.js
 * Page 2: Severity-Sorted Triage Queue Dashboard
 * 
 * Assigned Member: Savindu
 * Ticket: SPT-112
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { fetchTriageQueue, fetchTriageMetrics } from '../../services/triageService';
import adminAuthService from '../../services/adminAuthService';
import { getWardById, MUNICIPAL_WARDS } from '../../utils/wardJurisdictions';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'Lift', label: '🛗 Lift' },
  { id: 'Ramp', label: '♿ Ramp' },
  { id: 'Tactile Paving', label: '🦯 Tactile Paving' },
  { id: 'Restroom', label: '🚻 Restroom' },
];

const SORT_OPTIONS = [
  { id: 'urgency', label: '⚡ Urgency Index' },
  { id: 'corroboration', label: '👥 Corroborations' },
  { id: 'date', label: '📅 Newest First' },
];

export const TriageQueueScreen = ({ onBack, onSelectReport }) => {
  const currentUser = adminAuthService.getCurrentUser();
  const [selectedWardId, setSelectedWardId] = useState(currentUser?.assignedWardId || 'CMC-W01');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('urgency');
  const [minUrgency, setMinUrgency] = useState(0);

  const [reports, setReports] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const activeWard = getWardById(selectedWardId);

  const loadTriageData = useCallback(async () => {
    try {
      const [queueData, metricsData] = await Promise.all([
        fetchTriageQueue({
          wardId: selectedWardId,
          category: selectedCategory,
          status: 'pending',
          minUrgency,
          sortBy: selectedSort,
        }),
        fetchTriageMetrics(selectedWardId),
      ]);

      if (queueData?.reports) {
        setReports(queueData.reports);
      }
      if (metricsData) {
        setMetrics(metricsData);
      }
    } catch (error) {
      console.warn('[TriageQueueScreen] Error loading queue:', error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsRecalculating(false);
    }
  }, [selectedWardId, selectedCategory, selectedSort, minUrgency]);

  useEffect(() => {
    setIsLoading(true);
    loadTriageData();
  }, [loadTriageData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadTriageData();
  };

  const handleRecalculate = () => {
    setIsRecalculating(true);
    loadTriageData();
  };

  const getPriorityBadgeStyle = (badge) => {
    switch (badge) {
      case 'CRITICAL':
        return { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' };
      case 'HIGH':
        return { bg: '#FEF3C7', border: '#D97706', text: '#92400E' };
      case 'MEDIUM':
        return { bg: '#DBEAFE', border: '#2563EB', text: '#1E40AF' };
      default:
        return { bg: '#F1F5F9', border: '#94A3B8', text: '#475569' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>← Dashboard</Text>
          </TouchableOpacity>
        )}
        <View style={styles.topBarTitleContainer}>
          <Text style={styles.topBarTitle}>Severity Triage Queue</Text>
          <Text style={styles.topBarSubtitle}>
            {activeWard.name} • Ward {activeWard.wardNumber}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.recalculateBtn}
          onPress={handleRecalculate}
          disabled={isRecalculating}
          activeOpacity={0.7}
        >
          {isRecalculating ? (
            <ActivityIndicator size="small" color="#38BDF8" />
          ) : (
            <Text style={styles.recalculateText}>↻ Recalc</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Urgency Metrics KPI Row */}
        {metrics && (
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { borderColor: '#DC2626' }]}>
              <Text style={[styles.kpiCount, { color: '#DC2626' }]}>
                {metrics.criticalPriorityCount}
              </Text>
              <Text style={styles.kpiLabel}>CRITICAL</Text>
              <Text style={styles.kpiSub}>Score ≥ 80</Text>
            </View>

            <View style={[styles.kpiCard, { borderColor: '#D97706' }]}>
              <Text style={[styles.kpiCount, { color: '#D97706' }]}>
                {metrics.highPriorityCount}
              </Text>
              <Text style={styles.kpiLabel}>HIGH</Text>
              <Text style={styles.kpiSub}>Score 60-79</Text>
            </View>

            <View style={[styles.kpiCard, { borderColor: '#2563EB' }]}>
              <Text style={[styles.kpiCount, { color: '#2563EB' }]}>
                {metrics.mediumPriorityCount}
              </Text>
              <Text style={styles.kpiLabel}>MEDIUM</Text>
              <Text style={styles.kpiSub}>Score 40-59</Text>
            </View>

            <View style={[styles.kpiCard, { borderColor: '#38BDF8' }]}>
              <Text style={[styles.kpiCount, { color: '#0F172A' }]}>
                {metrics.averageUrgencyIndex}
              </Text>
              <Text style={styles.kpiLabel}>AVG INDEX</Text>
              <Text style={styles.kpiSub}>0 - 100 Scale</Text>
            </View>
          </View>
        )}

        {/* Category Filters Bar */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionHeader}>FILTER BY CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Sort & Urgency Threshold Controls */}
        <View style={styles.sortSection}>
          <View style={styles.sortHeaderRow}>
            <Text style={styles.filterSectionHeader}>AUTO-TRIAGE SORT CRITERIA</Text>
            <Text style={styles.resultCountBadge}>{reports.length} pending</Text>
          </View>
          <View style={styles.sortTabsRow}>
            {SORT_OPTIONS.map((opt) => {
              const isSelected = selectedSort === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.sortTab, isSelected && styles.sortTabSelected]}
                  onPress={() => setSelectedSort(opt.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sortTabText, isSelected && styles.sortTabTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Report Queue List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Running Severity Triage Engine...</Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>Queue Clear!</Text>
            <Text style={styles.emptyText}>
              No pending accessibility barriers match the selected category or urgency filter.
            </Text>
          </View>
        ) : (
          <View style={styles.reportsList}>
            {reports.map((report, idx) => {
              const triage = report.triage || {};
              const badgeStyle = getPriorityBadgeStyle(triage.priorityBadge);
              const factors = triage.formulaFactors || {};

              return (
                <View key={report._id || idx} style={styles.reportCard}>
                  {/* Card Header with Urgency Index Badge */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardCategoryBadge}>
                      <Text style={styles.cardCategoryText}>{report.category}</Text>
                    </View>

                    <View
                      style={[
                        styles.urgencyBadge,
                        { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
                      ]}
                    >
                      <Text style={[styles.urgencyBadgeText, { color: badgeStyle.text }]}>
                        {triage.priorityBadge} • {triage.urgencyIndex}/100
                      </Text>
                    </View>
                  </View>

                  {/* Barrier Notes & Photo Preview */}
                  <View style={styles.cardBody}>
                    {report.photoUrl ? (
                      <Image
                        source={{ uri: report.photoUrl }}
                        style={styles.cardThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.cardThumbnailPlaceholder}>
                        <Text style={{ fontSize: 24 }}>📸</Text>
                      </View>
                    )}

                    <View style={styles.cardMainInfo}>
                      <Text style={styles.cardNotes} numberOfLines={3}>
                        {report.notes || 'No description provided.'}
                      </Text>

                      <View style={styles.cardMetaRow}>
                        <Text style={styles.cardRating}>
                          {'★'.repeat(report.rating || 3)}
                          {'☆'.repeat(5 - (report.rating || 3))}
                        </Text>
                        <View style={styles.corroborationPill}>
                          <Text style={styles.corroborationText}>
                            👥 {report.corroborationCount || 0} confirmations
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Vital Corridor Alert Banner */}
                  {factors.corridorName && (
                    <View style={styles.corridorTag}>
                      <Text style={styles.corridorIcon}>🚨</Text>
                      <Text style={styles.corridorText}>
                        Vital Corridor Multiplier applied ({factors.vitalCorridorMultiplier}x) —{' '}
                        {factors.corridorName}
                      </Text>
                    </View>
                  )}

                  {/* Municipal Asset Match Indicator */}
                  {triage.crossReferencedAsset && (
                    <View style={styles.assetMatchBox}>
                      <Text style={styles.assetMatchIcon}>📍</Text>
                      <Text style={styles.assetMatchText} numberOfLines={1}>
                        Matched Asset: {triage.crossReferencedAsset.name} (
                        {triage.distanceToAssetMeters}m away)
                      </Text>
                    </View>
                  )}

                  {/* Card Action Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>
                      Submitted {factors.reportAgeDays ? `${factors.reportAgeDays}d ago` : 'recently'}
                    </Text>
                    <TouchableOpacity
                      style={styles.inspectButton}
                      onPress={() => onSelectReport && onSelectReport(report)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.inspectButtonText}>Inspect Evidence →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  topBarTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  topBarSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  recalculateBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  recalculateText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  kpiCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  kpiSub: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 1,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  filterSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chipScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sortSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sortHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sortTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  sortTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  sortTabSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sortTabText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  sortTabTextSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  reportsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardCategoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  urgencyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardBody: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  cardThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 12,
  },
  cardThumbnailPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardMainInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardNotes: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  cardRating: {
    fontSize: 13,
    color: '#F59E0B',
    letterSpacing: 1,
  },
  corroborationPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  corroborationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  corridorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  corridorIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  corridorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  assetMatchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  assetMatchIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  assetMatchText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  cardDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  inspectButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inspectButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
});

export default TriageQueueScreen;
