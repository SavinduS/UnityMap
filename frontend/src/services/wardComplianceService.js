/**
 * wardComplianceService.js
 * Frontend Service & API Client for Ward Accessibility Compliance & Budget Analytics
 * 
 * Assigned Member: Savindu
 * Ticket: SPT-209
 */

import { apiRequest } from './api';
import { MUNICIPAL_WARDS } from '../utils/wardJurisdictions';

const MOCK_WARD_COMPLIANCE = {
  'CMC-W01': {
    wardCode: 'CMC-W01',
    name: 'Fort & Pettah Commercial Hub',
    wardNumber: 1,
    priorityTier: 'CRITICAL',
    complianceScorePercent: 72,
    allocatedBudgetLKR: 1850000,
    spentBudgetLKR: 1240000,
    availableBudgetLKR: 610000,
    activeBarrierCount: 14,
    resolvedBarrierCount: 38,
    meanTimeToRepairDays: 4.2,
    assignedInspector: 'Eng. K. Perera (CMC-882)',
    categoryBreakdown: [
      { category: 'Ramp', compliancePercent: 84, activeCount: 4, resolvedCount: 12 },
      { category: 'Lift', compliancePercent: 62, activeCount: 3, resolvedCount: 5 },
      { category: 'Tactile Paving', compliancePercent: 70, activeCount: 5, resolvedCount: 11 },
      { category: 'Restroom', compliancePercent: 78, activeCount: 2, resolvedCount: 6 },
      { category: 'Sidewalk Dropped Curbs', compliancePercent: 91, activeCount: 0, resolvedCount: 4 },
    ],
    activeWorkOrders: [
      {
        orderId: 'WO-2026-081',
        reportId: 'RPT-CMC-1001',
        title: 'Pettah Overpass Lift Tower A Hydraulic Repair',
        category: 'Lift',
        contractor: 'CMC Mechanical Division Unit 2',
        allocatedLKR: 85000,
        status: 'IN_PROGRESS',
        targetDate: '2026-09-12',
      },
      {
        orderId: 'WO-2026-082',
        reportId: 'RPT-CMC-1002',
        title: 'Fort Railway Station North Ramp Resurfacing',
        category: 'Ramp',
        contractor: 'Apex Civil Contractors Ltd.',
        allocatedLKR: 65000,
        status: 'SCHEDULED',
        targetDate: '2026-09-15',
      },
      {
        orderId: 'WO-2026-079',
        reportId: 'RPT-CMC-1004',
        title: 'Pettah Bus Stand Restroom Lock & Rail Replacement',
        category: 'Restroom',
        contractor: 'Municipal Maintenance Crew Ward 1',
        allocatedLKR: 35000,
        status: 'PENDING_INSPECTION',
        targetDate: '2026-09-09',
      },
    ],
    monthlyTrends: [
      { month: 'May', resolved: 12, reported: 16 },
      { month: 'Jun', resolved: 18, reported: 20 },
      { month: 'Jul', resolved: 25, reported: 22 },
      { month: 'Aug', resolved: 31, reported: 19 },
      { month: 'Sep', resolved: 14, reported: 8 },
    ],
  },
  'CMC-W02': {
    wardCode: 'CMC-W02',
    name: 'Slave Island / Kompannavidiya',
    wardNumber: 2,
    priorityTier: 'HIGH',
    complianceScorePercent: 81,
    allocatedBudgetLKR: 1200000,
    spentBudgetLKR: 760000,
    availableBudgetLKR: 440000,
    activeBarrierCount: 8,
    resolvedBarrierCount: 26,
    meanTimeToRepairDays: 3.8,
    assignedInspector: 'Insp. M. Fernando (CMC-412)',
    categoryBreakdown: [
      { category: 'Ramp', compliancePercent: 88, activeCount: 2, resolvedCount: 9 },
      { category: 'Lift', compliancePercent: 75, activeCount: 1, resolvedCount: 3 },
      { category: 'Tactile Paving', compliancePercent: 80, activeCount: 3, resolvedCount: 8 },
      { category: 'Restroom', compliancePercent: 85, activeCount: 2, resolvedCount: 6 },
    ],
    activeWorkOrders: [
      {
        orderId: 'WO-2026-074',
        reportId: 'RPT-CMC-2011',
        title: 'Vauxhall Street Dropped Curb Realignment',
        category: 'Ramp',
        contractor: 'City Works Subcontractors',
        allocatedLKR: 45000,
        status: 'IN_PROGRESS',
        targetDate: '2026-09-14',
      },
    ],
    monthlyTrends: [
      { month: 'May', resolved: 8, reported: 11 },
      { month: 'Jun', resolved: 14, reported: 12 },
      { month: 'Jul', resolved: 19, reported: 15 },
      { month: 'Aug', resolved: 22, reported: 14 },
      { month: 'Sep', resolved: 8, reported: 5 },
    ],
  },
  'CMC-W03': {
    wardCode: 'CMC-W03',
    name: 'Kollupitiya Coastal Corridor',
    wardNumber: 3,
    priorityTier: 'MEDIUM',
    complianceScorePercent: 89,
    allocatedBudgetLKR: 1500000,
    spentBudgetLKR: 890000,
    availableBudgetLKR: 610000,
    activeBarrierCount: 5,
    resolvedBarrierCount: 32,
    meanTimeToRepairDays: 3.1,
    assignedInspector: 'Eng. T. Jayawardena (CMC-605)',
    categoryBreakdown: [
      { category: 'Ramp', compliancePercent: 92, activeCount: 1, resolvedCount: 14 },
      { category: 'Lift', compliancePercent: 86, activeCount: 1, resolvedCount: 4 },
      { category: 'Tactile Paving', compliancePercent: 88, activeCount: 2, resolvedCount: 10 },
      { category: 'Restroom', compliancePercent: 90, activeCount: 1, resolvedCount: 4 },
    ],
    activeWorkOrders: [],
    monthlyTrends: [
      { month: 'May', resolved: 10, reported: 9 },
      { month: 'Jun', resolved: 16, reported: 11 },
      { month: 'Jul', resolved: 21, reported: 12 },
      { month: 'Aug', resolved: 28, reported: 10 },
      { month: 'Sep', resolved: 5, reported: 3 },
    ],
  },
  'CMC-W04': {
    wardCode: 'CMC-W04',
    name: 'Bambalapitiya High Street',
    wardNumber: 4,
    priorityTier: 'HIGH',
    complianceScorePercent: 76,
    allocatedBudgetLKR: 1400000,
    spentBudgetLKR: 1020000,
    availableBudgetLKR: 380000,
    activeBarrierCount: 11,
    resolvedBarrierCount: 29,
    meanTimeToRepairDays: 4.5,
    assignedInspector: 'Insp. S. De Silva (CMC-329)',
    categoryBreakdown: [
      { category: 'Ramp', compliancePercent: 80, activeCount: 3, resolvedCount: 10 },
      { category: 'Lift', compliancePercent: 70, activeCount: 2, resolvedCount: 4 },
      { category: 'Tactile Paving', compliancePercent: 74, activeCount: 4, resolvedCount: 9 },
      { category: 'Restroom', compliancePercent: 82, activeCount: 2, resolvedCount: 6 },
    ],
    activeWorkOrders: [],
    monthlyTrends: [
      { month: 'May', resolved: 9, reported: 14 },
      { month: 'Jun', resolved: 15, reported: 18 },
      { month: 'Jul', resolved: 18, reported: 16 },
      { month: 'Aug', resolved: 24, reported: 17 },
      { month: 'Sep', resolved: 11, reported: 6 },
    ],
  },
  'CMC-W05': {
    wardCode: 'CMC-W05',
    name: 'Cinnamon Gardens Civic Ward',
    wardNumber: 5,
    priorityTier: 'LOW',
    complianceScorePercent: 94,
    allocatedBudgetLKR: 1100000,
    spentBudgetLKR: 410000,
    availableBudgetLKR: 690000,
    activeBarrierCount: 3,
    resolvedBarrierCount: 41,
    meanTimeToRepairDays: 2.3,
    assignedInspector: 'Eng. K. Perera (CMC-882)',
    categoryBreakdown: [
      { category: 'Ramp', compliancePercent: 96, activeCount: 1, resolvedCount: 15 },
      { category: 'Lift', compliancePercent: 92, activeCount: 0, resolvedCount: 6 },
      { category: 'Tactile Paving', compliancePercent: 95, activeCount: 1, resolvedCount: 12 },
      { category: 'Restroom', compliancePercent: 93, activeCount: 1, resolvedCount: 8 },
    ],
    activeWorkOrders: [],
    monthlyTrends: [
      { month: 'May', resolved: 14, reported: 8 },
      { month: 'Jun', resolved: 22, reported: 9 },
      { month: 'Jul', resolved: 29, reported: 10 },
      { month: 'Aug', resolved: 36, reported: 7 },
      { month: 'Sep', resolved: 3, reported: 2 },
    ],
  },
  'CMC-W06': {
    wardCode: 'CMC-W06',
    name: 'Borella Hospital & Health Belt',
    wardNumber: 6,
    priorityTier: 'CRITICAL',
    complianceScorePercent: 68,
    allocatedBudgetLKR: 2200000,
    spentBudgetLKR: 1750000,
    availableBudgetLKR: 450000,
    activeBarrierCount: 16,
    resolvedBarrierCount: 44,
    meanTimeToRepairDays: 4.8,
    assignedInspector: 'Insp. R. Wickramasinghe (CMC-771)',
    categoryBreakdown: [
      { category: 'Ramp', compliancePercent: 78, activeCount: 5, resolvedCount: 15 },
      { category: 'Lift', compliancePercent: 58, activeCount: 4, resolvedCount: 7 },
      { category: 'Tactile Paving', compliancePercent: 65, activeCount: 5, resolvedCount: 14 },
      { category: 'Restroom', compliancePercent: 72, activeCount: 2, resolvedCount: 8 },
    ],
    activeWorkOrders: [],
    monthlyTrends: [
      { month: 'May', resolved: 15, reported: 22 },
      { month: 'Jun', resolved: 21, reported: 25 },
      { month: 'Jul', resolved: 28, reported: 27 },
      { month: 'Aug', resolved: 35, reported: 23 },
      { month: 'Sep', resolved: 16, reported: 9 },
    ],
  },
};

