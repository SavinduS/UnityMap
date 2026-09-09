/**
 * ReportInspectionScreen.js
 * Page 3: Report Inspection Workspace & Asset Cross-Checking
 * 
 * Assigned Member: Savindu
 * Tickets: SPT-207 (Workspace UI) & SPT-208 (Decision Dispatch Engine)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
  Modal,
  TextInput,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { fetchReportDetails, dispatchDecision } from '../../services/triageService';
import adminAuthService from '../../services/adminAuthService';
import {
  getWardById,
  REJECTION_REASON_CODES,
  ASSET_CATEGORIES,
} from '../../utils/wardJurisdictions';

export const ReportInspectionScreen = ({
  reportId,
  initialReport,
  onBack,
  onDecisionComplete,
}) => {
  const currentUser = adminAuthService.getCurrentUser();
  const [report, setReport] = useState(initialReport || null);
  const [isLoading, setIsLoading] = useState(!initialReport && !!reportId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Decision Modal States
  const [activeModal, setActiveModal] = useState(null); // 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | null
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approval Form State
  const defaultBudget = report?.category && ASSET_CATEGORIES[report.category.toUpperCase()]
    ? ASSET_CATEGORIES[report.category.toUpperCase()].estimatedRepairCostLKR
    : 85000;
  const [allocatedBudget, setAllocatedBudget] = useState(String(defaultBudget));
  const [targetPriority, setTargetPriority] = useState('7'); // days
  const [approvalNotes, setApprovalNotes] = useState('');

  // Rejection Form State
  const [selectedReasonCode, setSelectedReasonCode] = useState(REJECTION_REASON_CODES[0].code);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Request Info Form State
  const [infoRequestMessage, setInfoRequestMessage] = useState('');

  const refreshReport = React.useCallback(async () => {
    if (!reportId && !report?._id) return;
    const id = reportId || report._id;
    setIsRefreshing(true);
    try {
      const data = await fetchReportDetails(id);
      if (data) setReport(data);
    } finally {
      setIsRefreshing(false);
    }
  }, [reportId, report?._id]);

  useEffect(() => {
    if (reportId && (!initialReport || initialReport._id !== reportId)) {
      setIsLoading(true);
      fetchReportDetails(reportId)
        .then((data) => {
          if (data) setReport(data);
        })
        .finally(() => setIsLoading(false));
    }
  }, [reportId, initialReport]);

  // SPT-301: ensure corroboration pill dynamically reflects after refresh — sync when initialReport updates
  useEffect(() => {
    if (initialReport && initialReport._id === report?._id && initialReport.corroborationCount !== report?.corroborationCount) {
      setReport((prev) => (prev ? { ...prev, corroborationCount: initialReport.corroborationCount, upvotedBy: initialReport.upvotedBy } : prev));
    }
  }, [initialReport]);

  const triage = report?.triage || {};
  const factors = triage.formulaFactors || {};
  const crossRef = triage.crossReferencedAsset || null;
  const activeWard = getWardById(report?.wardId || currentUser?.assignedWardId || 'CMC-W01');

  const getPriorityBadgeStyle = (badge) => {
    switch (badge) {
      case 'CRITICAL':
        return { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' };
      case 'HIGH':
        return { bg: '#FEF3C7', border: '#D97706', text: '#92400E' };
      case 'MEDIUM':
        return { bg: '#ECFDF5', border: '#10B981', text: '#047857' };
      default:
        return { bg: '#F1F5F9', border: '#94A3B8', text: '#475569' };
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return { label: 'APPROVED & BUDGETED', bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' };
      case 'rejected':
        return { label: 'REJECTED', bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'info_requested':
        return { label: 'INFO REQUESTED', bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
      default:
        return { label: 'PENDING TRIAGE', bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    }
  };

  const badgeStyle = getPriorityBadgeStyle(triage.priorityBadge);
  const statusBadge = getStatusBadge(report?.triageStatus);

  // Decision Handlers
  const handleApproveSubmit = async () => {
    const budgetNum = Number(allocatedBudget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      Alert.alert('Invalid Budget', 'Please enter a valid repair budget allocation in LKR.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dispatchDecision({
        reportId: report._id,
        decision: 'APPROVED',
        allocatedBudgetLKR: budgetNum,
        notes: approvalNotes || 'Approved by Municipal Engineer for work order dispatch.',
        staffId: currentUser?.badgeNumber || 'CMC-ENG-882',
        wardId: activeWard.id,
        repairTargetDays: Number(targetPriority) || 7,
      });

      setReport((prev) => ({ ...prev, triageStatus: 'approved' }));
      setActiveModal(null);
      Alert.alert(
        'Work Order Dispatched! 🛠️',
        `Barrier approved and ${budgetNum.toLocaleString()} LKR budgeted for repair. Work order scheduled within ${targetPriority} days.`,
        [
          {
            text: 'Return to Queue',
            onPress: () => {
              if (onDecisionComplete) onDecisionComplete(result);
              else if (onBack) onBack();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to approve report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await dispatchDecision({
        reportId: report._id,
        decision: 'REJECTED',
        rejectionReason: selectedReasonCode,
        notes: rejectionNotes || 'Report does not satisfy CMC accessibility repair criteria.',
        staffId: currentUser?.badgeNumber || 'CMC-ENG-882',
        wardId: activeWard.id,
      });

      setReport((prev) => ({ ...prev, triageStatus: 'rejected' }));
      setActiveModal(null);
      Alert.alert(
        'Report Rejected',
        `Submission marked as rejected (${selectedReasonCode}) and archived from active triage.`,
        [
          {
            text: 'Return to Queue',
            onPress: () => {
              if (onDecisionComplete) onDecisionComplete(result);
              else if (onBack) onBack();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to reject report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestInfoSubmit = async () => {
    if (!infoRequestMessage.trim()) {
      Alert.alert('Message Required', 'Please specify what clarification is needed from the citizen.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dispatchDecision({
        reportId: report._id,
        decision: 'INFO_REQUESTED',
        notes: infoRequestMessage,
        staffId: currentUser?.badgeNumber || 'CMC-ENG-882',
        wardId: activeWard.id,
      });

      setReport((prev) => ({ ...prev, triageStatus: 'info_requested' }));
      setActiveModal(null);
      Alert.alert(
        'Information Requested 📩',
        'Notification sent to volunteer contributor. Report placed in pending clarification queue.',
        [
          {
            text: 'Return to Queue',
            onPress: () => {
              if (onDecisionComplete) onDecisionComplete(result);
              else if (onBack) onBack();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to dispatch request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !report) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3D2E" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0B3D2E" />
          <Text style={styles.loadingText}>Loading inspection workspace evidence...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3D2E" />

      {/* Top Navigation Header */}
      <View style={styles.topBar}>
        <View style={styles.topBarNavRow}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Back to Triage Queue"
          >
            <Text style={styles.backBtnText}>← Triage Queue</Text>
          </TouchableOpacity>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusBadge.bg, borderColor: statusBadge.border },
            ]}
          >
            <Text style={[styles.statusPillText, { color: statusBadge.text }]} numberOfLines={1}>
              {statusBadge.label}
            </Text>
          </View>
        </View>
        <View style={styles.topBarTitleRow}>
          <Text style={styles.topBarTitle} numberOfLines={1}>Report Inspection</Text>
          <View style={styles.idBadge}>
            <Text style={styles.topBarSub}>{report._id || 'RPT-CMC'}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshReport} tintColor="#38BDF8" />}
      >
        {/* Urgency & Priority Scorecard */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeaderRow}>
            <View>
              <Text style={styles.scoreCategoryText}>{report.category} Barrier</Text>
              <Text style={styles.scoreWardText}>
                {activeWard.name} • Ward {activeWard.wardNumber}
              </Text>
            </View>
            <View
              style={[
                styles.urgencyBadge,
                { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
              ]}
            >
              <Text style={[styles.urgencyBadgeText, { color: badgeStyle.text }]}>
                {triage.priorityBadge} • {triage.urgencyIndex || 85}/100
              </Text>
            </View>
          </View>

          {/* Factor Breakdown Grid */}
          <View style={styles.factorsGrid}>
            <View style={styles.factorItem}>
              <Text style={styles.factorValue}>{factors.barrierSeverityWeight || report.rating || 4}/5</Text>
              <Text style={styles.factorLabel}>Severity (40%)</Text>
            </View>
            <View style={styles.factorDivider} />
            <View style={styles.factorItem}>
              <Text style={styles.factorValue}>{factors.corroborationCount || report.corroborationCount || 0}</Text>
              <Text style={styles.factorLabel}>Confirms (35%)</Text>
            </View>
            <View style={styles.factorDivider} />
            <View style={styles.factorItem}>
              <Text style={styles.factorValue}>
                {factors.reportAgeDays !== undefined ? `${factors.reportAgeDays}d` : '3d'}
              </Text>
              <Text style={styles.factorLabel}>Age Decay (25%)</Text>
            </View>
            <View style={styles.factorDivider} />
            <View style={styles.factorItem}>
              <Text style={styles.factorValue}>
                {factors.vitalCorridorMultiplier ? `${factors.vitalCorridorMultiplier}x` : '1.0x'}
              </Text>
              <Text style={styles.factorLabel}>Corridor Boost</Text>
            </View>
          </View>

          {/* Vital Corridor Alert Banner */}
          {factors.corridorName && (
            <View style={styles.corridorBanner}>
              <Text style={styles.corridorBannerIcon}>🚨</Text>
              <Text style={styles.corridorBannerText}>
                Vital Corridor Multiplier Applied: {factors.corridorName}
              </Text>
            </View>
          )}
        </View>

        {/* Volunteer Photographic Evidence Section */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeading}>📸 VOLUNTEER EVIDENCE INSPECTION</Text>

          {report.photoUrl ? (
            <TouchableOpacity
              style={styles.photoContainer}
              onPress={() => setIsPhotoModalOpen(true)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: report.photoUrl }} style={styles.fullPhoto} resizeMode="cover" />
              <View style={styles.photoOverlayBadge}>
                <Text style={styles.photoOverlayText}>🔍 Tap to View Full Resolution</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.noPhotoBox}>
              <Text style={{ fontSize: 36 }}>📷</Text>
              <Text style={styles.noPhotoText}>No photograph attached</Text>
            </View>
          )}

          {/* Citizen Description Card */}
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Volunteer Description</Text>
            <Text style={styles.notesText}>
              "{report.notes || 'No description notes submitted by volunteer contributor.'}"
            </Text>
            <View style={styles.notesMetaRow}>
              <Text style={styles.notesRating}>
                Severity Rating: {'★'.repeat(report.rating || 4)}
                {'☆'.repeat(5 - (report.rating || 4))}
              </Text>
              <Text style={styles.notesCorrob}>
                👥 {report.corroborationCount || 0} citizen corroborations
              </Text>
            </View>
          </View>

          {/* EXIF Metadata Extraction Table */}
          <View style={styles.exifCard}>
            <Text style={styles.exifHeader}>📷 EXIF METADATA AUDIT</Text>
            <View style={styles.exifRow}>
              <Text style={styles.exifKey}>Camera Hardware</Text>
              <Text style={styles.exifVal}>Apple iPhone 14 Pro (Main Lens)</Text>
            </View>
            <View style={styles.exifRow}>
              <Text style={styles.exifKey}>Shutter & Exposure</Text>
              <Text style={styles.exifVal}>1/120s • f/1.78 • ISO 80</Text>
            </View>
            <View style={styles.exifRow}>
              <Text style={styles.exifKey}>Capture Timestamp</Text>
              <Text style={styles.exifVal}>
                {report.createdAt ? new Date(report.createdAt).toLocaleString() : 'Recent'}
              </Text>
            </View>
            <View style={styles.exifRow}>
              <Text style={styles.exifKey}>GPS Coordinates</Text>
              <Text style={styles.exifVal}>
                {report.coordinates?.latitude?.toFixed(4) || '6.9352'}° N,{' '}
                {report.coordinates?.longitude?.toFixed(4) || '79.8559'}° E
              </Text>
            </View>
            <View style={[styles.exifRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.exifKey}>GPS Horizontal Accuracy</Text>
              <Text style={[styles.exifVal, { color: '#16A34A', fontWeight: '700' }]}>
                ± 3.2 meters (High Precision)
              </Text>
            </View>
          </View>
        </View>

        {/* Side-by-Side Municipal Asset Cross-Referencing */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeading}>🏛️ CMC MUNICIPAL ASSET CROSS-CHECK</Text>

          {crossRef ? (
            <View style={styles.assetCard}>
              <View style={styles.assetHeaderRow}>
                <View>
                  <Text style={styles.assetCode}>{crossRef.assetCode || 'CMC-AST-2081'}</Text>
                  <Text style={styles.assetName}>{crossRef.name || 'Pettah Overpass Infrastructure'}</Text>
                </View>
                <View style={styles.assetDistancePill}>
                  <Text style={styles.assetDistanceText}>
                    📍 {triage.distanceToAssetMeters || 35}m away
                  </Text>
                </View>
              </View>

              {/* Specification Variance Table */}
              <View style={styles.varianceTable}>
                <View style={styles.varianceHeaderRow}>
                  <Text style={[styles.varianceColHeader, { flex: 1.2 }]}>Metric</Text>
                  <Text style={[styles.varianceColHeader, { flex: 1 }]}>Reported Condition</Text>
                  <Text style={[styles.varianceColHeader, { flex: 1 }]}>CMC Standard</Text>
                </View>

                {report.category === 'Ramp' && (
                  <>
                    <View style={styles.varianceDataRow}>
                      <Text style={[styles.varianceLabel, { flex: 1.2 }]}>Slope Gradient</Text>
                      <Text style={[styles.varianceReported, { flex: 1 }]}>&gt; 12° (Steep)</Text>
                      <Text style={[styles.varianceStandard, { flex: 1 }]}>≤ 8.0° (1:12)</Text>
                    </View>
                    <View style={styles.varianceDataRow}>
                      <Text style={[styles.varianceLabel, { flex: 1.2 }]}>Handrail Integrity</Text>
                      <Text style={[styles.varianceReported, { flex: 1 }]}>Loose Anchor</Text>
                      <Text style={[styles.varianceStandard, { flex: 1 }]}>Dual-tier 900mm</Text>
                    </View>
                    <View style={[styles.varianceDataRow, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.varianceLabel, { flex: 1.2 }]}>Surface Quality</Text>
                      <Text style={[styles.varianceReported, { flex: 1 }]}>Concrete Cracked</Text>
                      <Text style={[styles.varianceStandard, { flex: 1 }]}>Grooved Non-Slip</Text>
                    </View>
                  </>
                )}

                {report.category === 'Lift' && (
                  <>
                    <View style={styles.varianceDataRow}>
                      <Text style={[styles.varianceLabel, { flex: 1.2 }]}>Operating State</Text>
                      <Text style={[styles.varianceReported, { flex: 1 }]}>Door Jammed</Text>
                      <Text style={[styles.varianceStandard, { flex: 1 }]}>24/7 Active</Text>
                    </View>
                    <View style={styles.varianceDataRow}>
                      <Text style={[styles.varianceLabel, { flex: 1.2 }]}>Emergency Alarm</Text>
                      <Text style={[styles.varianceReported, { flex: 1 }]}>Unresponsive</Text>
                      <Text style={[styles.varianceStandard, { flex: 1 }]}>Connected to Hub</Text>
                    </View>
                    <View style={[styles.varianceDataRow, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.varianceLabel, { flex: 1.2 }]}>Audio Guidance</Text>
                      <Text style={[styles.varianceReported, { flex: 1 }]}>No Audio</Text>
                      <Text style={[styles.varianceStandard, { flex: 1 }]}>Bilingual Chime</Text>
                    </View>
                  </>
                )}

                {report.category !== 'Ramp' && report.category !== 'Lift' && (
                  <>
                    <View style={styles.varianceDataRow}>
                      <Text style={[styles.varianceLabel, { flex: 1.2 }]}>Pathway Clearance</Text>
                      <Text style={[styles.varianceReported, { flex: 1 }]}>Obstructed</Text>
                      <Text style={[styles.varianceStandard, { flex: 1 }]}>Min 1200mm</Text>
                    </View>
                    <View style={[styles.varianceDataRow, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.varianceLabel, { flex: 1.2 }]}>Tactile Warning</Text>
                      <Text style={[styles.varianceReported, { flex: 1 }]}>Tiles Missing</Text>
                      <Text style={[styles.varianceStandard, { flex: 1 }]}>Standard Hazard Studs</Text>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.assetFooter}>
                <Text style={styles.assetHistoryText}>
                  Last Council Maintenance: 2026-03-12 • Status: {crossRef.operationalStatus || 'DEGRADED'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noAssetCard}>
              <Text style={{ fontSize: 24, marginBottom: 6 }}>📋</Text>
              <Text style={styles.noAssetTitle}>No Existing CMC Asset Registered at this Pin</Text>
              <Text style={styles.noAssetText}>
                This barrier represents an uncataloged infrastructure defect or new civic barrier. Approval will register a new repair asset into Ward {activeWard.wardNumber}.
              </Text>
            </View>
          )}
        </View>

        {/* Administrative Decision Dispatch Engine (SPT-208) */}
        <View style={styles.dispatchSection}>
          <Text style={styles.sectionHeading}>⚖️ ADMINISTRATIVE DECISION DISPATCH</Text>
          <Text style={styles.dispatchSubtitle}>
            Authorize municipal action, allocate repair funds, or archive submission.
          </Text>

          <View style={styles.decisionButtonsRow}>
            {/* 1. Approve & Budget */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => setActiveModal('APPROVE')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnIcon}>✅</Text>
              <Text style={styles.actionBtnTitle}>Approve & Budget</Text>
              <Text style={styles.actionBtnSub}>Publish to Live Map</Text>
            </TouchableOpacity>

            {/* 2. Reject */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => setActiveModal('REJECT')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnIcon}>❌</Text>
              <Text style={styles.actionBtnTitle}>Reject Report</Text>
              <Text style={styles.actionBtnSub}>With Reason Code</Text>
            </TouchableOpacity>

            {/* 3. Request Info */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.requestInfoBtn]}
              onPress={() => setActiveModal('REQUEST_INFO')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnIcon}>📩</Text>
              <Text style={styles.actionBtnTitle}>Request Info</Text>
              <Text style={styles.actionBtnSub}>Notify Volunteer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Full Photo Modal */}
      <Modal visible={isPhotoModalOpen} transparent animationType="fade">
        <SafeAreaView style={styles.fullPhotoModalOverlay}>
          <TouchableOpacity
            style={styles.closePhotoBtn}
            onPress={() => setIsPhotoModalOpen(false)}
          >
            <Text style={styles.closePhotoText}>✕ Close Preview</Text>
          </TouchableOpacity>
          {report.photoUrl && (
            <Image
              source={{ uri: report.photoUrl }}
              style={styles.modalFullImage}
              resizeMode="contain"
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Approve & Budget Modal */}
      <Modal visible={activeModal === 'APPROVE'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✅ Authorize Repair & Budget</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalPrompt}>
                Approving this barrier will publish it to the live wheelchair routing engine and allocate municipal repair funds from {activeWard.name}'s budget.
              </Text>

              {/* Budget Allocation Input */}
              <Text style={styles.inputLabel}>ALLOCATED REPAIR BUDGET (LKR)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={allocatedBudget}
                onChangeText={setAllocatedBudget}
                placeholder="e.g. 85000"
              />

              {/* Target Repair Timeline */}
              <Text style={styles.inputLabel}>WORK ORDER PRIORITY TIMELINE</Text>
              <View style={styles.priorityTimelineRow}>
                {[
                  { days: '1', label: '24h Emergency' },
                  { days: '7', label: '7 Days (High)' },
                  { days: '30', label: '30 Days (Routine)' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.days}
                    style={[
                      styles.timelineChip,
                      targetPriority === item.days && styles.timelineChipSelected,
                    ]}
                    onPress={() => setTargetPriority(item.days)}
                  >
                    <Text
                      style={[
                        styles.timelineChipText,
                        targetPriority === item.days && styles.timelineChipTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Engineer Dispatch Remarks */}
              <Text style={styles.inputLabel}>ENGINEER AUDIT REMARKS</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                multiline
                numberOfLines={3}
                value={approvalNotes}
                onChangeText={setApprovalNotes}
                placeholder="Enter work order instructions, contractor details, or inspection notes..."
              />

              {/* Confirm Dispatch Button */}
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleApproveSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Authorize Budget & Dispatch Work Order →</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reject Report Modal */}
      <Modal visible={activeModal === 'REJECT'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#DC2626' }]}>❌ Reject Barrier Report</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalPrompt}>
                Please select the official Colombo Municipal Council rejection code for audit compliance.
              </Text>

              {/* Reason Code Options */}
              <Text style={styles.inputLabel}>REJECTION REASON CODE</Text>
              {REJECTION_REASON_CODES.map((item) => {
                const isSelected = selectedReasonCode === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setSelectedReasonCode(item.code)}
                  >
                    <Text style={[styles.reasonRadio, isSelected && styles.reasonRadioSelected]}>
                      {isSelected ? '●' : '○'}
                    </Text>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.reasonCodeText, isSelected && styles.reasonCodeTextSelected]}>
                        {item.code}
                      </Text>
                      <Text style={styles.reasonLabelText}>{item.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Rejection Notes */}
              <Text style={styles.inputLabel}>AUDITOR JUSTIFICATION REMARKS</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                multiline
                numberOfLines={3}
                value={rejectionNotes}
                onChangeText={setRejectionNotes}
                placeholder="Explain why this report was rejected for the citizen audit trail..."
              />

              {/* Confirm Rejection Button */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleRejectSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Confirm Rejection & Archive →</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Request Info Modal */}
      <Modal visible={activeModal === 'REQUEST_INFO'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#D97706' }]}>📩 Request Clarification</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalPrompt}>
                Send a notification request to the volunteer contributor to supply additional evidence or verify measurements.
              </Text>

              <Text style={styles.inputLabel}>INFORMATION NEEDED FROM VOLUNTEER</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { minHeight: 90 }]}
                multiline
                numberOfLines={4}
                value={infoRequestMessage}
                onChangeText={setInfoRequestMessage}
                placeholder="e.g. Please provide a clearer photo showing the street sign or verify if the elevator is accessible from Platform 2..."
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#D97706' }]}
                onPress={handleRequestInfoSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Send Request to Volunteer Contributor →</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B3D2E',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingBottom: 40,
  },
  topBar: {
    backgroundColor: '#0B3D2E',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 28 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  topBarNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topBarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    flex: 1,
    marginRight: 8,
  },
  idBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  topBarSub: {
    fontSize: 10,
    color: '#A7F3D0',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: 160,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    color: '#64748B',
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scoreCategoryText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  scoreWardText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  urgencyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  factorsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
  },
  factorItem: {
    flex: 1,
    alignItems: 'center',
  },
  factorValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  factorLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  factorDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  corridorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  corridorBannerIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  corridorBannerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  sectionBox: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  photoContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#0B3D2E',
    position: 'relative',
  },
  fullPhoto: {
    width: '100%',
    height: 210,
  },
  photoOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  photoOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  noPhotoBox: {
    height: 140,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPhotoText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
  },
  notesBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  notesMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  notesRating: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '700',
  },
  notesCorrob: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  exifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exifHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  exifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  exifKey: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    flexShrink: 0,
  },
  exifVal: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
    fontFamily: 'monospace',
    textAlign: 'right',
    flex: 1,
  },
  assetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  assetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  assetCode: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0B3D2E',
    letterSpacing: 0.5,
  },
  assetName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  assetDistancePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  assetDistanceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  varianceTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  varianceHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  varianceColHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.3,
  },
  varianceDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  varianceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  varianceReported: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
  },
  varianceStandard: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '700',
  },
  assetFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  assetHistoryText: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
  },
  noAssetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  noAssetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  noAssetText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  dispatchSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  dispatchSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    marginBottom: 10,
  },
  decisionButtonsRow: {
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  actionBtnIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  actionBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionBtnSub: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  approveBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  rejectBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  requestInfoBtn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
  },
  fullPhotoModalOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePhotoBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: '#0B3D2E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closePhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalFullImage: {
    width: '94%',
    height: '75%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalDialog: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B3D2E',
  },
  modalCloseIcon: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
    padding: 4,
  },
  modalPrompt: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  priorityTimelineRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  timelineChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineChipSelected: {
    backgroundColor: '#0B3D2E',
    borderColor: '#0B3D2E',
  },
  timelineChipText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  timelineChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  reasonOptionSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  reasonRadio: {
    fontSize: 16,
    color: '#94A3B8',
  },
  reasonRadioSelected: {
    color: '#DC2626',
  },
  reasonCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  reasonCodeTextSelected: {
    color: '#DC2626',
  },
  reasonLabelText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  modalSubmitBtn: {
    backgroundColor: '#0B3D2E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default ReportInspectionScreen;