/**
 * Fetch ward compliance KPIs and budget analytics
 */
export const fetchWardCompliance = async (wardId = 'CMC-W01') => {
  try {
    const response = await apiRequest(`/admin/compliance/ward/${encodeURIComponent(wardId)}`);
    if (response?.success && response.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[wardComplianceService] Backend unreachable; using offline compliance simulation.');
  }

  return MOCK_WARD_COMPLIANCE[wardId] || MOCK_WARD_COMPLIANCE['CMC-W01'];
};

/**
 * Export municipal audit compliance report summary
 */
export const exportAuditReport = async (wardId = 'CMC-W01') => {
  try {
    const response = await apiRequest(`/admin/compliance/audit/${encodeURIComponent(wardId)}`);
    if (response?.success && response.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('[wardComplianceService] Audit API unreachable; using offline audit report.');
  }

  const ward = MOCK_WARD_COMPLIANCE[wardId] || MOCK_WARD_COMPLIANCE['CMC-W01'];
  return {
    reportReference: `CMC-AUDIT-${wardId}-${Date.now().toString().slice(-6)}`,
    issuingAuthority: 'Colombo Municipal Council — Infrastructure Compliance Division',
    wardCode: ward.wardCode,
    wardName: ward.name,
    complianceScorePercent: ward.complianceScorePercent,
    allocatedBudgetLKR: ward.allocatedBudgetLKR,
    spentBudgetLKR: ward.spentBudgetLKR,
    activeBarriers: ward.activeBarrierCount,
    resolvedBarriers: ward.resolvedBarrierCount,
    auditStatus: ward.complianceScorePercent >= 75 ? 'COMPLIANT' : 'UNDER_SURVEILLANCE',
    timestamp: new Date().toISOString(),
  };
};

export default {
  fetchWardCompliance,
  exportAuditReport,
};
